"""
Notification service for user registration emails
"""
import resend
from datetime import datetime
from app.config import settings


def send_admin_notification(user_email: str, plan: str, registered_at: datetime) -> bool:
    """Send admin notification when user registers"""
    resend.api_key = settings.resend_api_key

    # Format date/time
    date_str = registered_at.strftime("%Y-%m-%d %H:%M:%S UTC")

    # Simple HTML email for admin
    html = f"""<html><body style="font-family: monospace; background: #000; color: #ccc; padding: 20px;">
<div style="max-width: 600px; margin: 0 auto; background: #111; border: 2px solid #FF6600; padding: 20px;">
<h2 style="color: #FF6600; margin: 0 0 20px 0; font-size: 18px; letter-spacing: 2px;">
🚀 NEW USER REGISTERED
</h2>
<table style="width: 100%; font-size: 14px; line-height: 1.8;">
<tr>
  <td style="color: #FFAA00; padding: 4px 0;">Email:</td>
  <td style="color: #fff; font-weight: bold;">{user_email}</td>
</tr>
<tr>
  <td style="color: #FFAA00; padding: 4px 0;">Plan:</td>
  <td style="color: #fff; font-weight: bold;">{plan.upper()}</td>
</tr>
<tr>
  <td style="color: #FFAA00; padding: 4px 0;">Date:</td>
  <td style="color: #fff;">{date_str}</td>
</tr>
</table>
<p style="margin: 20px 0 0 0; padding-top: 20px; border-top: 1px solid #333; font-size: 12px; color: #888;">
Coiled Spring Terminal — Admin Notification
</p>
</div>
</body></html>"""

    try:
        result = resend.Emails.send({
            "from": "Coiled Spring <noreply@coiledspring.app>",
            "to": [settings.admin_email],
            "subject": "[Coiled Spring] New user registered",
            "html": html
        })
        print(f"[ADMIN NOTIFICATION] Sent to {settings.admin_email}, ID: {result}")
        return True
    except Exception as e:
        print(f"[ADMIN NOTIFICATION] Error: {e}")
        return False


def send_welcome_email(user_email: str, plan: str) -> bool:
    """
    Send welcome email to newly registered user.
    """
    print(f"[EMAIL] Attempting to send welcome email to {user_email}")
    resend.api_key = settings.resend_api_key

    # Determine greeting based on time of day
    hour = datetime.now().hour
    if hour < 12:
        greeting = "Good morning,"
    elif hour < 18:
        greeting = "Good afternoon,"
    else:
        greeting = "Good evening,"

    # Table-based HTML template for email clients
    # Logo URL will be replaced after Imgur upload
    html = f"""<html><body style="margin:0;padding:0;background:#0a0a0a;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0a;">
<tr><td align="center" style="padding:20px;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#000;border:2px solid #FF6600;">
<tr><td style="padding:30px;text-align:center;border-bottom:2px solid #FF6600;">
<img src="https://i.imgur.com/3oc6xmv.png" alt="CS" width="40" height="40" style="display:inline-block;vertical-align:middle;margin-right:10px;">
<h1 style="margin:0;color:#FF6600;font-size:24px;display:inline-block;vertical-align:middle;">COILED SPRING</h1>
<p style="margin:10px 0 0 0;color:#FFAA00;font-size:12px;">ANTIFRAGILE OPTIONS TERMINAL</p>
</td></tr>
<tr><td style="padding:32px;">
<p style="margin:0 0 20px 0;padding:12px 20px;background:rgba(0,255,65,0.1);border-left:3px solid #00ff41;color:#00ff41;font-size:14px;font-weight:bold;letter-spacing:1px;font-family:monospace;">✓ BETA ACCESS GRANTED</p>
<p style="font-family:Arial,sans-serif;font-size:15px;color:#cccccc;line-height:1.7;margin:0 0 16px 0;">{greeting}</p>
<p style="font-family:Arial,sans-serif;font-size:15px;color:#cccccc;line-height:1.7;margin:0 0 16px 0;">Welcome to Coiled Spring &#8212; and thank you for signing up.</p>
<p style="font-family:Arial,sans-serif;font-size:15px;color:#cccccc;line-height:1.7;margin:0 0 16px 0;">Coiled Spring is an ambitious project built for people who look at financial markets differently. Our focus is on LEAPS options and volatility analysis, approached through the lens of asymmetric opportunity and antifragile thinking.</p>
<p style="font-family:Arial,sans-serif;font-size:15px;color:#cccccc;line-height:1.7;margin:0 0 16px 0;">The platform is currently in beta. It is young, it is growing, and we know there is much to improve. That is exactly why your feedback matters so much to us. Whether it is a bug report, a feature request, a suggestion, or simply a comment about your experience &#8212; we want to hear it.</p>
<p style="font-family:Arial,sans-serif;font-size:15px;color:#cccccc;line-height:1.7;margin:0 0 16px 0;">If you want to understand the theory behind the strategy, you can find the book <a href="https://www.amazon.com/dp/B0H59BH9SL" style="color:#FF6600;font-weight:bold;text-decoration:none;">"Coiled Spring Strategy"</a> on Amazon. We also invite you to follow our YouTube channel, where we will publish short documentaries on financial crises, tutorials on the platform, and updates on new features.</p>
<p style="font-family:Arial,sans-serif;font-size:15px;color:#cccccc;line-height:1.7;margin:0 0 24px 0;">Thank you for being part of Coiled Spring from the very beginning. It means a lot.</p>
<p style="text-align:center;margin:0 0 24px 0;">
<a href="https://www.amazon.com/dp/B0H59BH9SL" style="background:#FF6600;color:#000;padding:12px 24px;text-decoration:none;font-weight:bold;font-family:monospace;display:inline-block;font-size:14px;letter-spacing:1px;">GET THE BOOK ON AMAZON →</a>
</p>
<p style="font-family:Arial,sans-serif;font-size:15px;color:#cccccc;line-height:1.7;margin:0;">See you soon,<br><strong style="color:#ffffff;">The Coiled Spring Team</strong></p>
</td></tr>
<tr><td style="padding:20px;text-align:center;">
<a href="http://localhost:3000/scanner" style="display:inline-block;background:#FF6600;color:#000;padding:12px 30px;text-decoration:none;font-weight:bold;font-size:14px;">OPEN TERMINAL</a>
</td></tr>
<tr><td style="padding:20px;text-align:center;border-top:1px solid #333;font-size:11px;color:#666;">
<p style="margin:0;"><strong style="color:#FFAA00;">Coiled Spring Terminal</strong></p>
<p style="margin:5px 0 0 0;">Hunt LEAPS. Win from volatility expansion.</p>
</td></tr>
</table>
</td></tr>
</table></body></html>"""

    try:
        result = resend.Emails.send({
            "from": "Coiled Spring <noreply@coiledspring.app>",
            "to": [user_email],
            "subject": "Welcome to Coiled Spring Terminal — Your Beta Access is Ready",
            "html": html
        })
        print(f"[RESEND] Welcome email sent to {user_email}, ID: {result}")
        print(f"[EMAIL] Welcome email sent")

        # Add user to Resend audience
        try:
            resend.Contacts.create({
                "email": user_email,
                "unsubscribed": False,
                "audience_id": "f5828153-b4fd-46e5-afa1-574ba48ccd76"
            })
            print(f"[RESEND] User {user_email} added to audience")
        except Exception as contact_error:
            print(f"[RESEND] Failed to add user to audience: {contact_error}")

        return True
    except Exception as e:
        print(f"[RESEND] Error: {e}")
        return False


def send_cancellation_notification(user_email: str, reason: str = None, suggestions: str = None) -> bool:
    """
    Send admin notification when user cancels account.

    Args:
        user_email: Email of the user who cancelled
        reason: Optional reason for cancellation
        suggestions: Optional suggestions from user

    Returns:
        True if email sent successfully, False otherwise
    """
    resend.api_key = settings.resend_api_key

    # Format current date/time
    from datetime import datetime
    date_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")

    # Build HTML email
    html = f"""<html><body style="font-family: monospace; background: #000; color: #ccc; padding: 20px;">
<div style="max-width: 600px; margin: 0 auto; background: #111; border: 2px solid #FF4444; padding: 20px;">
<h2 style="color: #FF4444; margin: 0 0 20px 0; font-size: 18px; letter-spacing: 2px;">
⚠️ USER CANCELLED ACCOUNT
</h2>
<table style="width: 100%; font-size: 14px; line-height: 1.8;">
<tr>
  <td style="color: #FFAA00; padding: 4px 0;">Email:</td>
  <td style="color: #fff; font-weight: bold;">{user_email}</td>
</tr>
<tr>
  <td style="color: #FFAA00; padding: 4px 0;">Date:</td>
  <td style="color: #fff;">{date_str}</td>
</tr>"""

    if reason:
        html += f"""
<tr>
  <td style="color: #FFAA00; padding: 4px 0; vertical-align: top;">Reason:</td>
  <td style="color: #fff;">{reason}</td>
</tr>"""

    if suggestions:
        html += f"""
<tr>
  <td style="color: #FFAA00; padding: 4px 0; vertical-align: top;">Suggestions:</td>
  <td style="color: #fff;">{suggestions}</td>
</tr>"""

    html += """
</table>
<p style="margin: 20px 0 0 0; padding-top: 20px; border-top: 1px solid #333; font-size: 12px; color: #888;">
Coiled Spring Terminal — Cancellation Notification
</p>
</div>
</body></html>"""

    try:
        result = resend.Emails.send({
            "from": "Coiled Spring <noreply@coiledspring.app>",
            "to": [settings.admin_email],
            "subject": "[Coiled Spring] User cancelled account",
            "html": html
        })
        print(f"[CANCELLATION NOTIFICATION] Sent to {settings.admin_email}, ID: {result}")
        return True
    except Exception as e:
        print(f"[CANCELLATION NOTIFICATION] Error: {e}")
        return False


def send_account_deletion_notification(user_email: str, user_id: int, plan: str) -> bool:
    """
    Send admin notification when user deletes their account.

    Args:
        user_email: Email of the deleted user
        user_id: ID of the deleted user
        plan: User's plan at time of deletion

    Returns:
        True if email sent successfully, False otherwise
    """
    resend.api_key = settings.resend_api_key

    # Format current date/time
    from datetime import datetime
    date_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")

    # Build HTML email
    html = f"""<html><body style="font-family: monospace; background: #000; color: #ccc; padding: 20px;">
<div style="max-width: 600px; margin: 0 auto; background: #111; border: 2px solid #FF4444; padding: 20px;">
<h2 style="color: #FF4444; margin: 0 0 20px 0; font-size: 18px; letter-spacing: 2px;">
⚠️ ACCOUNT DELETED
</h2>
<table style="width: 100%; font-size: 14px; line-height: 1.8;">
<tr>
  <td style="color: #FFAA00; padding: 4px 0;">User ID:</td>
  <td style="color: #fff; font-weight: bold;">{user_id}</td>
</tr>
<tr>
  <td style="color: #FFAA00; padding: 4px 0;">Email:</td>
  <td style="color: #fff; font-weight: bold;">{user_email}</td>
</tr>
<tr>
  <td style="color: #FFAA00; padding: 4px 0;">Plan:</td>
  <td style="color: #fff;">{plan.upper()}</td>
</tr>
<tr>
  <td style="color: #FFAA00; padding: 4px 0;">Deleted at:</td>
  <td style="color: #fff;">{date_str}</td>
</tr>
</table>
<p style="margin: 20px 0 0 0; padding-top: 20px; border-top: 1px solid #333; font-size: 12px; color: #888;">
Coiled Spring Terminal — Account Deletion Notification
</p>
</div>
</body></html>"""

    try:
        result = resend.Emails.send({
            "from": "Coiled Spring <noreply@coiledspring.app>",
            "to": [settings.admin_email],
            "subject": f"[Coiled Spring] User cancelled account: {user_email}",
            "html": html
        })
        print(f"[ACCOUNT DELETION] Notification sent to {settings.admin_email}, ID: {result}")
        print(f"[EMAIL] Admin notification sent to {settings.admin_email}")
        return True
    except Exception as e:
        print(f"[ACCOUNT DELETION] Notification error: {e}")
        return False


def send_cancellation_confirmation_email(to_email: str) -> bool:
    """
    Send cancellation confirmation email to user.

    Args:
        to_email: User's email address

    Returns:
        True if email sent successfully, False otherwise
    """
    resend.api_key = settings.resend_api_key

    # Build HTML email - Bloomberg terminal style
    html = f"""<html>
<head>
<style>
body {{
    margin: 0;
    padding: 0;
    background-color: #0a0a0a;
    font-family: 'Courier New', monospace;
}}
</style>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0a0a0a;">
<tr>
<td align="center" style="padding: 40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #0a0a0a; border: 2px solid #ff6b00;">
<tr>
<td style="padding: 40px 30px;">

<!-- Header -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 30px;">
<tr>
<td style="border-bottom: 2px solid #ff6b00; padding-bottom: 20px;">
<h1 style="margin: 0; color: #ff6b00; font-size: 24px; font-weight: bold; letter-spacing: 3px; font-family: 'Courier New', monospace;">
COILED SPRING
</h1>
<p style="margin: 8px 0 0 0; color: #ff6b00; font-size: 11px; letter-spacing: 2px; font-family: 'Courier New', monospace;">
ANTIFRAGILE OPTIONS TERMINAL
</p>
</td>
</tr>
</table>

<!-- Body -->
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td>

<!-- Confirmation Badge -->
<p style="margin: 0 0 25px 0; padding: 12px 20px; background-color: rgba(0, 255, 65, 0.1); border-left: 3px solid #00ff41; color: #00ff41; font-size: 14px; font-weight: bold; letter-spacing: 1px; font-family: 'Courier New', monospace;">
✓ ACCOUNT CANCELLED SUCCESSFULLY
</p>

<p style="margin: 0 0 20px 0; color: #e8e8e8; font-size: 15px; line-height: 1.7; font-family: 'Courier New', monospace;">
Your Coiled Spring account has been successfully cancelled.
</p>

<p style="margin: 0 0 20px 0; color: #e8e8e8; font-size: 15px; line-height: 1.7; font-family: 'Courier New', monospace;">
Thank you for using Coiled Spring. We appreciate the time you spent exploring the platform.
</p>

<p style="margin: 0 0 30px 0; color: #e8e8e8; font-size: 15px; line-height: 1.7; font-family: 'Courier New', monospace;">
If you'd like to deepen your understanding of the Coiled Spring strategy, the book is available on Amazon.
</p>

<!-- CTA Button -->
<table cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 30px 0;">
<tr>
<td align="center" style="background-color: #ff6b00; border-radius: 4px;">
<a href="https://www.amazon.it/dp/B0DQRX4WGN" target="_blank" style="display: inline-block; padding: 14px 28px; color: #0a0a0a; font-size: 14px; font-weight: bold; text-decoration: none; letter-spacing: 1px; font-family: 'Courier New', monospace;">
GET THE BOOK
</a>
</td>
</tr>
</table>

<p style="margin: 0 0 20px 0; color: #e8e8e8; font-size: 15px; line-height: 1.7; font-family: 'Courier New', monospace;">
We'd love to hear your feedback. If you have a moment, please let us know what we could improve:
</p>

<!-- Feedback Link -->
<p style="margin: 0 0 30px 0;">
<a href="https://coiledspring.app/feedback" target="_blank" style="color: #00ff41; font-size: 15px; text-decoration: underline; font-family: 'Courier New', monospace;">
https://coiledspring.app/feedback
</a>
</p>

<p style="margin: 0; color: #e8e8e8; font-size: 15px; line-height: 1.7; font-family: 'Courier New', monospace;">
If this was a mistake or you'd like to return, you can always <span style="color: #00ff41;">create a new account</span> at any time.
</p>

</td>
</tr>
</table>

<!-- Footer -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #333;">
<tr>
<td align="center">
<p style="margin: 0; color: #666; font-size: 12px; font-family: 'Courier New', monospace;">
Coiled Spring Terminal &mdash; Account Cancellation Confirmation
</p>
</td>
</tr>
</table>

</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>"""

    try:
        result = resend.Emails.send({
            "from": "Coiled Spring <noreply@coiledspring.app>",
            "to": [to_email],
            "subject": "Your Coiled Spring account has been cancelled",
            "html": html
        })
        print(f"[EMAIL] Cancellation confirmation sent to {to_email}, ID: {result}")
        return True
    except Exception as e:
        print(f"[EMAIL] Failed to send cancellation confirmation to {to_email}: {e}")
        return False
