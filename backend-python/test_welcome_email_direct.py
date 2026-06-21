"""
Test script to directly call send_welcome_email
"""
import sys
sys.path.insert(0, '.')

from app.core.notification_service import send_welcome_email

print("=" * 60)
print("Testing send_welcome_email directly")
print("=" * 60)
print()

result = send_welcome_email("test-direct@example.com", "free")

print()
print("=" * 60)
print(f"Result: {result}")
print("=" * 60)
