import uuid
import logging
import traceback
from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_current_user
from app.models import ChatMessage, ChatResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/message", response_model=ChatResponse)
async def send_message(body: ChatMessage, user=Depends(get_current_user)):
    """Send a message to the Ledger agent team via Backboard Council.

    Returns the real agent response. Surfaces errors as 500s with detail.
    """
    from app.agents.orchestrator import orchestrator

    user_sub = user.get("sub", "")
    user_name = user.get("name", "")

    logger.info(f"[CHAT ENDPOINT] user={user_sub} message={body.message[:80]}...")

    try:
        result = await orchestrator.route_chat(
            user_sub=user_sub,
            message=body.message,
            user_name=user_name,
        )
    except Exception as e:
        logger.error(
            f"[CHAT ENDPOINT] FAILED for user={user_sub}: {e}\n"
            f"{traceback.format_exc()}"
        )
        raise HTTPException(
            status_code=500,
            detail=f"Agent error: {str(e)}",
        )

    return ChatResponse(
        id=f"resp_{uuid.uuid4().hex[:8]}",
        role="agent",
        agent=result.get("agent", "council"),
        text=result.get("content", ""),
    )


@router.get("/history", response_model=list[ChatResponse])
async def get_history(user=Depends(get_current_user)):
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
