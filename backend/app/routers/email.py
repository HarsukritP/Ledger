"""Email integration endpoints — link Gmail/Outlook, scan for receipts."""
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from app.dependencies import get_current_user
from app.config import settings
from app.services.email_service import email_service

logger = logging.getLogger("ledger.email")

router = APIRouter(prefix="/email", tags=["email"])

BACKEND_CALLBACK = "/email/oauth-callback"


def _get_backend_base() -> str:
    import os
    public_domain = os.getenv("RAILWAY_PUBLIC_DOMAIN", "")
    if public_domain:
        return f"https://{public_domain}"
    return "http://localhost:8000"


def _get_redirect_uri() -> str:
    return f"{_get_backend_base()}{BACKEND_CALLBACK}"


@router.get("/accounts")
async def list_email_accounts(user=Depends(get_current_user)):
    db_id = user.get("db_id")
    if not db_id:
        raise HTTPException(status_code=400, detail="User not found")
    return {"accounts": email_service.get_email_accounts(db_id)}


@router.get("/auth-url")
async def get_auth_url(user=Depends(get_current_user)):
    """Get the Gmail OAuth consent URL for linking."""
    db_id = user.get("db_id")
    if not db_id:
        raise HTTPException(status_code=400, detail="User not found")
    if not settings.google_client_id:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")
    redirect_uri = _get_redirect_uri()
    url = email_service.get_gmail_auth_url(db_id, redirect_uri)
    return {"auth_url": url, "redirect_uri": redirect_uri}


@router.get("/oauth-callback")
async def oauth_callback(code: str = Query(...), state: str = Query("")):
    """Google redirects here after consent. Exchange code, then redirect user to frontend."""
    user_db_id = state
    if not user_db_id:
        logger.error("[EMAIL] OAuth callback missing state (user_db_id)")
        return RedirectResponse(f"{settings.frontend_url}/settings?email_error=missing_state")

    redirect_uri = _get_redirect_uri()
    try:
        result = await email_service.exchange_gmail_code(code, redirect_uri, user_db_id)
        email_addr = result.get("email", "")
        logger.info(f"[EMAIL] Linked {email_addr} for user {user_db_id}")
        return RedirectResponse(f"{settings.frontend_url}/settings?email_linked={email_addr}")
    except Exception as e:
        logger.error(f"[EMAIL] OAuth callback failed: {e}")
        return RedirectResponse(f"{settings.frontend_url}/settings?email_error={e}")


@router.post("/scan")
async def scan_emails(user=Depends(get_current_user)):
    """Scan linked email accounts for billing receipts."""
    db_id = user.get("db_id")
    if not db_id:
        raise HTTPException(status_code=400, detail="User not found")
    detected = await email_service.scan_for_receipts(db_id)
    return {"detected_charges": len(detected), "charges": detected}


@router.delete("/accounts/{account_id}")
async def unlink_email(account_id: str, user=Depends(get_current_user)):
    db_id = user.get("db_id")
    if not db_id:
        raise HTTPException(status_code=400, detail="User not found")
    email_service.delete_email_account(db_id, account_id)
    return {"status": "unlinked"}
