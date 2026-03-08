"""Goals endpoints — CRUD backed by Supabase, with feasibility computed from real data."""
import logging
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_current_user
from app.models import GoalCreate, GoalUpdate
from app.services.data_service import data_service

logger = logging.getLogger("ledger.goals")

router = APIRouter(prefix="/goals", tags=["goals"])


@router.get("")
async def list_goals(user=Depends(get_current_user)):
    user_db_id = user.get("db_id")
    if not user_db_id:
        raise HTTPException(status_code=400, detail="User not found in database")

    try:
        goals = data_service.get_goals(user_db_id)
        return [_enrich_goal(g) for g in goals]
    except Exception as e:
        logger.error(f"[GOALS] list failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def create_goal(body: GoalCreate, user=Depends(get_current_user)):
    user_db_id = user.get("db_id")
    if not user_db_id:
        raise HTTPException(status_code=400, detail="User not found in database")

    try:
        goal = data_service.create_goal(user_db_id, body.model_dump())
        return _enrich_goal(goal)
    except Exception as e:
        logger.error(f"[GOALS] create failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{goal_id}")
async def update_goal(goal_id: str, body: GoalUpdate, user=Depends(get_current_user)):
    user_db_id = user.get("db_id")
    if not user_db_id:
        raise HTTPException(status_code=400, detail="User not found in database")

    try:
        goal = data_service.update_goal(user_db_id, goal_id, body.model_dump(exclude_none=True))
        return _enrich_goal(goal)
    except Exception as e:
        logger.error(f"[GOALS] update failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{goal_id}")
async def delete_goal(goal_id: str, user=Depends(get_current_user)):
    user_db_id = user.get("db_id")
    if not user_db_id:
        raise HTTPException(status_code=400, detail="User not found in database")

    try:
        data_service.delete_goal(user_db_id, goal_id)
        return {"status": "deleted", "goal_id": goal_id}
    except Exception as e:
        logger.error(f"[GOALS] delete failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/feasibility")
async def get_feasibility(user=Depends(get_current_user)):
    user_db_id = user.get("db_id")
    if not user_db_id:
        raise HTTPException(status_code=400, detail="User not found in database")

    try:
        health = await data_service.get_health_metrics(user_db_id)
        goals = data_service.get_goals(user_db_id)
        enriched = [_enrich_goal(g) for g in goals]

        statuses = [g.get("feasibility", "on_track") for g in enriched]
        if "behind" in statuses:
            overall = "needs_attention"
        elif "at_risk" in statuses:
            overall = "mixed"
        else:
            overall = "on_track"

        monthly_surplus = health["saved"]
        total_needed = sum(g.get("monthly_contribution", 0) for g in enriched)

        recommendations = []
        if total_needed > monthly_surplus and monthly_surplus > 0:
            gap = total_needed - monthly_surplus
            recommendations.append(f"You need ${gap:.0f}/mo more to hit all goals on time")

        recurring = data_service.get_recurring_charges(user_db_id)
        flagged = [r for r in recurring if r.get("status") == "flagged" or r.get("value_score", 3) <= 2]
        if flagged:
            potential = sum(float(r.get("average_amount", 0)) for r in flagged)
            recommendations.append(f"Cancel {len(flagged)} low-value subscriptions to free ${potential:.0f}/mo")

        return {
            "overall": overall,
            "goals": [
                {"id": g.get("id", ""), "name": g.get("name", ""), "feasibility": g.get("feasibility", "on_track")}
                for g in enriched
            ],
            "recommendations": recommendations,
        }
    except Exception as e:
        logger.error(f"[GOALS] feasibility failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _enrich_goal(g: dict) -> dict:
    """Add computed feasibility and monthly_contribution to a raw goal row."""
    target = float(g.get("target_amount", 0))
    current = float(g.get("current_amount", 0))
    target_date_str = g.get("target_date")

    remaining = max(target - current, 0)
    monthly = 0.0
    feasibility = "on_track"

    if target_date_str:
        try:
            td = date.fromisoformat(str(target_date_str))
            months_left = max((td.year - date.today().year) * 12 + (td.month - date.today().month), 1)
            monthly = remaining / months_left

            progress_ratio = current / target if target > 0 else 0
            time_elapsed_ratio = 1 - (months_left / max(months_left + 3, 1))

            if progress_ratio >= time_elapsed_ratio * 0.9:
                feasibility = "on_track"
            elif progress_ratio >= time_elapsed_ratio * 0.6:
                feasibility = "at_risk"
            else:
                feasibility = "behind"
        except (ValueError, ZeroDivisionError):
            pass

    return {
        **g,
        "monthly_contribution": round(monthly, 2),
        "feasibility": g.get("feasibility") or feasibility,
    }
