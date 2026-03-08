import uuid
import logging
import traceback
from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_current_user
from app.models import ChatMessage, ChatResponse
from app.services.supabase_client import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])

WELCOME_TEXT = (
    "Hey {name}! I'm Council, your personal finance team lead. "
    "I coordinate Pulse (cashflow), Audit (subscriptions), "
    "North Star (goals), and Sentinel (spend guard) to give you "
    "a complete picture. Ask me anything about your finances — "
    "or I can start with a weekly briefing."
)


def _save_message(user_db_id: str, role: str, text: str, agent: str | None = None):
    sb = get_supabase()
    if not sb:
        return
    try:
        sb.table("chat_messages").insert({
            "user_id": user_db_id,
            "role": role,
            "agent": agent,
            "text": text,
        }).execute()
    except Exception as e:
        logger.warning(f"[CHAT] Could not persist message: {e}")


@router.post("/message", response_model=ChatResponse)
async def send_message(body: ChatMessage, user=Depends(get_current_user)):
    from app.agents.orchestrator import orchestrator

    user_sub = user.get("sub", "")
    user_name = user.get("name", "")
    user_db_id = user.get("db_id", "")

    logger.info(f"[CHAT ENDPOINT] user={user_sub} message={body.message[:80]}...")

    _save_message(user_db_id, "user", body.message)

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

    agent = result.get("agent", "council")
    text = result.get("content", "")

    _save_message(user_db_id, "agent", text, agent)

    return ChatResponse(
        id=f"resp_{uuid.uuid4().hex[:8]}",
        role="agent",
        agent=agent,
        text=text,
    )


@router.get("/history", response_model=list[ChatResponse])
async def get_history(user=Depends(get_current_user)):
    user_db_id = user.get("db_id", "")
    user_name = user.get("name", "there")
    sb = get_supabase()

    welcome = ChatResponse(
        id="welcome_1",
        role="agent",
        agent="council",
        text=WELCOME_TEXT.format(name=user_name),
    )

    if not sb or not user_db_id:
        return [welcome]

    try:
        result = (
            sb.table("chat_messages")
            .select("id, role, agent, text, created_at")
            .eq("user_id", user_db_id)
            .order("created_at", desc=False)
            .limit(200)
            .execute()
        )
        rows = result.data or []
    except Exception as e:
        logger.warning(f"[CHAT] Could not load history: {e}")
        return [welcome]

    if not rows:
        return [welcome]

    return [
        ChatResponse(
            id=str(r["id"]),
            role=r["role"],
            agent=r.get("agent"),
            text=r["text"],
        )
        for r in rows
    ]


@router.delete("/history")
async def clear_history(user=Depends(get_current_user)):
    user_db_id = user.get("db_id", "")
    sb = get_supabase()

    if not sb or not user_db_id:
        raise HTTPException(status_code=400, detail="User not found in database")

    try:
        sb.table("chat_messages").delete().eq("user_id", user_db_id).execute()
        logger.info(f"[CHAT] Cleared history for user={user_db_id}")
        return {"status": "cleared"}
    except Exception as e:
        logger.error(f"[CHAT] Failed to clear history: {e}")
        raise HTTPException(status_code=500, detail=str(e))
