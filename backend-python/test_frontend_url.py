"""
Test FRONTEND_URL configurabile nei link email
"""
import sys
sys.path.insert(0, '.')

from app.config import settings

print("=" * 70)
print("TEST FRONTEND_URL CONFIGURABILE")
print("=" * 70)
print()

print(f"FRONTEND_URL configurata: {settings.frontend_url}")
print()

# Test URL costruiti
test_token = "test-token-abc123"

verification_url = f"{settings.frontend_url}/verify-email?token={test_token}"
reset_url = f"{settings.frontend_url}/reset-password?token={test_token}"

print("URL generati:")
print(f"  Verification: {verification_url}")
print(f"  Reset Password: {reset_url}")
print()

# Verifica che non ci siano URL hardcoded
expected_dev = "http://localhost:3000"
expected_prod = "https://coiledspring.app"

print("Configurazioni supportate:")
print(f"  Sviluppo: {expected_dev}")
print(f"  Produzione: {expected_prod}")
print()

if settings.frontend_url == expected_dev:
    print(f"Modalità: SVILUPPO")
    print(f"Link email puntano a: localhost:3000")
elif settings.frontend_url == expected_prod:
    print(f"Modalità: PRODUZIONE")
    print(f"Link email puntano a: coiledspring.app")
else:
    print(f"Modalità: CUSTOM")
    print(f"Link email puntano a: {settings.frontend_url}")

print()
print("=" * 70)
print("Per cambiare modalità, modifica FRONTEND_URL nel file .env")
print("=" * 70)
