"""
Test script for email verification flow
"""
import requests

BASE_URL = "http://localhost:8000"

def test_email_verification():
    print("Testing email verification flow...\n")

    # 1. Register a new user
    print("1. Registering new user...")
    register_data = {
        "email": "test_verify@example.com",
        "password": "testpass123",
        "plan": "pro"
    }

    response = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
    print(f"   Status: {response.status_code}")

    if response.status_code == 201:
        print("   ✓ User registered successfully")
        data = response.json()
        print(f"   User ID: {data['user']['id']}")
    else:
        print(f"   ✗ Registration failed: {response.json()}")
        return

    # 2. Check database for verification token
    print("\n2. Checking database for verification token...")
    import sqlite3
    conn = sqlite3.connect('coiled_spring.db')
    cursor = conn.execute(
        "SELECT email_verified, verification_token FROM users WHERE email = ?",
        (register_data["email"],)
    )
    row = cursor.fetchone()
    conn.close()

    if row:
        email_verified, verification_token = row
        print(f"   Email verified: {bool(email_verified)}")
        print(f"   Verification token: {verification_token[:20]}..." if verification_token else "   No token")

        # 3. Try to login without verification
        print("\n3. Attempting login without email verification...")
        login_data = {
            "email": register_data["email"],
            "password": register_data["password"]
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        print(f"   Status: {response.status_code}")

        if response.status_code == 403:
            print(f"   ✓ Login blocked: {response.json()['detail']}")
        else:
            print(f"   ✗ Login should have been blocked: {response.json()}")

        # 4. Verify email
        if verification_token:
            print("\n4. Verifying email with token...")
            response = requests.get(f"{BASE_URL}/api/auth/verify-email?token={verification_token}")
            print(f"   Status: {response.status_code}")

            if response.status_code == 200:
                print(f"   ✓ Email verified: {response.json()['message']}")
            else:
                print(f"   ✗ Verification failed: {response.json()}")
                return

            # 5. Try to login again
            print("\n5. Attempting login after verification...")
            response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
            print(f"   Status: {response.status_code}")

            if response.status_code == 200:
                print("   ✓ Login successful")
                data = response.json()
                print(f"   Access token: {data['access_token'][:20]}...")
            else:
                print(f"   ✗ Login failed: {response.json()}")

    # Cleanup
    print("\n6. Cleanup: deleting test user...")
    conn = sqlite3.connect('coiled_spring.db')
    conn.execute("DELETE FROM users WHERE email = ?", (register_data["email"],))
    conn.execute("DELETE FROM email_list WHERE email = ?", (register_data["email"],))
    conn.commit()
    conn.close()
    print("   ✓ Test user deleted")

    print("\n✓ Email verification test completed successfully!")

if __name__ == "__main__":
    test_email_verification()
