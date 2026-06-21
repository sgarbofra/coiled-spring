#!/usr/bin/env python
"""
Test script to register a new user and verify welcome email + audience addition.
"""
import requests
import random

# Generate random email to avoid duplicates
random_suffix = random.randint(1000, 9999)
test_email = f"test_user_{random_suffix}@example.com"

print(f"\n{'='*80}")
print(f"TESTING USER REGISTRATION")
print(f"{'='*80}\n")
print(f"Test email: {test_email}")
print(f"Password: TestPassword123!\n")

# Register new user
print("[1/3] Registering new user...")
response = requests.post(
    "http://localhost:8001/api/auth/register",
    json={
        "email": test_email,
        "password": "TestPassword123!",
        "plan": "pro"
    }
)

print(f"Status code: {response.status_code}")

if response.status_code == 201:
    data = response.json()
    print(f"OK - Registration successful!")
    print(f"  User ID: {data.get('user', {}).get('id')}")
    print(f"  Email: {data.get('user', {}).get('email')}")
    print(f"  Plan: {data.get('user', {}).get('plan')}")
    print(f"\n[2/3] Welcome email should be sent to TEST_EMAIL (sgarbo.fra@gmail.com)")
    print(f"      Check your inbox!")
    print(f"\n[3/3] User should be added to Resend Audience")
    print(f"      Check: https://resend.com/audiences/f5828153-b4fd-46e5-afa1-574ba48ccd76")
    print(f"\nCheck the backend CMD for logs:")
    print(f"  - [RESEND] User ... added to audience")
else:
    print(f"ERROR - Registration failed!")
    print(f"Response: {response.text}")

print(f"\n{'='*80}\n")
