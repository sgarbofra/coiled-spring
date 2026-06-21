"""
Test invio email con nuovo mittente noreply@coiledspring.app
"""
import sys
sys.path.insert(0, '.')

from app.core.email_service import send_verification_email

print("=" * 70)
print("TEST INVIO EMAIL - NUOVO MITTENTE")
print("=" * 70)
print()
print("Mittente: Coiled Spring <noreply@coiledspring.app>")
print("Destinatario: francesco.sgarbossa@yahoo.com")
print()

test_token = "test-token-12345"
test_email = "francesco.sgarbossa@yahoo.com"

print("Invio email di verifica...")
print()

result = send_verification_email(test_email, test_token)

print()
print("=" * 70)
if result:
    print("SUCCESSO!")
    print("=" * 70)
    print()
    print("Email inviata con successo!")
    print()
    print("Controlla:")
    print("  1. Inbox: francesco.sgarbossa@yahoo.com")
    print("  2. Cartella SPAM se non in inbox")
    print("  3. Dashboard Resend per conferma delivery")
else:
    print("ERRORE!")
    print("=" * 70)
    print()
    print("Email NON inviata. Controlla i log sopra per dettagli.")
print()
print("=" * 70)
