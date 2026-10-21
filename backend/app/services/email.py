import smtplib
import logging
from email.message import EmailMessage
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

logger = logging.getLogger(__name__)


class EmailDeliveryError(Exception):
    pass


class EmailService:
    def __init__(self):
        self.mail_server = os.getenv("MAIL_SERVER", "smtp.gmail.com")
        try:
            self.mail_port = int(os.getenv("MAIL_PORT", 587))
        except ValueError as exc:
            logger.error("Email delivery is not configured: MAIL_PORT must be an integer")
            raise EmailDeliveryError("Email delivery is not configured") from exc
        self.mail_username = os.getenv("MAIL_USERNAME")
        self.mail_password = os.getenv("MAIL_PASSWORD")
        self.mail_sender = os.getenv("MAIL_DEFAULT_SENDER", self.mail_username)
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

    def send_contact_email(self, name: str, email: str, subject: str, message: str):
        recipient = os.getenv("CONTACT_RECIPIENT_EMAIL")
        if not all((self.mail_username, self.mail_password, self.mail_sender, recipient)):
            logger.error("Contact email delivery is not configured")
            raise EmailDeliveryError("Contact email delivery is not configured")

        contact_email = EmailMessage()
        contact_email["Subject"] = f"KALORA Contact Us: {subject}"
        contact_email["From"] = self.mail_sender
        contact_email["To"] = recipient
        contact_email["Reply-To"] = email
        contact_email.set_content(
            "KALORA Contact Us Submission\n\n"
            f"Name: {name}\n"
            f"Email: {email}\n"
            f"Subject: {subject}\n\n"
            f"Message:\n{message}"
        )

        try:
            with smtplib.SMTP(self.mail_server, self.mail_port, timeout=15) as server:
                server.starttls()
                server.login(self.mail_username, self.mail_password)
                refused_recipients = server.send_message(contact_email)
                if refused_recipients:
                    raise EmailDeliveryError("Contact email recipient was refused")
        except Exception as exc:
            if isinstance(exc, EmailDeliveryError):
                logger.error("Contact email delivery was refused by the SMTP server")
                raise
            logger.exception("Failed to send contact email")
            raise EmailDeliveryError("Contact email delivery failed") from exc

    def send_verification_email(self, to_email: str, token: str):
        if not all((self.mail_username, self.mail_password, self.mail_sender)):
            logger.error("Verification email delivery is not configured")
            raise EmailDeliveryError("Verification email delivery is not configured")

        subject = "Verify Your Email - Kalora"
        verification_link = f"{self.frontend_url}/verify-email?token={token}"

        html_content = f"""
        <html>
            <body>
                <h2>Welcome to Kalora!</h2>
                <p>Please verify your email address by clicking the link below:</p>
                <p><a href="{verification_link}">{verification_link}</a></p>
                <br>
                <p>If you did not request this, please ignore this email.</p>
            </body>
        </html>
        """

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = self.mail_sender
        msg["To"] = to_email

        part = MIMEText(html_content, "html")
        msg.attach(part)

        try:
            with smtplib.SMTP(self.mail_server, self.mail_port, timeout=15) as server:
                server.starttls()
                server.login(self.mail_username, self.mail_password)
                refused_recipients = server.send_message(msg)
                if refused_recipients:
                    raise EmailDeliveryError("Verification email recipient was refused")
        except EmailDeliveryError:
            logger.error("Verification email delivery was refused by the SMTP server")
            raise
        except Exception as exc:
            logger.exception("Failed to send verification email")
            raise EmailDeliveryError("Verification email delivery failed") from exc

    def send_password_reset_email(self, to_email: str, token: str):
        if not self.mail_username or not self.mail_password:
            print("Email credentials missing. Cannot send password reset email.")
            return

        subject = "Reset Your Password - Kalora"
        reset_link = f"{self.frontend_url}/reset-password?token={token}"

        html_content = f"""
        <html>
            <body>
                <h2>Password Reset Request</h2>
                <p>We received a request to reset your password for your Kalora account.</p>
                <p>Click the link below to choose a new password:</p>
                <p><a href="{reset_link}">{reset_link}</a></p>
                <br>
                <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
            </body>
        </html>
        """

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = self.mail_sender
        msg["To"] = to_email

        part = MIMEText(html_content, "html")
        msg.attach(part)

        try:
            with smtplib.SMTP(self.mail_server, self.mail_port) as server:
                server.starttls()
                server.login(self.mail_username, self.mail_password)
                server.sendmail(self.mail_sender, to_email, msg.as_string())
        except Exception as e:
            print(f"Failed to send password reset email: {e}")
