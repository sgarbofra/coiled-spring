"""
Notification service for user registration emails
"""
import resend
from datetime import datetime
from app.config import settings


def send_admin_notification(user_email: str, plan: str, registered_at: datetime) -> bool:
    """
    Send admin notification email when a new user registers.

    Args:
        user_email: Email of the newly registered user
        plan: Plan chosen (free, pro, pro_byok)
        registered_at: DateTime of registration

    Returns:
        True if email sent successfully, False otherwise
    """
    resend.api_key = settings.resend_api_key

    # Admin email from settings
    admin_email = getattr(settings, 'admin_email', 'sgarbo.fra@gmail.com')

    # Format date and time
    date_str = registered_at.strftime('%Y-%m-%d %H:%M:%S')

    # Plan display name
    plan_display = {
        'free': 'FREE',
        'pro': 'PRO',
        'pro_byok': 'PRO BYOK'
    }.get(plan, plan.upper())

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {
                font-family: 'Courier New', monospace;
                background-color: #000000;
                color: #CCCCCC;
                margin: 0;
                padding: 0;
            }
            .container {
                max-width: 600px;
                margin: 40px auto;
                background-color: #0a0a00;
                border: 2px solid #FF6B00;
                padding: 40px;
            }
            .header {
                color: #FF6B00;
                font-size: 28px;
                font-weight: bold;
                letter-spacing: 2px;
                margin-bottom: 32px;
                text-align: center;
                border-bottom: 2px solid #FF6B00;
                padding-bottom: 16px;
            }
            .info {
                background-color: #111100;
                border: 1px solid #333300;
                padding: 20px;
                margin-bottom: 24px;
            }
            .info-row {
                display: flex;
                margin-bottom: 12px;
                font-size: 14px;
            }
            .info-label {
                color: #FFAA00;
                font-weight: bold;
                width: 140px;
                letter-spacing: 1px;
            }
            .info-value {
                color: #FFFFFF;
            }
            .plan-badge {
                display: inline-block;
                background-color: #FF6B00;
                color: #000000;
                padding: 4px 8px;
                font-weight: bold;
                letter-spacing: 1px;
            }
            .button {
                display: block;
                width: 100%;
                max-width: 300px;
                margin: 24px auto 0;
                background-color: #FF6B00;
                color: #000000;
                text-decoration: none;
                padding: 12px 24px;
                font-size: 14px;
                font-weight: bold;
                text-align: center;
                letter-spacing: 1px;
                border: none;
            }
            .button:hover {
                background-color: #FFAA00;
            }
            .footer {
                margin-top: 32px;
                padding-top: 16px;
                border-top: 1px solid #333300;
                font-size: 11px;
                color: #666655;
                text-align: center;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                🆕 NEW USER REGISTERED
            </div>
            <div class="info">
                <div class="info-row">
                    <div class="info-label">EMAIL:</div>
                    <div class="info-value">{user_email}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">PLAN:</div>
                    <div class="info-value"><span class="plan-badge">{plan_display}</span></div>
                </div>
                <div class="info-row">
                    <div class="info-label">REGISTERED AT:</div>
                    <div class="info-value">{date_str}</div>
                </div>
            </div>
            <a href="http://localhost:3000" class="button">
                OPEN ADMIN DASHBOARD ->
            </a>
            <div class="footer">
                <p>Automated notification from Coiled Spring Options Terminal</p>
            </div>
        </div>
    </body>
    </html>
    """

    try:
        params = {
            "from": "Coiled Spring <onboarding@resend.dev>",
            "to": [admin_email],
            "subject": "🆕 New Registration - Coiled Spring",
            "html": html_content,
        }

        resend.Emails.send(params)
        return True
    except Exception as e:
        print(f"Failed to send admin notification: {e}")
        return False


def send_welcome_email(user_email: str, plan: str) -> bool:
    """
    Send welcome email to newly registered user.

    Args:
        user_email: Email of the newly registered user
        plan: Plan chosen (free, pro, pro_byok)

    Returns:
        True if email sent successfully, False otherwise
    """
    resend.api_key = settings.resend_api_key

    # In development, send to TEST_EMAIL if set
    to_email_actual = settings.test_email if settings.test_email else user_email

    # Ultra-simple HTML template with inline styles (no <style> tag)
    # Compatible with all email clients
    html_content = """
    html_content = r"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#0a0a0a;color:#CCC;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:20px;">
<tr><td align="center">
<table width="600" cellpadding="20" cellspacing="0" style="background:#000;border:2px solid #FF6600;">
<tr><td style="text-align:center;border-bottom:2px solid #FF6600;">
<img src="https://coiledspring.app/logo.png" alt="Logo" style="max-width:100px;margin-bottom:10px;">
<div style="color:#FFAA00;font-size:11px;letter-spacing:2px;">ANTIFRAGILE OPTIONS TERMINAL</div>
</td></tr>
<tr><td style="text-align:center;padding:30px 20px;">
<h1 style="color:#FFF;font-size:22px;margin:0 0 10px;">Welcome to Beta Access</h1>
<div style="background:#FF6600;color:#000;display:inline-block;padding:6px 12px;font-size:10px;font-weight:bold;margin:10px 0;">PRO BETA - COMPLIMENTARY</div>
<p style="font-size:14px;line-height:1.6;margin:15px 0;">You have joined an exclusive community of traders who think in convexity.</p>
</td></tr>
<tr><td style="padding:10px 20px;">
<div style="background:#0a0a00;padding:15px;margin-bottom:10px;">
<div style="color:#FF6600;font-weight:bold;margin-bottom:5px;">STEP 1: GO TO SCANNER</div>
<div style="font-size:13px;">Select an asset class and run the LEAPS scanner.</div>
</div>
<div style="background:#0a0a00;padding:15px;margin-bottom:10px;">
<div style="color:#FF6600;font-weight:bold;margin-bottom:5px;">STEP 2: ANALYZE</div>
<div style="font-size:13px;">Check Delta, IV Rank, and Volatility Surface.</div>
</div>
<div style="background:#0a0a00;padding:15px;">
<div style="color:#FF6600;font-weight:bold;margin-bottom:5px;">STEP 3: BUILD WATCHLIST</div>
<div style="font-size:13px;">Track live prices and monitor IV changes.</div>
</div>
</td></tr>
<tr><td style="text-align:center;padding:20px;">
<a href="http://localhost:3000/scanner" style="background:#FF6600;color:#000;padding:12px 30px;text-decoration:none;font-weight:bold;display:inline-block;">OPEN TERMINAL</a>
</td></tr>
<tr><td style="text-align:center;border-top:1px solid #333;padding-top:15px;font-size:11px;color:#666;">
<strong style="color:#FFAA00;">Coiled Spring Terminal</strong><br>
Hunt LEAPS. Win from volatility expansion.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
    """
