#!/usr/bin/env python
"""
Test script to send welcome email to a specific address.
"""
import sys
sys.path.insert(0, '.')

from app.core.notification_service import send_welcome_email

def main():
    print("Sending test welcome email to sgarbo.fra@gmail.com...")

    success = send_welcome_email(
        user_email="sgarbo.fra@gmail.com",
        plan="pro"
    )

    if success:
        print("OK - Email sent successfully!")
        print("  Check your inbox at sgarbo.fra@gmail.com")
    else:
        print("ERROR - Email send failed")
        print("  Check the console output above for error details")

if __name__ == "__main__":
    main()
