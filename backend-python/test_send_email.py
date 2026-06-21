"""
Test email sending directly
"""
import sys
sys.path.insert(0, '.')

from app.core.email_service import send_verification_email
from app.config import settings

print("=" * 70)
print("TESTING EMAIL VERIFICATION SENDING")
print("=" * 70)
print()

print(f"Resend API Key configured: {'Yes' if settings.resend_api_key else 'No'}")
if settings.resend_api_key:
    print(f"API Key (first 10 chars): {settings.resend_api_key[:10]}...")
print(f"Test email: {settings.test_email}")
print()

test_token = "test-verification-token-12345"
test_email = "test@example.com"

print(f"Sending verification email to: {test_email}")
print(f"Verification token: {test_token}")
print()
print("-" * 70)

result = send_verification_email(test_email, test_token)

print("-" * 70)
print()
print(f"Result: {'SUCCESS' if result else 'FAILED'}")
print()
print("=" * 70)
