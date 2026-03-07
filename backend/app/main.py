import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import auth, plaid, dashboard, forecast, subscriptions, goals, chat, briefing, settings as settings_router

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


@app.get("/")
async def root():
    return {"name": "Ledger API", "version": "0.1.0", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
