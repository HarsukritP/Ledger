"""Briefing endpoints — generate weekly briefing text + voice audio."""
import logging
import traceback
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from app.dependencies import get_current_user
from app.models import BriefingOut
from app.services.supabase_client import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/briefing", tags=["briefing"])

_audio_cache: dict[str, bytes] = {}


@router.post("/generate", response_model=BriefingOut)
async def generate_briefing(user=Depends(get_current_user)):
    """Generate a weekly briefing via the Backboard Council agent, with optional TTS audio."""
    from app.services.backboard_service import backboard_service
    from app.services.elevenlabs_service import elevenlabs_service

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

    audio_url = None
    if elevenlabs_service.is_configured and content:
        try:
            audio_bytes = await elevenlabs_service.generate_briefing_audio(content)
            if audio_bytes:
                _audio_cache[user_db_id] = audio_bytes
                audio_url = "/briefing/audio"
                logger.info(f"[BRIEFING] Audio generated: {len(audio_bytes)} bytes")
        except Exception as e:
            logger.warning(f"[BRIEFING] Audio generation failed (non-fatal): {e}")

    sb = get_supabase()
    if sb and user_db_id:
        try:
            sb.table("briefings").insert({
                "user_id": user_db_id,
                "type": "weekly",
                "content": content,
                "audio_url": audio_url,
            }).execute()
        except Exception as e:
            logger.warning(f"[BRIEFING] Could not persist briefing: {e}")

    return BriefingOut(
        id="briefing_latest",
        content=content,
        audio_url=audio_url,
        created_at=datetime.utcnow().isoformat() + "Z",
    )


@router.get("/audio")
async def get_audio(user=Depends(get_current_user)):
    """Stream the most recently generated briefing audio as MP3."""
    user_db_id = user.get("db_id", "")

    if user_db_id in _audio_cache:
        return Response(
            content=_audio_cache[user_db_id],
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=briefing.mp3"},
        )

    raise HTTPException(
        status_code=404,
        detail="No audio available. Generate a briefing first.",
    )
