import uuid
from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.models import ChatMessage, ChatResponse

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/message", response_model=ChatResponse)
async def send_message(body: ChatMessage, user=Depends(get_current_user)):
    """Send a message to the Ledger agent team via Backboard Council."""
    from app.agents.orchestrator import orchestrator

    result = await orchestrator.route_chat(
        user_sub=user.get("sub", ""),
        message=body.message,
        user_name=user.get("name", ""),
    )

    return ChatResponse(
        id=f"resp_{uuid.uuid4().hex[:8]}",
        role="agent",
        agent=result.get("agent", "council"),
        text=result.get("content", "Sorry, I couldn't process that."),
    )


@router.get("/history", response_model=list[ChatResponse])
async def get_history(user=Depends(get_current_user)):
    """Retrieve chat history. Returns a welcome message for new users."""
    name = user.get("name", "there")
    return [
        ChatResponse(
            id="welcome_1",
            role="agent",
            agent="council",
            text=(
                f"Hey {name}! I'm Council, your personal finance team lead. "
                "I coordinate Pulse (cashflow), Audit (subscriptions), "
                "North Star (goals), and Sentinel (spend guard) to give you "
                "a complete picture. Ask me anything about your finances — "
                "or I can start with a weekly briefing."
            ),
        )
    ]
