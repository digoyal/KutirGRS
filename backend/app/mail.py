"""Outbound email helpers. Without SMTP_HOST, log the message (local/dev)."""
from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

from app.config import settings

log = logging.getLogger("kutirgrs.mail")


def smtp_configured() -> bool:
    return bool((settings.SMTP_HOST or "").strip())


def send_email(*, to: str, subject: str, body_text: str) -> None:
    """Send plain-text email via SMTP, or log when SMTP is not configured."""
    if not smtp_configured():
        # Print so uvicorn --reload stdout always shows the local/dev reset URL.
        msg = (
            f"SMTP not configured — email not sent.\n"
            f"To: {to}\nSubject: {subject}\n\n{body_text}"
        )
        print(msg, flush=True)
        log.warning(msg)
        return

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM or settings.SMTP_USER or "noreply@localhost"
    msg["To"] = to
    msg.set_content(body_text)

    host = settings.SMTP_HOST.strip()
    port = int(settings.SMTP_PORT)
    use_tls = bool(settings.SMTP_USE_TLS)
    user = (settings.SMTP_USER or "").strip()
    password = settings.SMTP_PASSWORD or ""

    if use_tls:
        with smtplib.SMTP(host, port, timeout=30) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.ehlo()
            if user:
                smtp.login(user, password)
            smtp.send_message(msg)
    else:
        with smtplib.SMTP(host, port, timeout=30) as smtp:
            if user:
                smtp.login(user, password)
            smtp.send_message(msg)


def send_password_reset_email(*, to: str, reset_url: str) -> None:
    subject = "Reset your Parivaar Kutir GRS password"
    body = (
        "You requested a password reset for Parivaar Kutir GRS.\n\n"
        f"Open this link to set a new password (expires soon):\n{reset_url}\n\n"
        "If you did not request this, you can ignore this email.\n"
    )
    send_email(to=to, subject=subject, body_text=body)
