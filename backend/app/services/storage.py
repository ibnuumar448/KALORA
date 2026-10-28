import os
import re
import shutil
import uuid
from pathlib import Path, PurePosixPath
from typing import Iterator, Protocol

from fastapi import HTTPException, UploadFile

UPLOAD_DIR = Path(__file__).resolve().parents[1] / "uploads"
STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "local").strip().lower()
STORAGE_BUCKET = os.getenv("STORAGE_BUCKET")
STORAGE_ENDPOINT_URL = os.getenv("STORAGE_ENDPOINT_URL")
STORAGE_REGION = os.getenv("STORAGE_REGION", "us-east-1")
STORAGE_ACCESS_KEY = os.getenv("STORAGE_ACCESS_KEY")
STORAGE_SECRET_KEY = os.getenv("STORAGE_SECRET_KEY")

if STORAGE_BACKEND not in {"local", "s3"}:
    raise RuntimeError("STORAGE_BACKEND must be either 'local' or 's3'.")
# Local storage on Render is temporary/testing-only because its filesystem
# is ephemeral.

_s3_client = None
if STORAGE_BACKEND == "s3":
    missing_settings = [
        name
        for name, value in (
            ("STORAGE_BUCKET", STORAGE_BUCKET),
            ("STORAGE_ACCESS_KEY", STORAGE_ACCESS_KEY),
            ("STORAGE_SECRET_KEY", STORAGE_SECRET_KEY),
        )
        if not value
    ]
    if missing_settings:
        raise RuntimeError(
            "S3 storage requires the following environment variables: "
            + ", ".join(missing_settings)
        )
    try:
        import boto3
    except ImportError as exc:
        raise RuntimeError(
            "S3 storage requires boto3. Install the backend dependencies."
        ) from exc

    _s3_client = boto3.client(
        "s3",
        endpoint_url=STORAGE_ENDPOINT_URL or None,
        region_name=STORAGE_REGION,
        aws_access_key_id=STORAGE_ACCESS_KEY,
        aws_secret_access_key=STORAGE_SECRET_KEY,
    )


class StorageFileNotFoundError(FileNotFoundError):
    pass


class StorageFile(Protocol):
    def read(self, size: int = -1) -> bytes: ...

    def close(self) -> None: ...


class StorageService:
    @staticmethod
    def _validate_key(file_key: str) -> str:
        if not isinstance(file_key, str) or not file_key or "\\" in file_key:
            raise ValueError("Invalid storage file key")

        path = PurePosixPath(file_key)
        if (
            path.is_absolute()
            or not path.parts
            or path.as_posix() != file_key
            or any(
                part in {"", ".", ".."}
                or not re.fullmatch(r"[A-Za-z0-9._-]+", part)
                for part in path.parts
            )
        ):
            raise ValueError("Invalid storage file key")

        return path.as_posix()

    @staticmethod
    def _get_local_path(file_key: str) -> Path:
        key = StorageService._validate_key(file_key)
        upload_root = UPLOAD_DIR.resolve()
        file_path = (upload_root / Path(*PurePosixPath(key).parts)).resolve()
        if not file_path.is_relative_to(upload_root):
            raise ValueError("File key points outside the upload directory")
        return file_path

    @staticmethod
    async def validate_upload(
        file: UploadFile,
        allowed_mime_types: set[str],
        max_size_bytes: int,
    ) -> int:
        file.file.seek(0, os.SEEK_END)
        file_size = file.file.tell()
        file.file.seek(0)
        if file_size > max_size_bytes:
            max_size_mb = max_size_bytes // (1024 * 1024)
            raise HTTPException(
                status_code=400,
                detail=f"File too large (max {max_size_mb}MB)",
            )

        content_type = file.content_type or ""
        if content_type not in allowed_mime_types:
            raise HTTPException(status_code=400, detail="Invalid file type")

        filename = os.path.basename((file.filename or "").replace("\\", "/"))
        extension = Path(filename).suffix.lower()
        valid_extensions = {
            "image/jpeg": {".jpg", ".jpeg"},
            "image/png": {".png"},
            "image/webp": {".webp"},
            "application/pdf": {".pdf"},
        }
        if extension not in valid_extensions.get(content_type, set()):
            raise HTTPException(
                status_code=400,
                detail="File extension does not match the file type",
            )

        signature = await file.read(12)
        await file.seek(0)
        signature_is_valid = {
            "image/jpeg": signature.startswith(b"\xff\xd8\xff"),
            "image/png": signature.startswith(b"\x89PNG\r\n\x1a\n"),
            "image/webp": (
                len(signature) >= 12
                and signature[:4] == b"RIFF"
                and signature[8:12] == b"WEBP"
            ),
            "application/pdf": signature.startswith(b"%PDF-"),
        }.get(content_type, False)
        if not signature_is_valid:
            raise HTTPException(
                status_code=400,
                detail="File content does not match the file type",
            )

        return file_size

    @staticmethod
    async def save_file(file: UploadFile, directory: str = "") -> str:
        """
        Saves a file and returns its relative key, independent of the backend.
        """
        safe_directory = ""
        if directory:
            safe_directory = StorageService._validate_key(directory)

        filename = os.path.basename((file.filename or "").replace("\\", "/"))
        extension = Path(filename).suffix.lower()
        if extension and not re.fullmatch(r"\.[a-z0-9]{1,10}", extension):
            raise ValueError("Invalid file extension")
        unique_filename = f"{uuid.uuid4()}{extension}"
        file_key = "/".join(
            part for part in (safe_directory, unique_filename) if part
        )
        file_key = StorageService._validate_key(file_key)

        if STORAGE_BACKEND == "s3":
            assert _s3_client is not None
            _s3_client.upload_fileobj(
                file.file,
                STORAGE_BUCKET,
                file_key,
                ExtraArgs={"ContentType": file.content_type or "application/octet-stream"},
            )
        else:
            file_path = StorageService._get_local_path(file_key)
            file_path.parent.mkdir(parents=True, exist_ok=True)
            with file_path.open("wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

        return file_key

    @staticmethod
    def open_file(file_key: str) -> StorageFile:
        key = StorageService._validate_key(file_key)
        if STORAGE_BACKEND == "s3":
            assert _s3_client is not None
            from botocore.exceptions import ClientError

            try:
                return _s3_client.get_object(Bucket=STORAGE_BUCKET, Key=key)["Body"]
            except ClientError as exc:
                error = exc.response.get("Error", {})
                if error.get("Code") in {"NoSuchKey", "NotFound", "404"}:
                    raise StorageFileNotFoundError(key) from exc
                raise

        try:
            return StorageService._get_local_path(key).open("rb")
        except FileNotFoundError as exc:
            raise StorageFileNotFoundError(key) from exc

    @staticmethod
    def delete_file(file_key: str) -> None:
        key = StorageService._validate_key(file_key)
        if STORAGE_BACKEND == "s3":
            assert _s3_client is not None
            _s3_client.delete_object(Bucket=STORAGE_BUCKET, Key=key)
            return

        file_path = StorageService._get_local_path(key)
        if file_path.is_file():
            file_path.unlink()


def stream_storage_file(file: StorageFile) -> Iterator[bytes]:
    try:
        while chunk := file.read(64 * 1024):
            yield chunk
    finally:
        file.close()
