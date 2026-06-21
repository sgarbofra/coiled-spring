"""
Quick test for registration with email verification
"""
import requests
import time

BASE_URL = "http://localhost:8001"

print("=" * 60)
print("TESTING EMAIL VERIFICATION FLOW")
print("=" * 60)

# Generate unique email
timestamp = int(time.time())
test_email = f"test_{timestamp}@example.com"

print(f"\n1. Registering new user: {test_email}")
print("-" * 60)

register_data = {
    "email": test_email,
    "password": "testpass123",
    "plan": "pro"
}

try:
    response = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
    print(f"Status: {response.status_code}")

    if response.status_code == 201:
        print("✓ Registration successful!")
        data = response.json()
        print(f"  User ID: {data['user']['id']}")
        print(f"  Email: {data['user']['email']}")
        print(f"  Plan: {data['user']['plan']}")
    else:
        print(f"✗ Registration failed:")
        print(f"  {response.json()}")
        exit(1)

except Exception as e:
    print(f"✗ Error: {e}")
    exit(1)

# Check database
print(f"\n2. Checking database for user {test_email}")
print("-" * 60)

import sqlite3
conn = sqlite3.connect('coiled_spring.db')
cursor = conn.execute(
    "SELECT id, email_verified, verification_token FROM users WHERE email = ?",
    (test_email,)
)
row = cursor.fetchone()

if row:
    user_id, email_verified, verification_token = row
    print(f"✓ User found in database")
    print(f"  ID: {user_id}")
    print(f"  email_verified: {bool(email_verified)}")
    print(f"  verification_token: {verification_token[:30]}..." if verification_token else "  No token")

    # Try to login
    print(f"\n3. Attempting login (should fail - email not verified)")
    print("-" * 60)

    login_data = {
        "email": test_email,
        "password": "testpass123"
    }

    response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
    print(f"Status: {response.status_code}")

    if response.status_code == 403:
        detail = response.json().get('detail', '')
        print(f"✓ Login correctly blocked: {detail}")
    else:
        print(f"✗ Login should have been blocked!")
        print(f"  Response: {response.json()}")

conn.close()

print("\n" + "=" * 60)
print("TEST COMPLETED - Check backend logs for email sending details")
print("=" * 60)
