from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.models import DashboardBriefing, HealthMetrics, ForecastEvent, ActionItem, ActionResponse

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

MOCK_HEALTH = HealthMetrics(balance=2847.32, spent_this_month=1204.56, saved=560.0, budget_limit=2400)

MOCK_WEEK = [
    ForecastEvent(id="1", date="2026-03-09", name="Phone bill", amount=65, type="bill"),
    ForecastEvent(id="2", date="2026-03-11", name="Paycheck", amount=1600, type="income"),
    ForecastEvent(id="3", date="2026-03-12", name="Gym membership", amount=50, type="bill"),
]

MOCK_ACTIONS = [
    ActionItem(
        id="1", agent="audit", type="suggestion",
        title="News+ subscription underused",
        description="$12.99/mo — you read 2 articles this month",
        amount=-12.99,
        actions=[
            {"label": "Keep", "variant": "ghost"},
            {"label": "Cancel", "variant": "primary"},
            {"label": "Remind Later", "variant": "ghost"},
        ],
    ),
    ActionItem(
        id="2", agent="pulse", type="warning",
        title="Low balance risk Tuesday",
        description="Balance may dip to $380. Transfer $250 from savings?",
        amount=-250,
        actions=[
            {"label": "Approve Transfer", "variant": "primary"},
            {"label": "Dismiss", "variant": "ghost"},
        ],
    ),
]


@router.get("/briefing", response_model=DashboardBriefing)
async def get_briefing(user=Depends(get_current_user)):
    return DashboardBriefing(
        health=MOCK_HEALTH,
        week_ahead=MOCK_WEEK,
        actions=MOCK_ACTIONS,
    )


@router.get("/health", response_model=HealthMetrics)
async def get_health(user=Depends(get_current_user)):
    return MOCK_HEALTH


@router.post("/action/{action_id}")
async def respond_to_action(action_id: str, body: ActionResponse, user=Depends(get_current_user)):
    return {"status": "ok", "action_id": action_id, "response": body.response}
