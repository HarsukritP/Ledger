from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.models import ForecastEvent

router = APIRouter(prefix="/forecast", tags=["forecast"])

MOCK_EVENTS = [
    ForecastEvent(id="1", date="2026-03-09", name="Phone bill", amount=65, type="bill", category="Bills"),
    ForecastEvent(id="2", date="2026-03-11", name="Paycheck", amount=1600, type="income", category="Income"),
    ForecastEvent(id="3", date="2026-03-12", name="Gym", amount=50, type="bill", category="Fitness"),
    ForecastEvent(id="4", date="2026-03-15", name="Rent", amount=1200, type="bill", category="Housing"),
    ForecastEvent(id="5", date="2026-03-18", name="Netflix", amount=17.99, type="bill", category="Entertainment"),
    ForecastEvent(id="6", date="2026-03-25", name="Paycheck", amount=1600, type="income", category="Income"),
    ForecastEvent(id="7", date="2026-03-28", name="Internet", amount=60, type="bill", category="Bills"),
]


@router.get("")
async def get_forecast(user=Depends(get_current_user)):
    return {
        "start_balance": 2847.32,
        "danger_threshold": 500,
        "predicted_low": 380.33,
        "predicted_low_date": "2026-03-12",
        "events": [e.model_dump() for e in MOCK_EVENTS],
    }


@router.get("/events", response_model=list[ForecastEvent])
async def get_events(user=Depends(get_current_user)):
    return MOCK_EVENTS
