"""
Test diretto invio email con Resend
"""
import sys
sys.path.insert(0, '.')

from app.config import settings
import resend

print("=" * 70)
print("TEST INVIO EMAIL RESEND")
print("=" * 70)
print()

print(f"API Key configurata: {'SI' if settings.resend_api_key else 'NO'}")
if settings.resend_api_key:
    print(f"API Key: {settings.resend_api_key[:10]}...")
print()

if not settings.resend_api_key:
    print("ERRORE: API Key non configurata!")
    sys.exit(1)

resend.api_key = settings.resend_api_key

# Test invio
test_email = "francesco.sgarbossa@yahoo.com"

print(f"Invio email di test a: {test_email}")
print()

try:
    params = {
        "from": "Coiled Spring <onboarding@resend.dev>",
        "to": [test_email],
        "subject": "Test Email - Verifica Ricezione",
        "html": """
        <h2>Email di Test - Coiled Spring</h2>
        <p>Se ricevi questa email, Resend funziona correttamente.</p>
        <p>Il tuo account è stato registrato con successo.</p>
        """
    }

    print("Chiamata resend.Emails.send()...")
    response = resend.Emails.send(params)

    print()
    print("=" * 70)
    print("SUCCESSO!")
    print("=" * 70)
    print()
    print(f"Response: {response}")
    print()

    if isinstance(response, dict):
        if 'id' in response:
            print(f"Email ID: {response['id']}")
        if 'http_headers' in response:
            headers = response['http_headers']
            print(f"Rate limit remaining: {headers.get('ratelimit-remaining', 'N/A')}")
            print(f"Daily quota: {headers.get('x-resend-daily-quota', 'N/A')}")

    print()
    print("Controlla:")
    print(f"  1. Inbox: {test_email}")
    print("  2. Cartella SPAM")
    print("  3. Dashboard Resend: https://resend.com/emails")

except Exception as e:
    print()
    print("=" * 70)
    print("ERRORE!")
    print("=" * 70)
    print()
    print(f"Tipo: {type(e).__name__}")
    print(f"Messaggio: {str(e)}")
    print()

    import traceback
    traceback.print_exc()

print()
print("=" * 70)
