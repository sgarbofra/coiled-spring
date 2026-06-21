# AI Chat Authentication Fix

## Problema
Il bottone "COILED AI" e la chat panel apparivano anche sulla pagina `/login` dove l'utente non è autenticato, creando confusione UX.

## Soluzione Implementata

### File Modificato
`frontend-next/components/AiChatPanel.tsx`

### Modifiche Applicate

#### 1. Import Aggiuntivi
```tsx
import { usePathname, useRouter } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'
```

#### 2. Hook e Stato
```tsx
export default function AiChatPanel() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useUser()
  
  // ... altri hook esistenti ...
  
  // Hide AI panel on login/register pages or when user is not authenticated
  const shouldHide = pathname === '/login' || pathname === '/register' || !user
```

#### 3. Check Autenticazione in `handleOpenAi`
```tsx
const handleOpenAi = () => {
  // Redirect to login if not authenticated
  if (!user) {
    router.push('/login')
    return
  }

  // Check se disclaimer già accettato
  const accepted = localStorage.getItem('coiled_ai_disclaimer_accepted')
  if (accepted === 'true') {
    setState('panel')
  } else {
    setShowDisclaimer(true)
  }
}
```

#### 4. Early Return per Nascondere Componente
```tsx
// Don't render anything if on login/register page or not authenticated
if (shouldHide) {
  return null
}
```

## Comportamento

### Prima
- ✗ Bottone "COILED AI" visibile su `/login` e `/register`
- ✗ Utenti non autenticati potevano tentare di aprire la chat
- ✗ Nessuna protezione contro accesso non autorizzato

### Dopo
- ✓ Bottone completamente nascosto su `/login` e `/register`
- ✓ Bottone nascosto quando `user === null` (non autenticato)
- ✓ Se utente non loggato clicca (caso edge), viene reindirizzato a `/login`
- ✓ Chat panel non renderizzata affatto quando condizioni non soddisfatte

## Condizioni di Visibilità

Il componente `AiChatPanel` viene completamente nascosto quando:

1. **Pathname è `/login`** → nascosto
2. **Pathname è `/register`** → nascosto
3. **User è `null`** (non autenticato) → nascosto

In tutti gli altri casi (utente autenticato, su pagine protette):
- ✓ Bottone visibile
- ✓ Chat utilizzabile normalmente

## Test Manuale

### Scenario 1: Pagina Login
1. Navigare a `/login`
2. ✓ Verificare che bottone "COILED AI" NON sia visibile
3. ✓ Verificare che chat panel NON sia renderizzato

### Scenario 2: Pagina Register
1. Navigare a `/register`
2. ✓ Verificare che bottone "COILED AI" NON sia visibile
3. ✓ Verificare che chat panel NON sia renderizzato

### Scenario 3: Utente Autenticato
1. Login effettuato
2. Navigare a `/watchlists` o altra pagina protetta
3. ✓ Verificare che bottone "COILED AI" sia visibile
4. ✓ Click su bottone apre chat normalmente

### Scenario 4: Cookie Scaduto / Logout
1. Cookie `cs_token` scaduto o rimosso
2. ✓ Bottone "COILED AI" scompare automaticamente
3. ✓ Chat panel non renderizzato

## Note Tecniche

- **UserContext**: Usa `useUser()` hook che automaticamente fetcha `/api/auth/me` e tiene traccia dello stato utente
- **Reactive**: Il componente si aggiorna automaticamente quando:
  - `pathname` cambia (navigation)
  - `user` cambia (login/logout)
- **Performance**: `return null` evita rendering inutile su pagine pubbliche

## Nessun Impatto Su
- ✓ Funzionalità esistenti della chat
- ✓ Disclaimer modal
- ✓ Scanner integration
- ✓ Streaming AI responses
- ✓ Layout globale
- ✓ Altre pagine protette

## File NON Modificati
- `frontend-next/app/layout.tsx` (AiChatPanel ancora presente, ma si nasconde da solo)
- `frontend-next/contexts/UserContext.tsx`
- `frontend-next/contexts/AiPanelContext.tsx`
- Nessun altro componente

---

✅ **Implementazione completata senza side effects**
