"""Email integration endpoints — link Gmail/Outlook, scan for receipts."""
import logging
from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_current_user
from app.config import settings
from app.services.email_service import email_service

logger = logging.getLogger("ledger.email")

router = APIRouter(prefix="/email", tags=["email"])


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
    redirect_uri = f"{settings.frontend_url}/connect/email"
    url = email_service.get_gmail_auth_url(db_id, redirect_uri)
    return {"auth_url": url, "redirect_uri": redirect_uri}


@router.post("/callback")
async def email_oauth_callback(code: str, user=Depends(get_current_user)):
    """Exchange the OAuth code and link the email account."""
    db_id = user.get("db_id")
    if not db_id:
        raise HTTPException(status_code=400, detail="User not found")
    redirect_uri = f"{settings.frontend_url}/connect/email"
    try:
        result = await email_service.exchange_gmail_code(code, redirect_uri, db_id)
        return {"status": "linked", **result}
    except Exception as e:
        logger.error(f"Email OAuth callback failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


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
