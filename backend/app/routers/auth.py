import logging
from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_current_user
from app.models import OnboardingCompleteRequest
from app.services.supabase_client import get_supabase, mark_onboarding_complete
from app.services.data_service import data_service

logger = logging.getLogger("ledger.auth")

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me")
async def me(user=Depends(get_current_user)):
    db_id = user.get("db_id")
    onboarding_completed = False

    if db_id:
        sb = get_supabase()
        if sb:
            result = sb.table("users").select("onboarding_completed").eq("id", db_id).execute()
            if result.data:
                onboarding_completed = result.data[0].get("onboarding_completed", False)

    return {
        **user,
        "onboarding_completed": onboarding_completed,
    }


@router.post("/onboarding-complete")
async def complete_onboarding(body: OnboardingCompleteRequest, user=Depends(get_current_user)):
    db_id = user.get("db_id")
    if not db_id:
        raise HTTPException(status_code=400, detail="User not found in database")

    preferences = {
        "communication_style": body.communication_style,
        "briefing_frequency": body.briefing_frequency,
        "agent_strictness": "balanced",
    }

    await mark_onboarding_complete(db_id, preferences)
    logger.info(f"[AUTH] Onboarding marked complete for user {db_id}")

    if body.goal_name and body.goal_amount and body.goal_amount > 0:
        try:
            from datetime import date, timedelta
            target_date = (date.today() + timedelta(days=180)).isoformat()
            data_service.create_goal(db_id, {
                "name": body.goal_name,
                "target_amount": body.goal_amount,
                "target_date": target_date,
            })
            logger.info(f"[AUTH] Created onboarding goal '{body.goal_name}' for user {db_id}")
        except Exception as e:
            logger.warning(f"[AUTH] Failed to create onboarding goal: {e}")

    if body.rent and body.rent > 0:
        try:
            sb = get_supabase()
            if sb:
                sb.table("users").update({"monthly_rent": body.rent}).eq("id", db_id).execute()
                logger.info(f"[AUTH] Saved rent ${body.rent} for user {db_id}")
        except Exception as e:
            logger.warning(f"[AUTH] Failed to save rent: {e}")

    return {"status": "ok", "onboarding_completed": True}
