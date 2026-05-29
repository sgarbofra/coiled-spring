# Coiled Spring Strategy App

Watchlist & Portfolio module for a LEAPS options scanner focused on saved scans, watchlists, alerts, and IV monitoring.

## Project structure

```bash
coiled-spring/
├── frontend/
│   └── frontend-mvp-final.html
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   └── mock-db.js
│   │   ├── routes/
│   │   │   ├── scan-runs.js
│   │   │   ├── iv-curve.js
│   │   │   └── watchlists.js
│   │   └── services/
│   │       ├── scan-runs-service.js
│   │       ├── iv-curve-service.js
│   │       └── watchlist-service.js
│   │   └── index.js
│   └── package.json
├── database/
│   └── migrations/
│       └── 001_init_watchlist.sql
└── README.md
```

## What this module does

- Creates multiple watchlists.
- Renames and deletes watchlists.
- Selects the active watchlist.
- Adds selected options from scanner results.
- Removes selected options from a watchlist.
- Moves options between watchlists.
- Shows scanner results and the selected watchlist in the main UI.
- Displays IV curves for calls or puts depending on the selected option type.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Run the backend

```bash
npm start
```

The Express server starts from:

```bash
backend/src/index.js
```

### 3. Open the frontend

Open:

```bash
frontend/frontend-mvp-final.html
```

## API overview

### Watchlists

- `GET /api/watchlists`
- `POST /api/watchlists`
- `PATCH /api/watchlists/:watchlistId`
- `DELETE /api/watchlists/:watchlistId`
- `POST /api/watchlists/:watchlistId/activate`
- `GET /api/watchlists/:watchlistId/items`
- `POST /api/watchlists/:watchlistId/items/bulk-add`
- `DELETE /api/watchlists/:watchlistId/items/:itemId`
- `POST /api/watchlists/:watchlistId/items/move`
- `GET /api/watchlists/:watchlistId/summary`

### Scan runs

- `GET /api/scan-runs`
- `GET /api/scan-runs/:scanRunId`
- `POST /api/scan-runs`

### IV curve

- `GET /api/iv-curve?underlying=AAPL&type=call`
- `GET /api/iv-curve?underlying=AAPL&type=put`

## MVP notes

This version uses an in-memory mock DB for fast development.  
It is intended to be replaced later with PostgreSQL persistence and real market data integration.

## Next step

After the MVP is stable, the next backend step is replacing the mock DB with a real Postgres repository layer and connecting the scanner results to live option-chain data.