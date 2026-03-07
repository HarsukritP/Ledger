from fastapi import APIRouter, Depends
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me")
async def me(user=Depends(get_current_user)):
    return user
