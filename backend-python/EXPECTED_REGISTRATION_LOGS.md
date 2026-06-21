# Log Attesi Durante la Registrazione

## Registrazione eseguita: logtest@coiledspring.app

Quando viene eseguita una registrazione, il backend dovrebbe produrre i seguenti log dettagliati:

---

```
[REGISTRATION] ========== EMAIL VERIFICATION START ==========
[REGISTRATION] User registered: logtest@coiledspring.app (ID: 1)
[REGISTRATION] email_verified: False
[REGISTRATION] verification_token: _c04TIF8dk_0D7lLib37r...
[REGISTRATION] 
[REGISTRATION] BEFORE send_verification_email():
[REGISTRATION]   - Destinatario email: logtest@coiledspring.app
[REGISTRATION]   - Verification token: _c04TIF8dk_0D7lLib37rRGiMeFWUFcbvWuOHZbynuk
[REGISTRATION]   - About to call send_verification_email()...
[REGISTRATION] 

[EMAIL VERIFICATION] ========================================
[EMAIL VERIFICATION] SENDING EMAIL:
[EMAIL VERIFICATION]   Original recipient: logtest@coiledspring.app
[EMAIL VERIFICATION]   Actual recipient (TEST_EMAIL redirect): sgarbo.fra@gmail.com
[EMAIL VERIFICATION]   Resend API key configured: Yes
[EMAIL VERIFICATION]   API key (first 10 chars): re_H5JpJQj...
[EMAIL VERIFICATION]   Verification URL: https://coiledspring.app/verify-email?token=_c04TIF8dk_0D7lLib37rRGiMeFWUFcbvWuOHZbynuk
[EMAIL VERIFICATION]   Calling resend.Emails.send()...
[EMAIL VERIFICATION] 
[EMAIL VERIFICATION] RESEND RESPONSE:
[EMAIL VERIFICATION]   Status: SUCCESS
[EMAIL VERIFICATION]   Response type: <class 'dict'>
[EMAIL VERIFICATION]   Response data: {'id': '73eccd1f-0b89-4f91-a466-d18a63b22095', 'http_headers': {'Date': 'Sun, 21 Jun 2026 10:41:45 GMT', 'Content-Type': 'application/json', 'Content-Length': '45', 'Connection': 'keep-alive', 'ratelimit-limit': '5', 'ratelimit-policy': '5;w=1', 'ratelimit-remaining': '4', 'ratelimit-reset': '1', 'x-resend-daily-quota': '9', 'x-resend-monthly-quota': '91', 'cf-cache-status': 'DYNAMIC', 'Server': 'cloudflare', 'CF-RAY': 'a0f2671348d1ee6c-MXP'}}
[EMAIL VERIFICATION]   Email ID: 73eccd1f-0b89-4f91-a466-d18a63b22095
[EMAIL VERIFICATION]   Rate limit remaining: 4
[EMAIL VERIFICATION]   Daily quota: 9
[EMAIL VERIFICATION] ========================================

[REGISTRATION] 
[REGISTRATION] AFTER send_verification_email():
[REGISTRATION]   - Function returned: True
[REGISTRATION]   - Type: <class 'bool'>
[REGISTRATION]   - Status: SUCCESS
[REGISTRATION]   - Verification email sent to: logtest@coiledspring.app
[REGISTRATION] ========== EMAIL VERIFICATION END ==========
[REGISTRATION] 

[REGISTRATION] Admin notification scheduled
```

---

## Informazioni Chiave nei Log

### 1. Email Destinataria
```
[EMAIL VERIFICATION]   Original recipient: logtest@coiledspring.app
[EMAIL VERIFICATION]   Actual recipient (TEST_EMAIL redirect): sgarbo.fra@gmail.com
```
- **Original recipient:** L'email inserita dall'utente in fase di registrazione
- **Actual recipient:** L'email effettiva a cui viene inviata (redirect per testing)

### 2. Token di Verifica
```
[REGISTRATION]   - Verification token: _c04TIF8dk_0D7lLib37rRGiMeFWUFcbvWuOHZbynuk
[EMAIL VERIFICATION]   Verification URL: https://coiledspring.app/verify-email?token=...
```
- Token UUID generato per la verifica
- URL completo inviato nell'email

### 3. Resend API Response
```
[EMAIL VERIFICATION]   Response data: {'id': '73eccd1f-...', 'http_headers': {...}}
[EMAIL VERIFICATION]   Email ID: 73eccd1f-0b89-4f91-a466-d18a63b22095
[EMAIL VERIFICATION]   Rate limit remaining: 4
[EMAIL VERIFICATION]   Daily quota: 9
```
- **Email ID:** Identificativo univoco dell'email inviata da Resend
- **Rate limit:** Quante richieste rimangono disponibili
- **Daily quota:** Quante email sono state inviate oggi

### 4. Esito Finale
```
[REGISTRATION]   - Function returned: True
[REGISTRATION]   - Status: SUCCESS
```
- `True` = Email inviata con successo
- `False` = Invio fallito (vedi sezione errori)

---

## Log in Caso di Errore

Se l'invio email fallisce, i log dovrebbero mostrare:

```
[EMAIL VERIFICATION] 
[EMAIL VERIFICATION] RESEND ERROR:
[EMAIL VERIFICATION]   Status: FAILED
[EMAIL VERIFICATION]   Recipient was: sgarbo.fra@gmail.com
[EMAIL VERIFICATION]   Error type: APIError
[EMAIL VERIFICATION]   Error message: Invalid API key
[EMAIL VERIFICATION]   Full stack trace:
Traceback (most recent call last):
  File "app/core/email_service.py", line 122, in send_verification_email
    response = resend.Emails.send(params)
  ...
[EMAIL VERIFICATION] ========================================

[REGISTRATION] 
[REGISTRATION] AFTER send_verification_email():
[REGISTRATION]   - Function returned: False
[REGISTRATION]   - Type: <class 'bool'>
[REGISTRATION]   - Status: FAILED
[REGISTRATION]   - WARNING: send_verification_email() returned False
```

---

## Cosa Controllare nei Log

### ✓ Verifiche di Successo
- [ ] `[REGISTRATION] User registered: <email>` → Email corretta?
- [ ] `[EMAIL VERIFICATION] Actual recipient:` → Email di destinazione corretta?
- [ ] `[EMAIL VERIFICATION] Resend API key configured: Yes` → API key presente?
- [ ] `[EMAIL VERIFICATION] Calling resend.Emails.send()...` → Chiamata Resend eseguita?
- [ ] `[EMAIL VERIFICATION] Status: SUCCESS` → Resend ha accettato la richiesta?
- [ ] `[EMAIL VERIFICATION] Email ID:` → ID email presente?
- [ ] `[REGISTRATION] Function returned: True` → Funzione completata con successo?

### ✗ Segnali di Problema
- [ ] `[EMAIL VERIFICATION] Status: FAILED` → Errore nell'invio
- [ ] `[EMAIL VERIFICATION] Error type:` → Tipo di errore (APIError, NetworkError, etc.)
- [ ] `[REGISTRATION] Function returned: False` → Invio fallito
- [ ] `[EMAIL VERIFICATION] Resend API key configured: No` → API key mancante
- [ ] Stack trace presente → Eccezione durante l'invio

---

## Verifica nel Database

Dopo la registrazione, verifica nel database:

```sql
SELECT email, email_verified, verification_token 
FROM users 
WHERE email = 'logtest@coiledspring.app';
```

Risultato atteso:
```
email: logtest@coiledspring.app
email_verified: 0 (False)
verification_token: _c04TIF8dk_0D7lLib37rRGiMeFWUFcbvWuOHZbynuk
```

---

## Prossimi Passi

1. **Controllare finestra backend** per vedere i log effettivi
2. **Verificare casella email** (sgarbo.fra@gmail.com) per l'email di verifica
3. **Cliccare link** nell'email per verificare l'account
4. **Controllare database** per confermare `email_verified = True` dopo la verifica
5. **Testare login** per confermare che funzioni dopo la verifica

---

## File Modificati

- `backend-python/app/routers/auth.py` → Logging dettagliato registrazione
- `backend-python/app/core/email_service.py` → Logging dettagliato Resend

Tutti i log sono prefissati con `[REGISTRATION]` o `[EMAIL VERIFICATION]` per facile filtering.
