"""Forecast endpoints — next 30 days of predicted cash flow from real transaction data."""
import logging
from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_current_user
from app.services.data_service import data_service

logger = logging.getLogger("ledger.forecast")

router = APIRouter(prefix="/forecast", tags=["forecast"])


@router.get("")
async def get_forecast(user=Depends(get_current_user)):
    user_db_id = user.get("db_id")
    if not user_db_id:
        raise HTTPException(status_code=400, detail="User not found in database")

    try:
        balance = await data_service.get_total_balance(user_db_id)
        events = data_service.get_upcoming_events(user_db_id)

        running = balance
        low = balance
        low_date = None
        for e in events:
            if e["type"] == "income":
                running += e["amount"]
            else:
                running -= e["amount"]
            if running < low:
                low = running
                low_date = e["date"]

        return {
            "start_balance": round(balance, 2),
            "danger_threshold": 500,
            "predicted_low": round(low, 2),
            "predicted_low_date": low_date,
            "events": events,
        }
    except Exception as e:
        logger.error(f"[FORECAST] get failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/events")
async def get_events(user=Depends(get_current_user)):
    user_db_id = user.get("db_id")
    if not user_db_id:
        raise HTTPException(status_code=400, detail="User not found in database")

    try:
        return data_service.get_upcoming_events(user_db_id)
    except Exception as e:
        logger.error(f"[FORECAST] events failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
