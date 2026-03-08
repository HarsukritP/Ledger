"""Cashflow endpoints — past history + future 30-day forecast from real transaction data."""
import logging
from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_current_user
from app.services.data_service import data_service

logger = logging.getLogger("ledger.cashflow")

router = APIRouter(prefix="/cashflow", tags=["cashflow"])


@router.get("")
async def get_cashflow(history_days: int = 30, user=Depends(get_current_user)):
    user_db_id = user.get("db_id")
    if not user_db_id:
        raise HTTPException(status_code=400, detail="User not found in database")

    try:
        balance = await data_service.get_total_balance(user_db_id)
        history_events = data_service.get_history_events(user_db_id, days=history_days)
        forecast_events = data_service.get_upcoming_events(user_db_id)

        running = balance
        low = balance
        low_date = None
        for e in forecast_events:
            if e["type"] == "income":
                running += e["amount"]
            else:
                running -= e["amount"]
            if running < low:
                low = running
                low_date = e["date"]

        return {
            "current_balance": round(balance, 2),
            "end_balance": round(running, 2),
            "danger_threshold": 500,
            "predicted_low": round(low, 2),
            "predicted_low_date": low_date,
            "history_events": history_events,
            "forecast_events": forecast_events,
        }
    except Exception as e:
        logger.error(f"[CASHFLOW] get failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/events")
async def get_events(user=Depends(get_current_user)):
    user_db_id = user.get("db_id")
    if not user_db_id:
        raise HTTPException(status_code=400, detail="User not found in database")

    try:
        return data_service.get_upcoming_events(user_db_id)
    except Exception as e:
        logger.error(f"[CASHFLOW] events failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
