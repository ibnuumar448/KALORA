import logging
import os
from email.message import EmailMessage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from html import escape
from urllib.parse import urlencode, urlsplit

import resend

logger = logging.getLogger(__name__)


class EmailDeliveryError(Exception):
    pass


class EmailService:
    def __init__(self):
        self.resend_api_key = os.getenv("RESEND_API_KEY", "").strip()
        self.frontend_url = os.getenv("FRONTEND_URL", "").rstrip("/")

    def _get_frontend_url(self) -> str:
        try:
            parsed = urlsplit(self.frontend_url)
            parsed.port
        except ValueError as exc:
            raise EmailDeliveryError(
                "FRONTEND_URL must be a valid absolute HTTP(S) URL"
            ) from exc
        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.netloc
            or parsed.username
            or parsed.password
            or parsed.query
            or parsed.fragment
        ):
            raise EmailDeliveryError(
                "FRONTEND_URL must be a valid absolute HTTP(S) URL"
            )
        if (
            os.getenv("RENDER", "").lower() == "true"
            and parsed.scheme != "https"
        ):
            raise EmailDeliveryError(
                "FRONTEND_URL must use HTTPS in production"
            )
        if (
            os.getenv("RENDER", "").lower() == "true"
            and parsed.hostname in {"localhost", "127.0.0.1", "::1"}
        ):
            raise EmailDeliveryError(
                "FRONTEND_URL must not use a localhost URL in production"
            )
        return self.frontend_url

    def _send_message(
        self, message: EmailMessage | MIMEMultipart, recipient: str, email_type: str
    ) -> None:
        try:
            if not self.resend_api_key:
                raise EmailDeliveryError("RESEND_API_KEY is required for email delivery")

            params = {
                "from": "KALORA <onboarding@resend.dev>",
                "to": [recipient],
                "subject": message["Subject"],
            }
            reply_to = message.get("Reply-To")
            if reply_to:
                params["reply_to"] = reply_to

            payload = message.get_payload()
            parts = payload if isinstance(payload, list) else [message]
            for part in parts:
                content = part.get_payload(decode=True)
                if content is None:
                    content = part.get_payload()
                if isinstance(content, bytes):
                    content = content.decode(part.get_content_charset() or "utf-8")
                content_type = part.get_content_subtype()
                params["text" if content_type == "plain" else content_type] = content

            resend.api_key = self.resend_api_key
            resend.Emails.send(params)
        except EmailDeliveryError:
            logger.error(
                "Email delivery is not configured or was refused (%s)", email_type
            )
            raise
        except Exception as exc:
            logger.error(
                "Failed to send %s email (%s)", email_type, type(exc).__name__
            )
            raise EmailDeliveryError(
                f"Unable to send {email_type} email"
            ) from exc

    def send_contact_email(self, name: str, email: str, subject: str, message: str):
        recipient = os.getenv("CONTACT_RECIPIENT_EMAIL", "").strip()
        if not recipient:
            logger.error(
                "CONTACT_RECIPIENT_EMAIL is required for contact email delivery"
            )
            raise EmailDeliveryError(
                "CONTACT_RECIPIENT_EMAIL is required for contact email delivery"
            )

        contact_email = EmailMessage()
        contact_email["Subject"] = f"KALORA Contact Us: {subject}"
        contact_email["To"] = recipient
        contact_email["Reply-To"] = email
        contact_email.set_content(
            "KALORA Contact Us Submission\n\n"
            f"Name: {name}\n"
            f"Email: {email}\n"
            f"Subject: {subject}\n\n"
            f"Message:\n{message}"
        )
        self._send_message(contact_email, recipient, "contact")

    def send_verification_email(self, to_email: str, token: str):
        subject = "Verify Your Email - Kalora"
        verification_link = (
            f"{self._get_frontend_url()}/verify-email?{urlencode({'token': token})}"
        )

        html_content = f"""
        <html>
            <body>
                <h2>Welcome to Kalora!</h2>
                <p>Please verify your email address by clicking the link below:</p>
                <p><a href="{escape(verification_link, quote=True)}">{escape(verification_link)}</a></p>
                <br>
                <p>If you did not request this, please ignore this email.</p>
            </body>
        </html>
        """

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["To"] = to_email
        msg.attach(MIMEText(html_content, "html"))
        self._send_message(msg, to_email, "verification")

    def send_password_reset_email(self, to_email: str, token: str):
        subject = "Reset Your Password - Kalora"
        reset_link = (
            f"{self._get_frontend_url()}/reset-password?{urlencode({'token': token})}"
        )

        html_content = f"""
        <html>
            <body>
                <h2>Password Reset Request</h2>
                <p>We received a request to reset your password for your Kalora account.</p>
                <p>Click the link below to choose a new password:</p>
                <p><a href="{escape(reset_link, quote=True)}">{escape(reset_link)}</a></p>
                <br>
                <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
            </body>
        </html>
        """

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["To"] = to_email
        msg.attach(MIMEText(html_content, "html"))
        self._send_message(msg, to_email, "password-reset")
