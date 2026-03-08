import logging
import traceback
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_current_user
from app.models import BriefingOut

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/briefing", tags=["briefing"])


@router.post("/generate", response_model=BriefingOut)
async def generate_briefing(user=Depends(get_current_user)):
    """Generate a weekly briefing via the Backboard Council agent."""
    from app.services.backboard_service import backboard_service

    user_sub = user.get("sub", "")
    user_name = user.get("name", "")
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

    return BriefingOut(
        id="briefing_latest",
        content=content,
        audio_url=None,
        created_at=datetime.utcnow().isoformat() + "Z",
    )


@router.get("/audio")
async def get_audio(user=Depends(get_current_user)):
    raise HTTPException(
        status_code=501,
        detail="ElevenLabs not configured. Set ELEVENLABS_API_KEY.",
    )
