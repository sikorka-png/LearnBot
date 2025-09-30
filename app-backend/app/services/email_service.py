import logging
import os
import smtplib
import ssl
from email.message import EmailMessage
from typing import List

from app.schemas.contact import ContactIn

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s"
)

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
MAIL_TO = os.getenv("MAIL_TO", "support@twojadomena.com")
MAIL_RESET_FROM = os.getenv("MAIL_RESET", "support@twojadomena.com")


def build_email(contact_data: ContactIn, files: List[dict]) -> EmailMessage:
    em = EmailMessage()
    em["From"] = SMTP_USER or MAIL_TO
    em["To"] = MAIL_TO
    em["Reply-To"] = contact_data.email
    em["Subject"] = f"[{contact_data.topic.upper()}] {contact_data.subject}"
    em.set_content(
        f"Topic: {contact_data.topic}\n"
        f"From: {contact_data.email}\n\n"
        f"Message:\n{contact_data.message}\n"
    )

    for f in files:
        maintype, _, subtype = (f["content_type"] or "application/octet-stream").partition("/")
        em.add_attachment(f["content"], maintype=maintype, subtype=subtype, filename=f["filename"])
    return em


def send_email(em: EmailMessage) -> None:
    try:
        if not (SMTP_HOST and SMTP_PORT and SMTP_USER and SMTP_PASS and em["To"]):
            logger.error(
                f'Missing SMTP configuration or recipient: {SMTP_HOST}, {SMTP_PORT}, {SMTP_USER}, {SMTP_PASS}, {em["To"]}')
            return
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as smtp:
            smtp.starttls()
            smtp.login(SMTP_USER, SMTP_PASS)
            smtp.send_message(em)
    except Exception as e:
        logger.error(e)


def send_reset_email(to_email: str, reset_link: str, app_name: str = "Your App", ttl_minutes: int = 30):
    """
    Wysyła e-mail z linkiem do resetu hasła (HTML + fallback text).
    Używa SMTP over SSL (port 465). Dostosuj pod swojego dostawcę.
    """
    if not all([SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_RESET_FROM]):
        # W produkcji zaloguj/zgłoś błąd do Sentry – tutaj ostrożnie, żeby nie zdradzać danych
        raise RuntimeError("SMTP is not configured")

    subject = f"{app_name} – reset hasła"
    text = (
        f"Cześć,\n\nOtrzymaliśmy prośbę o reset hasła w {app_name}.\n"
        f"Kliknij poniższy link, aby ustawić nowe hasło (ważny {ttl_minutes} min):\n{reset_link}\n\n"
        "Jeśli to nie Ty, zignoruj tę wiadomość."
    )
    html = f"""
    <html>
      <body style="font-family:Arial,sans-serif;line-height:1.5">
        <p>Cześć,</p>
        <p>Otrzymaliśmy prośbę o reset hasła w <strong>{app_name}</strong>.</p>
        <p>
          <a href="{reset_link}" 
             style="display:inline-block;background:#0ea5e9;color:#fff;padding:10px 16px;
                    text-decoration:none;border-radius:6px">
            Ustaw nowe hasło
          </a>
        </p>
        <p style="font-size:12px;color:#6b7280">
          Link jest ważny przez {ttl_minutes} minut. Jeśli to nie Ty, zignoruj tę wiadomość.
        </p>
        <p style="font-size:12px;color:#6b7280">{reset_link}</p>
      </body>
    </html>
    """

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = MAIL_RESET_FROM
    msg["To"] = to_email
    msg.set_content(text)
    msg.add_alternative(html, subtype="html")

    context = ssl.create_default_context()
    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context) as server:
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)
