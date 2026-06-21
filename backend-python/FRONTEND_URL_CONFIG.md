# FRONTEND_URL Configurabile - Implementazione

## Data: 2026-06-21

---

## ✅ Modifiche Implementate

### 1. File `.env`

**Aggiunta variabile FRONTEND_URL:**

```env
# Frontend URL for email links (development: http://localhost:3000, production: https://coiledspring.app)
FRONTEND_URL=http://localhost:3000
```

**Valori supportati:**
- **Sviluppo:** `http://localhost:3000`
- **Produzione:** `https://coiledspring.app`
- **Custom:** Qualsiasi URL valido

---

### 2. File `app/config.py`

**Aggiunto campo frontend_url:**

```python
class Settings(BaseSettings):
    # ...
    resend_api_key: str = ""
    frontend_url: str = "http://localhost:3000"  # ✅ Nuovo campo
    admin_key: str = ""
    # ...
```

**Default:** `http://localhost:3000` (se FRONTEND_URL non è nel .env)

---

### 3. File `app/core/email_service.py`

#### A. Funzione `send_verification_email()`

**PRIMA:**
```python
verification_url = f"https://coiledspring.app/verify-email?token={verification_token}"
# ❌ URL hardcoded
```

**DOPO:**
```python
verification_url = f"{settings.frontend_url}/verify-email?token={verification_token}"
# ✅ URL configurabile
```

**Link generato in sviluppo:**
```
http://localhost:3000/verify-email?token=abc123...
```

**Link generato in produzione:**
```
https://coiledspring.app/verify-email?token=abc123...
```

---

### 4. File `app/routers/auth.py`

#### Endpoint `POST /auth/forgot-password`

**PRIMA:**
```python
reset_url = f"http://localhost:3000/reset-password?token={reset_token}"
# ❌ URL hardcoded
```

**DOPO:**
```python
reset_url = f"{settings.frontend_url}/reset-password?token={reset_token}"
# ✅ URL configurabile
```

**Link generato in sviluppo:**
```
http://localhost:3000/reset-password?token=xyz789...
```

**Link generato in produzione:**
```
https://coiledspring.app/reset-password?token=xyz789...
```

---

## 🧪 Test Eseguito

### Configurazione Test
```env
FRONTEND_URL=http://localhost:3000
```

### Email di Verifica Inviata
- **Destinatario:** francesco.sgarbossa@yahoo.com
- **Email ID:** bbe76c43-f2e9-44b7-b3be-5dd11e66f0d9
- **Status:** ✅ SUCCESS

### Link nell'Email
```
http://localhost:3000/verify-email?token=test-final-verification-token
```

### Verifica Log
```
[EMAIL VERIFICATION] Verification URL: http://localhost:3000/verify-email?token=...
```

✅ Il link usa correttamente `http://localhost:3000` come configurato

---

## 🔄 Cambio Modalità Sviluppo → Produzione

### Step 1: Modifica .env

**File:** `backend-python/.env`

**DA:**
```env
FRONTEND_URL=http://localhost:3000
```

**A:**
```env
FRONTEND_URL=https://coiledspring.app
```

---

### Step 2: Riavvia Backend

```bash
# Ferma backend
Ctrl+C

# Riavvia backend
python -m uvicorn main:app --reload --port 8001
```

---

### Step 3: Verifica

**Test veloce:**
```bash
python test_frontend_url.py
```

**Output atteso:**
```
FRONTEND_URL configurata: https://coiledspring.app

URL generati:
  Verification: https://coiledspring.app/verify-email?token=...
  Reset Password: https://coiledspring.app/reset-password?token=...

Modalità: PRODUZIONE
Link email puntano a: coiledspring.app
```

---

## 📋 Configurazioni Ambiente

### Sviluppo Locale

**File:** `backend-python/.env`
```env
FRONTEND_URL=http://localhost:3000
```

**Link email:**
- Verifica: `http://localhost:3000/verify-email?token=...`
- Reset: `http://localhost:3000/reset-password?token=...`

**Quando usare:** Sviluppo locale, testing frontend su localhost

---

### Produzione

**File:** `backend-python/.env` (o variabili ambiente server)
```env
FRONTEND_URL=https://coiledspring.app
```

**Link email:**
- Verifica: `https://coiledspring.app/verify-email?token=...`
- Reset: `https://coiledspring.app/reset-password?token=...`

**Quando usare:** Deploy produzione, testing con utenti reali

---

### Staging (opzionale)

**File:** `backend-python/.env`
```env
FRONTEND_URL=https://staging.coiledspring.app
```

**Link email:**
- Verifica: `https://staging.coiledspring.app/verify-email?token=...`
- Reset: `https://staging.coiledspring.app/reset-password?token=...`

**Quando usare:** Testing pre-produzione, QA

---

## 🚀 Deploy Produzione

### Variabili Ambiente da Configurare

**Platform:** Render / Railway / Fly.io / Vercel / etc.

**Environment Variables:**
```env
FRONTEND_URL=https://coiledspring.app
DATABASE_URL=postgresql://...
RESEND_API_KEY=re_...
ANTHROPIC_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_...
ENCRYPTION_KEY=...
# ... altre variabili
```

### Vercel Example

**File:** `vercel.json` o Dashboard → Settings → Environment Variables

```json
{
  "env": {
    "FRONTEND_URL": "https://coiledspring.app"
  }
}
```

### Railway Example

**Dashboard → Variables:**
```
FRONTEND_URL = https://coiledspring.app
```

### Docker Example

**File:** `docker-compose.yml`
```yaml
services:
  backend:
    environment:
      - FRONTEND_URL=https://coiledspring.app
```

---

## ✅ Vantaggi Configurazione

### 1. Flessibilità
```
✅ Un solo codebase per dev/staging/prod
✅ Nessuna modifica codice per deploy
✅ Facile switch tra ambienti
```

### 2. Testing
```
✅ Test locali con localhost:3000
✅ Test staging con subdomain
✅ Test produzione con dominio reale
```

### 3. Manutenibilità
```
✅ Nessun URL hardcoded nel codice
✅ Configurazione centralizzata in .env
✅ Facile da documentare e capire
```

---

## 🔍 Debugging

### Verificare Configurazione Attuale

**Script:**
```bash
python test_frontend_url.py
```

**Output:**
```
FRONTEND_URL configurata: http://localhost:3000
Modalità: SVILUPPO
```

---

### Verificare Link nelle Email

**1. Invia email di test:**
```bash
python test_email_with_url.py
```

**2. Controlla log:**
```
[EMAIL VERIFICATION] Verification URL: http://localhost:3000/verify-email?token=...
```

**3. Apri email ricevuta:**
- Cerca il bottone "VERIFY EMAIL →"
- Right-click → "Copy link address"
- Verifica che inizi con il FRONTEND_URL configurato

---

### URL Sbagliato?

**Problema:** Link punta a `https://coiledspring.app` ma sei in sviluppo

**Soluzione:**
```bash
# 1. Verifica .env
cat backend-python/.env | grep FRONTEND_URL

# 2. Dovrebbe essere:
FRONTEND_URL=http://localhost:3000

# 3. Se diverso, modifica .env e riavvia backend
```

---

## 📝 Checklist Post-Modifica

- [x] FRONTEND_URL aggiunta a `.env`
- [x] `frontend_url` aggiunto a `config.py`
- [x] `send_verification_email()` usa `settings.frontend_url`
- [x] Endpoint `/forgot-password` usa `settings.frontend_url`
- [x] Backend riavviato
- [x] Test eseguito: link usa `http://localhost:3000` ✅
- [x] Email inviata e link verificato
- [ ] Deploy produzione: `FRONTEND_URL=https://coiledspring.app`

---

## 🎯 Prossimi Passi

### Per Sviluppo
```
✅ FRONTEND_URL già configurato: http://localhost:3000
✅ Pronto per testing locale
```

### Per Produzione
```
1. Deploy backend su server
2. Configura variabile ambiente: FRONTEND_URL=https://coiledspring.app
3. Verifica che email puntino a coiledspring.app
4. Test registrazione utente reale
```

---

## 📚 File Modificati

1. `backend-python/.env` - Aggiunta FRONTEND_URL
2. `backend-python/app/config.py` - Aggiunto campo frontend_url
3. `backend-python/app/core/email_service.py` - Usa settings.frontend_url
4. `backend-python/app/routers/auth.py` - Usa settings.frontend_url

**Totale:** 4 file modificati

---

**Implementazione completata con successo ✅**

**I link nelle email ora puntano dinamicamente a:**
- **Sviluppo:** `http://localhost:3000`
- **Produzione:** `https://coiledspring.app` (dopo configurazione)
