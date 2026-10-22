"""SMTP Email Service for Notifications and Password Resets."""

import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from app.core.config import settings

logger = logging.getLogger("smartedu.email")


def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None,
) -> bool:
    """Send an email using configured SMTP credentials."""
    from_addr = settings.SMTP_FROM_EMAIL or settings.SMTP_USER or "noreply@uniflow.edu"
    from_name = settings.SMTP_FROM_NAME or "UniFlow University LMS"

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning(
            "[EMAIL SERVICE] SMTP_USER or SMTP_PASSWORD not configured. "
            "Email was not sent because SMTP credentials are not configured. Recipient: %s | Subject: %s",
            to_email,
            subject,
        )
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{from_name} <{from_addr}>"
        msg["To"] = to_email

        if text_content:
            msg.attach(MIMEText(text_content, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        if settings.SMTP_SSL:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(from_addr, [to_email], msg.as_string())
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                if settings.SMTP_TLS:
                    server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(from_addr, [to_email], msg.as_string())

        logger.info("Successfully sent email to %s (Subject: %s)", to_email, subject)
        return True
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to_email, str(exc))
        return False


def send_password_reset_email(
    to_email: str,
    user_name: str,
    reset_token: str,
    reset_code: str,
) -> bool:
    """Send a branded password reset email with direct link and 6-digit OTP code."""
    reset_url = f"{settings.FRONTEND_URL}/login?reset_token={reset_token}&email={to_email}"
    subject = "UniFlow LMS: Password Reset Verification Code"

    text_body = f"""Hello {user_name},

We received a request to reset your password for your UniFlow University LMS account.

Your 6-Digit Password Reset Code is: {reset_code}

Alternatively, you can reset your password directly using this secure link:
{reset_url}

This link and code will expire in 15 minutes. If you did not request a password reset, you can safely ignore this email.

Best regards,
UniFlow LMS Administration
"""

    html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your Password</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }}
    .container {{ max-width: 560px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
    .header {{ background-color: #0f172a; padding: 24px; text-align: center; color: #ffffff; }}
    .header h1 {{ margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff; }}
    .header p {{ margin: 4px 0 0; font-size: 12px; color: #94a3b8; font-weight: 500; }}
    .content {{ padding: 32px 28px; }}
    .content p {{ font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px; }}
    .code-box {{ background-color: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; }}
    .code-box .label {{ font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 6px; }}
    .code-box .code {{ font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #2563eb; font-family: monospace; }}
    .btn {{ display: inline-block; background-color: #2563eb; color: #ffffff !important; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 10px; margin-top: 8px; text-align: center; }}
    .footer {{ background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px; text-align: center; font-size: 11px; color: #94a3b8; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>UniFlow University LMS</h1>
      <p>Secure Institutional Access Portal</p>
    </div>
    <div class="content">
      <p>Hello <strong>{user_name}</strong>,</p>
      <p>We received a request to reset your password for your UniFlow LMS account. Use the 6-digit verification code below, or click the direct button:</p>
      
      <div class="code-box">
        <div class="label">Verification Code (Valid for 15 minutes)</div>
        <div class="code">{reset_code}</div>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="{reset_url}" class="btn" target="_blank">Reset My Password &rarr;</a>
      </div>

      <p style="font-size: 12px; color: #64748b;">If the button above does not work, copy and paste this link into your browser:<br>
      <a href="{reset_url}" style="color: #2563eb; word-break: break-all;">{reset_url}</a></p>

      <p style="font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 12px; margin-top: 24px;">
        If you did not request this password reset, no action is needed. Your password will remain unchanged.
      </p>
    </div>
    <div class="footer">
      &copy; 2026 UniFlow &bull; University Learning Management System &bull; System Automated Notification
    </div>
  </div>
</body>
</html>
"""

    return send_email(to_email, subject, html_body, text_body)
