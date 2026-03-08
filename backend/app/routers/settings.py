import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from app.dependencies import get_current_user
from app.models import UserPreferences
from app.services.supabase_client import get_supabase
from app.services.data_service import data_service

logger = logging.getLogger("ledger.settings")

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("")
async def get_settings(user=Depends(get_current_user)):
    db_id = user.get("db_id")
    if db_id:
        sb = get_supabase()
        if sb:
            result = sb.table("users").select("preferences, monthly_rent").eq("id", db_id).execute()
            if result.data:
                prefs = result.data[0].get("preferences") or {}
                return {
                    "briefing_frequency": prefs.get("briefing_frequency", "weekly"),
                    "communication_style": prefs.get("communication_style", "brief"),
                    "agent_strictness": prefs.get("agent_strictness", "balanced"),
                    "monthly_rent": result.data[0].get("monthly_rent"),
                }
    return UserPreferences().model_dump()


@router.patch("")
async def update_settings(body: UserPreferences, user=Depends(get_current_user)):
    db_id = user.get("db_id")
    if not db_id:
        raise HTTPException(status_code=400, detail="User not found in database")

    sb = get_supabase()
    if sb:
        sb.table("users").update({"preferences": body.model_dump()}).eq("id", db_id).execute()
        logger.info(f"[SETTINGS] Updated preferences for user {db_id}")
    return body.model_dump()


@router.get("/memories")
async def list_memories(user=Depends(get_current_user)):
    user_sub = user.get("sub", "")
    try:
        from app.services.backboard_service import backboard_service
        memories = await backboard_service.list_memories(user_sub)
        return {"memories": memories}
    except Exception as e:
        logger.warning(f"[SETTINGS] Could not list memories: {e}")
        return {"memories": []}


@router.delete("/memory/{memory_id}")
async def delete_memory(memory_id: str, user=Depends(get_current_user)):
    user_sub = user.get("sub", "")
    try:
        from app.services.backboard_service import backboard_service
        deleted = await backboard_service.delete_memory(user_sub, memory_id)
        return {"status": "deleted" if deleted else "not_found", "memory_id": memory_id}
    except Exception as e:
        logger.warning(f"[SETTINGS] Could not delete memory: {e}")
        return {"status": "error", "memory_id": memory_id}


@router.post("/export")
async def export_data(user=Depends(get_current_user)):
    db_id = user.get("db_id")
    if not db_id:
        raise HTTPException(status_code=400, detail="User not found in database")

    sb = get_supabase()
    if not sb:
        raise HTTPException(status_code=500, detail="Database not available")

    user_data = sb.table("users").select("*").eq("id", db_id).execute()
    transactions = data_service.get_transactions(db_id, days=365)
    recurring = data_service.get_recurring_charges(db_id)
    goals = data_service.get_goals(db_id)
    actions = data_service.get_action_queue(db_id)

    export = {
        "user": user_data.data[0] if user_data.data else {},
        "transactions": transactions,
        "recurring_charges": recurring,
        "goals": goals,
        "action_queue": actions,
        "exported_at": __import__("datetime").datetime.utcnow().isoformat(),
    }
    for key in ("plaid_access_token", "backboard_assistant_id"):
        export.get("user", {}).pop(key, None)

    return JSONResponse(content=export, headers={
        "Content-Disposition": "attachment; filename=ledger-export.json"
    })


@router.delete("/account")
async def delete_account(user=Depends(get_current_user)):
    db_id = user.get("db_id")
    if not db_id:
        raise HTTPException(status_code=400, detail="User not found in database")

    sb = get_supabase()
    if not sb:
        raise HTTPException(status_code=500, detail="Database not available")

    for table in ("chat_messages", "briefings", "action_queue", "goals", "recurring_charges", "transactions", "linked_accounts"):
        sb.table(table).delete().eq("user_id", db_id).execute()
    sb.table("users").delete().eq("id", db_id).execute()

    logger.info(f"[SETTINGS] Deleted all data for user {db_id}")
    return {"status": "deleted"}
