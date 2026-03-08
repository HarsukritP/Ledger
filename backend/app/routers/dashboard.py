"""Dashboard endpoints — health metrics, week ahead, action queue. All data from Plaid/Supabase."""
import logging
from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_current_user
from app.models import DashboardBriefing, HealthMetrics, ForecastEvent, ActionItem, ActionResponse
from app.services.data_service import data_service

logger = logging.getLogger("ledger.dashboard")

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/briefing")
async def get_briefing(user=Depends(get_current_user)):
    user_db_id = user.get("db_id")
    if not user_db_id:
        raise HTTPException(status_code=400, detail="User not found in database")

    try:
        health = await data_service.get_health_metrics(user_db_id)
        events = data_service.get_upcoming_events(user_db_id)
        actions_raw = data_service.get_action_queue(user_db_id)

        week_ahead = [
            {
                "id": e["id"],
                "date": e["date"],
                "name": e["name"],
                "amount": e["amount"],
                "type": e["type"],
                "category": e.get("category"),
            }
            for e in events[:7]
        ]

        actions = [
            {
                "id": a["id"],
                "agent": a.get("agent_source", "council"),
                "type": a.get("type", "suggestion"),
                "title": a.get("title", ""),
                "description": a.get("description", ""),
                "amount": float(a["amount"]) if a.get("amount") else None,
                "actions": a.get("suggested_action") or [
                    {"label": "Approve", "variant": "primary"},
                    {"label": "Dismiss", "variant": "ghost"},
                ],
            }
            for a in actions_raw
        ]

        return {
            "health": health,
            "week_ahead": week_ahead,
            "actions": actions,
        }
    except Exception as e:
        logger.error(f"[DASHBOARD] briefing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def get_health(user=Depends(get_current_user)):
    user_db_id = user.get("db_id")
    if not user_db_id:
        raise HTTPException(status_code=400, detail="User not found in database")

    try:
        return await data_service.get_health_metrics(user_db_id)
    except Exception as e:
        logger.error(f"[DASHBOARD] health failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/action/{action_id}")
async def respond_to_action(action_id: str, body: ActionResponse, user=Depends(get_current_user)):
    user_db_id = user.get("db_id")
    from app.services.supabase_client import get_supabase
    sb = get_supabase()
    if sb and user_db_id:
        try:
            from datetime import datetime
            sb.table("action_queue").update({
                "status": body.response,
                "resolved_at": datetime.utcnow().isoformat(),
            }).eq("id", action_id).eq("user_id", user_db_id).execute()
        except Exception as e:
            logger.warning(f"[DASHBOARD] Could not update action {action_id}: {e}")

    return {"status": "ok", "action_id": action_id, "response": body.response}


@router.get("/categories")
async def get_categories(days: int = 30, user=Depends(get_current_user)):
    user_db_id = user.get("db_id")
    if not user_db_id:
        raise HTTPException(status_code=400, detail="User not found in database")

    try:
        return data_service.get_category_breakdown(user_db_id, days=days)
    except Exception as e:
        logger.error(f"[DASHBOARD] categories failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
