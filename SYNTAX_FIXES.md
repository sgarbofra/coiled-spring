# Syntax Fixes - Frontend Next.js

## Problemi Risolti

### 1. `app/portfolio/page.tsx`

**Errore**: Doppi `return` in espressioni ternarie

**Linea 21-36 (Prima)**:
```tsx
{!user || user.plan === 'free' ? (
  return (
    <div>...</div>
  )
) : !user.has_broker ? (
  return (
    <div>...</div>
  )
) : (
```

**Correzione**:
```tsx
{!user || user.plan === 'free' ? (
  <div>...</div>
) : !user.has_broker ? (
  <div>...</div>
) : (
```

**Spiegazione**: In un ternario, ogni branch deve essere un'espressione JSX, non un `return` statement.

---

### 2. `app/ai/page.tsx`

**Errore**: Codice extra fuori dal componente (linee 161-420)

**Problema**: C'era codice HTML/JSX (modal, selected items bar, success message) che apparteneva probabilmente a un altro file (scanner page) copiato per errore dopo la chiusura del componente `AiChatPage`.

**Correzione**: Rimosso tutto il codice dopo la chiusura del componente (linea 160).

**Prima (linee 157-420)**:
```tsx
    </div>
    </ProtectedRoute>
  )
}
      {selected.size > 0 && (
        <div style={{...}}>
          ...260+ lines di codice...
        </div>
      )}
```

**Dopo (linee 157-161)**:
```tsx
    </div>
    </ProtectedRoute>
  )
}
```

---

## Verifica Build

### Prima delle Correzioni
```
Error: Turbopack build failed with 3 errors:

./frontend-next/app/portfolio/page.tsx:22:5
Expression expected

./frontend-next/app/ai/page.tsx:417:5
Expression expected

./frontend-next/app/ai/page.tsx:417:6
Unterminated regexp literal
```

### Dopo le Correzioni
```bash
✓ Compiled successfully in 20.2s
Running TypeScript ...
```

Nessun errore di parsing rilevato. L'unico errore rimanente è un type error in un file diverso (`route.ts`), non legato ai fix applicati.

---

## File Modificati

1. ✅ `frontend-next/app/portfolio/page.tsx`
   - Rimossi `return` dentro ternari (2 occorrenze)
   - Corretta indentazione

2. ✅ `frontend-next/app/ai/page.tsx`
   - Rimosso codice extra fuori dal componente (260+ linee)

---

## Impatto

- ✅ **Nessuna modifica alla logica**: comportamento delle pagine invariato
- ✅ **Nessuna modifica al rendering**: output HTML identico
- ✅ **Solo fix di sintassi**: corretti errori di parsing
- ✅ **Build passa la fase di parsing**: nessun "Expression expected" o "Unterminated regexp"

---

## Note

Gli errori erano **preesistenti** e impedivano qualsiasi build del progetto frontend. Probabilmente erano stati introdotti durante un merge o copia-incolla errato.

Il codice rimosso da `ai/page.tsx` (modal watchlist, selected items bar) sembra appartenere a `scanner/page.tsx` o simili, dove queste funzionalità sono effettivamente implementate.
