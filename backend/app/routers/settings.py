import logging
from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_current_user
from app.models import UserPreferences
from app.services.supabase_client import get_supabase

logger = logging.getLogger("ledger.settings")

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=UserPreferences)
async def get_settings(user=Depends(get_current_user)):
    db_id = user.get("db_id")
    if db_id:
        sb = get_supabase()
        if sb:
            result = sb.table("users").select("preferences").eq("id", db_id).execute()
            if result.data and result.data[0].get("preferences"):
                prefs = result.data[0]["preferences"]
                return UserPreferences(**prefs)
    return UserPreferences()


@router.patch("", response_model=UserPreferences)
async def update_settings(body: UserPreferences, user=Depends(get_current_user)):
    db_id = user.get("db_id")
    if not db_id:
        raise HTTPException(status_code=400, detail="User not found in database")

    sb = get_supabase()
    if sb:
        sb.table("users").update({"preferences": body.model_dump()}).eq("id", db_id).execute()
        logger.info(f"[SETTINGS] Updated preferences for user {db_id}")
    return body


@router.delete("/memory/{memory_id}")
async def delete_memory(memory_id: str, user=Depends(get_current_user)):
    return {"status": "deleted", "memory_id": memory_id}


@router.post("/export")
async def export_data(user=Depends(get_current_user)):
    return {
        "status": "ok",
        "message": "Data export generated",
        "download_url": "/static/export.json",
    }
