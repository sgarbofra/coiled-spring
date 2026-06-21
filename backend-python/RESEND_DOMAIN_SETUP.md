# Resend - Problema Email Non Ricevute

## 🔴 PROBLEMA IDENTIFICATO

```
ResendError: You can only send testing emails to your own email address 
(sgarbo.fra@gmail.com). To send emails to other recipients, please verify 
a domain at resend.com/domains, and change the `from` address to an email 
using this domain.
```

---

## 📋 Situazione Attuale

### API Key Resend: Modalità TEST
- **Email mittente:** `onboarding@resend.dev` (dominio non verificato)
- **Destinatari permessi:** Solo `sgarbo.fra@gmail.com`
- **Email bloccate:** Tutti gli altri indirizzi (francesco.sgarbossa@yahoo.com, etc.)

### Registrazione francesco.sgarbossa@yahoo.com
✅ Utente creato nel database  
✅ Token di verifica generato  
❌ Email NON inviata (Resend ha bloccato l'invio)

---

## ✅ SOLUZIONE IMMEDIATA

### Link di Verifica Manuale
```
https://coiledspring.app/verify-email?token=rMJH_oeeB6F2Jb5HVts3XAylYRLlNj-08STZL8Es9fQ
```

**Istruzioni:**
1. Copia il link sopra
2. Incollalo nel browser
3. Premi Invio
4. Il tuo account verrà verificato
5. Potrai fare login

---

## 🔧 SOLUZIONE PERMANENTE

Per inviare email a qualsiasi utente, devi configurare un dominio verificato in Resend.

### Step 1: Accedi alla Dashboard Resend
```
https://resend.com/login
```

Credenziali: Usa l'account associato a `sgarbo.fra@gmail.com`

---

### Step 2: Aggiungi Dominio
```
Dashboard → Domains → Add Domain
```

**Dominio da aggiungere:** `coiledspring.app`

---

### Step 3: Configura DNS Records

Resend ti fornirà 3 record DNS da aggiungere al tuo provider DNS:

#### A. Record SPF
```
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all
```

#### B. Record DKIM
```
Type: TXT
Name: resend._domainkey
Value: [fornito da Resend - copia dalla dashboard]
```

#### C. Record DMARC (opzionale ma consigliato)
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@coiledspring.app
```

---

### Step 4: Verifica Dominio

Dopo aver configurato i DNS records:
1. Torna alla Dashboard Resend
2. Clicca "Verify Domain"
3. Resend controllerà i record DNS
4. Stato dovrebbe diventare "Verified" ✅

**Nota:** La propagazione DNS può richiedere da 5 minuti a 48 ore

---

### Step 5: Modifica Email Mittente nel Codice

**File:** `backend-python/app/core/email_service.py`

**PRIMA:**
```python
params = {
    "from": "Coiled Spring <onboarding@resend.dev>",  # ❌ Dominio non verificato
    "to": [to_email],
    # ...
}
```

**DOPO:**
```python
params = {
    "from": "Coiled Spring <noreply@coiledspring.app>",  # ✅ Dominio verificato
    "to": [to_email],
    # ...
}
```

**Modificare in 2 funzioni:**
1. `send_verification_email()`
2. `send_reset_email()`

---

### Step 6: Riavvia Backend e Testa

```bash
# Riavvia backend
python -m uvicorn main:app --reload --port 8001

# Registra nuovo utente
# Le email arriveranno a qualsiasi indirizzo
```

---

## 🔍 Come Configurare DNS Records

### Opzione A: Cloudflare (consigliato)
```
1. Login → cloudflare.com
2. Seleziona dominio: coiledspring.app
3. DNS → Add record
4. Inserisci i 3 record forniti da Resend
5. Salva
```

### Opzione B: Provider Registrar Dominio
```
1. Login al provider dove hai comprato il dominio
2. Pannello DNS Management
3. Aggiungi i 3 record TXT
4. Salva modifiche
```

### Opzione C: Vercel (se usi Vercel per hosting)
```
1. Dashboard Vercel
2. Progetto → Settings → Domains
3. Configure DNS
4. Aggiungi i record
```

---

## 📊 Verifica Configurazione DNS

### Online Tool
```
https://mxtoolbox.com/SuperTool.aspx

Cerca:
- SPF: coiledspring.app
- DKIM: resend._domainkey.coiledspring.app
- DMARC: _dmarc.coiledspring.app
```

### Command Line
```bash
# SPF
dig TXT coiledspring.app

# DKIM
dig TXT resend._domainkey.coiledspring.app

# DMARC
dig TXT _dmarc.coiledspring.app
```

---

## ⚠️ WORKAROUND TEMPORANEO (Solo per Testing)

Se non puoi configurare il dominio subito, puoi testare reimpostando `TEST_EMAIL`:

**File:** `backend-python/.env`
```env
# Aggiungi questa riga
TEST_EMAIL=sgarbo.fra@gmail.com
```

**File:** `backend-python/app/config.py`
```python
class Settings(BaseSettings):
    # ...
    test_email: str = ""  # Aggiungi questa riga
```

**File:** `backend-python/app/core/email_service.py`
```python
def send_verification_email(to_email: str, verification_token: str) -> bool:
    resend.api_key = settings.resend_api_key

    # Aggiungi redirect per testing
    to_email_actual = settings.test_email if settings.test_email else to_email

    params = {
        "from": "Coiled Spring <onboarding@resend.dev>",
        "to": [to_email_actual],  # Usa to_email_actual
        # ...
    }
```

**IMPORTANTE:** Questo è SOLO per testing. Gli utenti reali NON riceveranno email.

---

## 📝 Checklist Configurazione Dominio

- [ ] Account Resend creato
- [ ] Dominio `coiledspring.app` aggiunto in Resend
- [ ] Record SPF configurato nel DNS
- [ ] Record DKIM configurato nel DNS
- [ ] Record DMARC configurato nel DNS (opzionale)
- [ ] Dominio verificato in Resend (status: Verified)
- [ ] Email mittente cambiata a `noreply@coiledspring.app` nel codice
- [ ] Backend riavviato
- [ ] Test registrazione con email esterna funzionante

---

## 🎯 Dopo la Configurazione

### Email Funzionanti
✅ Registrazione: email a qualsiasi indirizzo  
✅ Verifica account: email a qualsiasi indirizzo  
✅ Reset password: email a qualsiasi indirizzo  
✅ Notifiche: email a qualsiasi indirizzo

### Metriche Resend
- Dashboard: visualizza tutte le email inviate
- Analytics: tasso di apertura, click, bounce
- Logs: debugging delivery issues

---

## 📚 Risorse

- **Resend Dashboard:** https://resend.com/overview
- **Docs Domains:** https://resend.com/docs/dashboard/domains/introduction
- **Docs DNS Setup:** https://resend.com/docs/dashboard/domains/dns-providers
- **Email Testing:** https://resend.com/docs/send-with-nodejs

---

## 🆘 Problemi Comuni

### "Domain not verified after 48h"
- Controlla che i DNS records siano esatti
- Usa MXToolbox per verificare i record
- Prova a rimuovere e ri-aggiungere il dominio

### "Email finisce in spam"
- Assicurati che SPF, DKIM, DMARC siano configurati
- Evita parole spam nell'oggetto/corpo email
- Riscalda il dominio inviando poche email inizialmente

### "DKIM verification failed"
- Il record DKIM è case-sensitive
- Copia-incolla esattamente come fornito da Resend
- Non aggiungere spazi o virgolette extra

---

**Priorità:** Configurare dominio verificato è ESSENZIALE per produzione.

**Tempo stimato:** 30-60 minuti (+ propagazione DNS: 5min - 48h)
