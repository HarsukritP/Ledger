from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.models import ChatMessage, ChatResponse

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/message", response_model=ChatResponse)
async def send_message(body: ChatMessage, user=Depends(get_current_user)):
    """Send a message and get an agent response.
    Placeholder — will be replaced with Backboard integration."""
    return ChatResponse(
        id="resp_1",
        role="agent",
        agent="pulse",
        text=(
            "Based on your spending patterns and upcoming bills, I'd recommend "
            "holding off on any large purchases until after your paycheck lands "
            "on the 11th. Your emergency fund is at 72%, which is solid progress. "
            "Want me to run a scenario on that?"
        ),
    )


@router.get("/history", response_model=list[ChatResponse])
async def get_history(user=Depends(get_current_user)):
    return [
        ChatResponse(
            id="msg_1",
            role="agent",
            agent="pulse",
            text=(
                "Hey Harsukrit! I've been watching your cash flow. You have "
                "2 bills coming up this week totaling $115. Your balance might "
                "get tight on Tuesday — want me to suggest a fix?"
            ),
        )
    ]
