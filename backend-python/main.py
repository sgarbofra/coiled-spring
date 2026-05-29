from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import auth, watchlist_items, watchlists

import app.models  # noqa: F401 — registers all models with Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Creates tables that don't exist yet; safe to call on every startup
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Coiled Spring API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(watchlists.router, prefix="/api/watchlists", tags=["watchlists"])
app.include_router(watchlist_items.router, prefix="/api/watchlists", tags=["watchlist-items"])


@app.get("/health")
def health():
    return {"ok": True, "service": "coiled-spring-api"}
