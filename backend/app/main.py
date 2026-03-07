import os
import logging
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import (
    auth, plaid, dashboard, forecast, subscriptions,
    goals, chat, briefing, settings as settings_router,
)

# --- Structured logging: everything goes to stdout for Railway ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
    force=True,
)
logger = logging.getLogger("ledger")

app = FastAPI(title="Ledger API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(plaid.router)
app.include_router(dashboard.router)
app.include_router(forecast.router)
app.include_router(subscriptions.router)
app.include_router(goals.router)
app.include_router(chat.router)
app.include_router(briefing.router)
app.include_router(settings_router.router)


@app.on_event("startup")
async def startup_event():
    """Log configuration status on boot so we can immediately see what's missing."""
    logger.info("=" * 60)
    logger.info("LEDGER API STARTING")
    logger.info("=" * 60)

    checks = {
        "AUTH0_DOMAIN": bool(settings.auth0_domain),
        "AUTH0_CLIENT_ID": bool(settings.auth0_client_id),
        "SUPABASE_URL": bool(settings.supabase_url),
        "SUPABASE_SERVICE_ROLE_KEY": bool(settings.supabase_service_role_key),
        "BACKBOARD_API_KEY": bool(settings.backboard_api_key),
        "PLAID_CLIENT_ID": bool(settings.plaid_client_id),
        "PLAID_SECRET": bool(settings.plaid_secret),
        "ELEVENLABS_API_KEY": bool(settings.elevenlabs_api_key),
        "FRONTEND_URL": settings.frontend_url,
    }

    for name, status in checks.items():
        icon = "OK" if status else "MISSING"
        level = logging.INFO if status else logging.WARNING
        logger.log(level, f"  {name}: {icon}")

    missing = [k for k, v in checks.items() if not v]
    if missing:
        logger.warning(
            f"  >>> {len(missing)} env vars missing: {', '.join(missing)}. "
            f"Features depending on these WILL FAIL."
        )

    logger.info("=" * 60)


@app.get("/")
async def root():
    return {"name": "Ledger API", "version": "0.1.0", "status": "running"}


@app.get("/health")
async def health():
    """Health check that reports real configuration status."""
    return {
        "status": "healthy",
        "services": {
            "auth0": bool(settings.auth0_domain and settings.auth0_client_id),
            "supabase": bool(settings.supabase_url and settings.supabase_service_role_key),
            "backboard": bool(settings.backboard_api_key),
            "plaid": bool(settings.plaid_client_id and settings.plaid_secret),
            "elevenlabs": bool(settings.elevenlabs_api_key),
        },
    }
