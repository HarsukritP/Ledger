from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.models import BriefingOut

router = APIRouter(prefix="/briefing", tags=["briefing"])

MOCK_BRIEFING_TEXT = (
    "Hey Harsukrit, here's your week ahead. Your paycheck lands Wednesday, "
    "but before that, your phone bill and gym membership come out totaling $115. "
    "Your balance will dip to around $380 on Tuesday — you might want to hold off "
    "on dining out until Wednesday. On the bright side, you're on pace for your "
    "emergency fund goal, and Audit found a news subscription you barely use "
    "that's costing $13 a month. Check your action queue to handle it. Have a good week."
)


@router.post("/generate", response_model=BriefingOut)
async def generate_briefing(user=Depends(get_current_user)):
    """Generate a weekly briefing. Will use Backboard + ElevenLabs when keys are provided."""
    return BriefingOut(
        id="briefing_1",
        content=MOCK_BRIEFING_TEXT,
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
