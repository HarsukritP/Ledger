from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.models import BriefingOut

router = APIRouter(prefix="/briefing", tags=["briefing"])


@router.post("/generate", response_model=BriefingOut)
async def generate_briefing(user=Depends(get_current_user)):
    """Generate a weekly briefing via the Backboard Council agent."""
    from app.services.backboard_service import backboard_service

    content = await backboard_service.generate_briefing(
        user_sub=user.get("sub", ""),
        user_name=user.get("name", ""),
    )

    return BriefingOut(
        id="briefing_latest",
        content=content,
        audio_url=None,
        created_at="2026-03-07T12:00:00Z",
    )


@router.get("/audio")
async def get_audio(user=Depends(get_current_user)):
    """Get or generate voice briefing audio. ElevenLabs integration pending."""
    return {
        "status": "pending",
        "message": "ElevenLabs integration not yet configured. Provide ELEVENLABS_API_KEY.",
    }
