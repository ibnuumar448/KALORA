import os
import shutil
import uuid
from typing import IO
from fastapi import UploadFile

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

class StorageService:
    @staticmethod
    async def save_file(file: UploadFile, directory: str = "") -> str:
        """
        Saves a file locally and returns the relative path/key.
        """
        target_dir = os.path.join(UPLOAD_DIR, directory)
        if not os.path.exists(target_dir):
            os.makedirs(target_dir)

        extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{extension}"
        file_path = os.path.join(target_dir, unique_filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Return a relative path/key that can be used to retrieve the file
        return os.path.join(directory, unique_filename).replace("\\", "/")

    @staticmethod
    def get_file_path(file_key: str) -> str:
        """
        Returns the absolute path to a file given its key.
        """
        upload_root = os.path.abspath(UPLOAD_DIR)
        file_path = os.path.abspath(os.path.join(upload_root, file_key))
        if os.path.commonpath([upload_root, file_path]) != upload_root:
            raise ValueError("File key points outside the upload directory")
        return file_path

    @staticmethod
    def delete_file(file_key: str) -> None:
        file_path = StorageService.get_file_path(file_key)
        if os.path.isfile(file_path):
            os.remove(file_path)
