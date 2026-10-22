import logging
import os
import smtplib
from email.message import EmailMessage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import parseaddr
from html import escape
from urllib.parse import urlencode, urlsplit

logger = logging.getLogger(__name__)


class EmailDeliveryError(Exception):
    pass


class EmailService:
    def __init__(self):
        self.mail_server = os.getenv("MAIL_SERVER", "").strip()
        self.mail_port = os.getenv("MAIL_PORT", "587").strip()
        self.mail_username = os.getenv("MAIL_USERNAME", "")
        self.mail_password = os.getenv("MAIL_PASSWORD", "")
        self.mail_sender = os.getenv("MAIL_DEFAULT_SENDER", "").strip()
        self.mail_use_ssl = os.getenv("MAIL_USE_SSL", "false").strip().lower()
        self.frontend_url = os.getenv("FRONTEND_URL", "").rstrip("/")

    def _get_smtp_settings(self) -> tuple[str, int, bool, str, str, str]:
        if not self.mail_server:
            raise EmailDeliveryError("MAIL_SERVER is required for email delivery")
        if not self.mail_username or not self.mail_password:
            raise EmailDeliveryError(
                "MAIL_USERNAME and MAIL_PASSWORD are required for email delivery"
            )
        if not self.mail_sender:
            raise EmailDeliveryError(
                "MAIL_DEFAULT_SENDER is required for email delivery"
            )

        try:
            port = int(self.mail_port)
        except ValueError as exc:
            raise EmailDeliveryError("MAIL_PORT must be an integer") from exc
        if not 1 <= port <= 65535:
            raise EmailDeliveryError("MAIL_PORT must be between 1 and 65535")
        if self.mail_use_ssl not in {"true", "false"}:
            raise EmailDeliveryError("MAIL_USE_SSL must be 'true' or 'false'")

        _, sender_address = parseaddr(self.mail_sender)
        if (
            not sender_address
            or "@" not in sender_address
            or any(char.isspace() for char in sender_address)
        ):
            raise EmailDeliveryError(
                "MAIL_DEFAULT_SENDER must be a valid email address"
            )

        return (
            self.mail_server,
            port,
            self.mail_use_ssl == "true",
            self.mail_username,
            self.mail_password,
            sender_address,
        )

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
            host, port, use_ssl, username, password, sender = (
                self._get_smtp_settings()
            )
            message["From"] = self.mail_sender
            if use_ssl:
                with smtplib.SMTP_SSL(host, port, timeout=15) as server:
                    server.login(username, password)
                    refused_recipients = server.send_message(
                        message, from_addr=sender, to_addrs=[recipient]
                    )
            else:
                with smtplib.SMTP(host, port, timeout=15) as server:
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                    server.login(username, password)
                    refused_recipients = server.send_message(
                        message, from_addr=sender, to_addrs=[recipient]
                    )
            if refused_recipients:
                raise EmailDeliveryError("SMTP server refused the recipient")
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
