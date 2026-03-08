"""Web Push subscription management endpoints."""
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.dependencies import get_current_user
from app.config import settings
from app.services.supabase_client import get_supabase
from app.services.push_service import send_to_user

logger = logging.getLogger("ledger.push")
router = APIRouter(prefix="/push", tags=["push"])


class PushSubscription(BaseModel):
    endpoint: str
    p256dh: str
    auth: str


@router.get("/vapid-public-key")
async def get_vapid_public_key():
    """Return the VAPID public key so the client can subscribe."""
    if not settings.vapid_public_key:
        raise HTTPException(status_code=503, detail="Push notifications not configured")
    return {"publicKey": settings.vapid_public_key}


@router.post("/subscribe")
async def subscribe(sub: PushSubscription, user=Depends(get_current_user)):
    """Store a push subscription for the authenticated user."""
    user_id = user.get("db_id") or user.get("sub")
    sb = get_supabase()
    if not sb:
        raise HTTPException(status_code=503, detail="Database unavailable")

    try:
        # Upsert so re-subscribing the same endpoint just refreshes the keys.
        sb.table("push_subscriptions").upsert(
            {
                "user_id": user_id,
                "endpoint": sub.endpoint,
                "p256dh": sub.p256dh,
                "auth": sub.auth,
            },
            on_conflict="endpoint",
        ).execute()
    except Exception as e:
        logger.error(f"[PUSH] subscribe failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    logger.info(f"[PUSH] subscribed user={user_id}")
    return {"status": "subscribed"}


@router.delete("/subscribe")
async def unsubscribe(sub: PushSubscription, user=Depends(get_current_user)):
    """Remove a push subscription."""
    user_id = user.get("db_id") or user.get("sub")
    sb = get_supabase()
    if sb:
        try:
            sb.table("push_subscriptions").delete().eq(
                "endpoint", sub.endpoint
            ).eq("user_id", user_id).execute()
        except Exception as e:
            logger.warning(f"[PUSH] unsubscribe error: {e}")
    return {"status": "unsubscribed"}


@router.post("/test")
async def send_test(user=Depends(get_current_user)):
    """Send a test push notification to the current user."""
    user_id = user.get("db_id") or user.get("sub")
    sent = send_to_user(
        user_id,
        title="Ledger ✓",
        body="Push notifications are working!",
        data={"type": "test"},
    )
    return {"status": "ok", "sent": sent}
