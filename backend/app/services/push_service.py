"""Web Push notification service using pywebpush + VAPID."""
import json
import logging
from typing import Optional
from pywebpush import webpush, WebPushException
from app.config import settings
from app.services.supabase_client import get_supabase

logger = logging.getLogger("ledger.push")


def _send_one(subscription: dict, title: str, body: str, data: Optional[dict] = None) -> bool:
    """Send a single push notification. Returns True on success."""
    if not settings.vapid_private_key or not settings.vapid_public_key:
        logger.warning("[PUSH] VAPID keys not configured — skipping")
        return False

    payload = json.dumps({"title": title, "body": body, "data": data or {}})
    try:
        webpush(
            subscription_info={
                "endpoint": subscription["endpoint"],
                "keys": {
                    "p256dh": subscription["p256dh"],
                    "auth": subscription["auth"],
                },
            },
            data=payload,
            vapid_private_key=settings.vapid_private_key,
            vapid_claims={
                "sub": settings.vapid_email,
            },
        )
        return True
    except WebPushException as e:
        status = e.response.status_code if e.response is not None else "unknown"
        logger.warning(f"[PUSH] delivery failed (HTTP {status}): {e}")
        # 404/410 means the subscription is expired — clean it up
        if e.response is not None and e.response.status_code in (404, 410):
            sb = get_supabase()
            if sb:
                sb.table("push_subscriptions").delete().eq(
                    "endpoint", subscription["endpoint"]
                ).execute()
        return False
    except Exception as e:
        logger.error(f"[PUSH] unexpected error: {e}")
        return False


def send_to_user(user_id: str, title: str, body: str, data: Optional[dict] = None) -> int:
    """Send a push notification to all subscriptions for a user. Returns count sent."""
    sb = get_supabase()
    if not sb:
        return 0
    try:
        rows = (
            sb.table("push_subscriptions")
            .select("endpoint, p256dh, auth")
            .eq("user_id", user_id)
            .execute()
            .data or []
        )
    except Exception as e:
        logger.error(f"[PUSH] could not fetch subscriptions: {e}")
        return 0

    sent = sum(_send_one(row, title, body, data) for row in rows)
    logger.info(f"[PUSH] sent {sent}/{len(rows)} to user={user_id}: {title}")
    return sent
