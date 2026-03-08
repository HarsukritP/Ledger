"""Briefing endpoints — generate weekly briefing text via AI agents."""
import logging
import traceback
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_current_user
from app.models import BriefingOut
from app.services.supabase_client import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/briefing", tags=["briefing"])


@router.post("/generate", response_model=BriefingOut)
async def generate_briefing(user=Depends(get_current_user)):
    """Generate a weekly briefing via the Backboard Council agent."""
    from app.services.backboard_service import backboard_service

    user_sub = user.get("sub", "")
    user_name = user.get("name", "")
    user_db_id = user.get("db_id", "")
    logger.info(f"[BRIEFING] generating for user={user_sub}")

    try:
        content = await backboard_service.generate_briefing(
            user_sub=user_sub,
            user_name=user_name,
        )
    except Exception as e:
        logger.error(
            f"[BRIEFING] FAILED for user={user_sub}: {e}\n"
            f"{traceback.format_exc()}"
        )
        raise HTTPException(
            status_code=500,
            detail=f"Briefing generation failed: {str(e)}",
        )

    sb = get_supabase()
    if sb and user_db_id:
        try:
            sb.table("briefings").insert({
                "user_id": user_db_id,
                "type": "weekly",
                "content": content,
            }).execute()
        except Exception as e:
            logger.warning(f"[BRIEFING] Could not persist briefing: {e}")

    # Fire-and-forget push notification — don't let push failure break the response.
    try:
        from app.services.push_service import send_to_user
        send_to_user(
            user_db_id or user_sub,
            title="Your Ledger briefing is ready",
            body=content[:80] + ("…" if len(content) > 80 else ""),
            data={"type": "briefing"},
        )
    except Exception:
        pass

    return BriefingOut(
        id="briefing_latest",
        content=content,
        audio_url=None,
        created_at=datetime.utcnow().isoformat() + "Z",
    )
