"""
Test invio email con FRONTEND_URL configurabile
"""
import sys
sys.path.insert(0, '.')

from app.core.email_service import send_verification_email
from app.config import settings

print("=" * 70)
print("TEST EMAIL CON FRONTEND_URL")
print("=" * 70)
print()

print(f"FRONTEND_URL configurata: {settings.frontend_url}")
print()

test_token = "test-final-verification-token"
test_email = "francesco.sgarbossa@yahoo.com"

expected_link = f"{settings.frontend_url}/verify-email?token={test_token}"

print(f"Link che sarà incluso nell'email:")
print(f"  {expected_link}")
print()

print(f"Invio email a: {test_email}")
print()

result = send_verification_email(test_email, test_token)

print()
if result:
    print("=" * 70)
    print("SUCCESS - Email inviata!")
    print("=" * 70)
    print()
    print("Verifica nell'email ricevuta che il link punti a:")
    print(f"  {settings.frontend_url}/verify-email?token=...")
    print()
    print("In modalità SVILUPPO dovrebbe essere:")
    print("  http://localhost:3000/verify-email?token=...")
    print()
    print("In modalità PRODUZIONE dovrebbe essere:")
    print("  https://coiledspring.app/verify-email?token=...")
else:
    print("=" * 70)
    print("FAILED - Email non inviata")
    print("=" * 70)

print()
print("=" * 70)
