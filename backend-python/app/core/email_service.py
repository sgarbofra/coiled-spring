"""
Email service using Resend for password reset and other transactional emails
"""
import resend
from app.config import settings


def send_verification_email(to_email: str, verification_token: str) -> bool:
    """
    Send email verification email using Resend.

    Args:
        to_email: Recipient email address
        verification_token: The generated verification token

    Returns:
        True if email sent successfully, False otherwise
    """
    resend.api_key = settings.resend_api_key

    verification_url = f"{settings.frontend_url}/verify-email?token={verification_token}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{
                font-family: 'Courier New', monospace;
                background-color: #000000;
                color: #CCCCCC;
                margin: 0;
                padding: 0;
            }}
            .container {{
                max-width: 600px;
                margin: 40px auto;
                background-color: #111100;
                border: 2px solid #FF6B00;
                padding: 40px;
            }}
            .header {{
                color: #FF6B00;
                font-size: 24px;
                font-weight: bold;
                letter-spacing: 2px;
                margin-bottom: 24px;
                text-align: center;
                border-bottom: 2px solid #FF6B00;
                padding-bottom: 16px;
            }}
            .content {{
                font-size: 14px;
                line-height: 1.6;
                margin-bottom: 32px;
            }}
            .button {{
                display: block;
                width: 100%;
                max-width: 300px;
                margin: 0 auto;
                background-color: #FF6B00;
                color: #000000;
                text-decoration: none;
                padding: 12px 24px;
                font-size: 16px;
                font-weight: bold;
                text-align: center;
                letter-spacing: 1px;
                border: none;
            }}
            .button:hover {{
                background-color: #FFAA00;
            }}
            .footer {{
                margin-top: 32px;
                padding-top: 16px;
                border-top: 1px solid #333300;
                font-size: 12px;
                color: #666655;
                text-align: center;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                COILED SPRING — VERIFY YOUR EMAIL
            </div>
            <div class="content">
                <p>Welcome to Coiled Spring Options Terminal!</p>
                <p>Please verify your email address by clicking the button below to complete your registration.</p>
            </div>
            <a href="{verification_url}" class="button">
                VERIFY EMAIL →
            </a>
            <div class="footer">
                <p>If you didn't create an account, you can safely ignore this email.</p>
                <p>This is an automated email from Coiled Spring Options Terminal.</p>
            </div>
        </div>
    </body>
    </html>
    """

    try:
        params = {
            "from": "Coiled Spring <noreply@coiledspring.app>",
            "to": [to_email],
            "subject": "Verify your Coiled Spring email address",
            "html": html_content,
        }

        print(f"[EMAIL VERIFICATION] ========================================")
        print(f"[EMAIL VERIFICATION] SENDING EMAIL:")
        print(f"[EMAIL VERIFICATION]   Recipient: {to_email}")
        print(f"[EMAIL VERIFICATION]   Resend API key configured: {'Yes' if settings.resend_api_key else 'No'}")
        if settings.resend_api_key:
            print(f"[EMAIL VERIFICATION]   API key (first 10 chars): {settings.resend_api_key[:10]}...")
        print(f"[EMAIL VERIFICATION]   Verification URL: {verification_url}")
        print(f"[EMAIL VERIFICATION]   Calling resend.Emails.send()...")

        response = resend.Emails.send(params)

        print(f"[EMAIL VERIFICATION] ")
        print(f"[EMAIL VERIFICATION] RESEND RESPONSE:")
        print(f"[EMAIL VERIFICATION]   Status: SUCCESS")
        print(f"[EMAIL VERIFICATION]   Response type: {type(response)}")
        print(f"[EMAIL VERIFICATION]   Response data: {response}")
        if isinstance(response, dict):
            print(f"[EMAIL VERIFICATION]   Email ID: {response.get('id', 'N/A')}")
            if 'http_headers' in response:
                headers = response['http_headers']
                print(f"[EMAIL VERIFICATION]   Rate limit remaining: {headers.get('ratelimit-remaining', 'N/A')}")
                print(f"[EMAIL VERIFICATION]   Daily quota: {headers.get('x-resend-daily-quota', 'N/A')}")
        print(f"[EMAIL VERIFICATION] ========================================")
        return True
    except Exception as e:
        print(f"[EMAIL VERIFICATION] ")
        print(f"[EMAIL VERIFICATION] RESEND ERROR:")
        print(f"[EMAIL VERIFICATION]   Status: FAILED")
        print(f"[EMAIL VERIFICATION]   Recipient was: {to_email}")
        print(f"[EMAIL VERIFICATION]   Error type: {type(e).__name__}")
        print(f"[EMAIL VERIFICATION]   Error message: {str(e)}")
        print(f"[EMAIL VERIFICATION]   Full stack trace:")
        import traceback
        traceback.print_exc()
        print(f"[EMAIL VERIFICATION] ========================================")
        return False


def send_reset_email(to_email: str, reset_token: str, reset_url: str) -> bool:
    """
    Send password reset email using Resend.

    Args:
        to_email: Recipient email address
        reset_token: The generated reset token
        reset_url: Full URL for password reset (includes token)

    Returns:
        True if email sent successfully, False otherwise
    """
    resend.api_key = settings.resend_api_key

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{
                font-family: 'Courier New', monospace;
                background-color: #000000;
                color: #CCCCCC;
                margin: 0;
                padding: 0;
            }}
            .container {{
                max-width: 600px;
                margin: 40px auto;
                background-color: #111100;
                border: 2px solid #FF6B00;
                padding: 40px;
            }}
            .header {{
                color: #FF6B00;
                font-size: 24px;
                font-weight: bold;
                letter-spacing: 2px;
                margin-bottom: 24px;
                text-align: center;
                border-bottom: 2px solid #FF6B00;
                padding-bottom: 16px;
            }}
            .content {{
                font-size: 14px;
                line-height: 1.6;
                margin-bottom: 32px;
            }}
            .button {{
                display: block;
                width: 100%;
                max-width: 300px;
                margin: 0 auto;
                background-color: #FF6B00;
                color: #000000;
                text-decoration: none;
                padding: 12px 24px;
                font-size: 16px;
                font-weight: bold;
                text-align: center;
                letter-spacing: 1px;
                border: none;
            }}
            .button:hover {{
                background-color: #FFAA00;
            }}
            .footer {{
                margin-top: 32px;
                padding-top: 16px;
                border-top: 1px solid #333300;
                font-size: 12px;
                color: #666655;
                text-align: center;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                COILED SPRING — PASSWORD RESET
            </div>
            <div class="content">
                <p>You requested to reset your password for your Coiled Spring account.</p>
                <p>Click the button below to reset your password. This link expires in 1 hour.</p>
            </div>
            <a href="{reset_url}" class="button">
                RESET PASSWORD →
            </a>
            <div class="footer">
                <p>If you didn't request this, you can safely ignore this email.</p>
                <p>This is an automated email from Coiled Spring Options Terminal.</p>
            </div>
        </div>
    </body>
    </html>
    """

    try:
        params = {
            "from": "Coiled Spring <noreply@coiledspring.app>",
            "to": [to_email],
            "subject": "Reset your Coiled Spring password",
            "html": html_content,
        }

        resend.Emails.send(params)
        return True
    except Exception as e:
        print(f"Failed to send reset email: {e}")
        return False
