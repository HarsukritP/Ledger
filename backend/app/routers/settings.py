from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.models import UserPreferences

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=UserPreferences)
async def get_settings(user=Depends(get_current_user)):
    return UserPreferences()


@router.patch("", response_model=UserPreferences)
async def update_settings(body: UserPreferences, user=Depends(get_current_user)):
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
