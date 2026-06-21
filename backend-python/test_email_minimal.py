#!/usr/bin/env python
"""
Test Resend con HTML minimo per verificare se il problema è nel template complesso.
"""
import sys
sys.path.insert(0, '.')

import resend
from app.config import settings

resend.api_key = settings.resend_api_key

print("="*80)
print("TEST EMAIL MINIMO")
print("="*80)
print()

# HTML super semplice
html_minimal = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; padding: 20px;">
    <h1 style="color: #FF6600;">Test Email</h1>
    <p>Se vedi questo messaggio, Resend funziona correttamente.</p>
    <p>Il problema è nel template HTML complesso.</p>
    <img src="https://coiledspring.app/logo.png" alt="Logo" style="max-width: 120px;" />
    <hr>
    <p style="font-size: 12px; color: #666;">Test inviato da Coiled Spring Backend</p>
</body>
</html>
"""

try:
    print("Invio email con HTML minimo...")
    print(f"  To: {settings.test_email or 'sgarbo.fra@gmail.com'}")
    print(f"  Subject: Test Minimo Resend")
    print()

    params = {
        "from": "Coiled Spring <noreply@coiledspring.app>",
        "to": [settings.test_email or "sgarbo.fra@gmail.com"],
        "subject": "Test Minimo Resend — HTML Semplice",
        "html": html_minimal,
    }

    response = resend.Emails.send(params)

    print("OK - Email inviata!")
    print(f"Response: {response}")
    print()
    print("Controlla la tua inbox:")
    print("  - Se ARRIVA → il problema è nel template complesso")
    print("  - Se NON ARRIVA → il problema è nella chiamata Resend")

except Exception as e:
    print(f"ERROR - Invio fallito: {e}")
    import traceback
    traceback.print_exc()

print()
print("="*80)
