from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.models import GoalOut, GoalCreate, GoalUpdate

router = APIRouter(prefix="/goals", tags=["goals"])

MOCK_GOALS = [
    GoalOut(id="1", name="Japan Trip", target_amount=5000, current_amount=1200, target_date="2026-12-01", monthly_contribution=422, feasibility="at_risk"),
    GoalOut(id="2", name="Emergency Fund", target_amount=2000, current_amount=1450, target_date="2026-06-01", monthly_contribution=183, feasibility="on_track"),
    GoalOut(id="3", name="New Laptop", target_amount=1800, current_amount=300, target_date="2026-09-01", monthly_contribution=250, feasibility="behind"),
]


@router.get("", response_model=list[GoalOut])
async def list_goals(user=Depends(get_current_user)):
    return MOCK_GOALS


@router.post("", response_model=GoalOut)
async def create_goal(body: GoalCreate, user=Depends(get_current_user)):
    return GoalOut(
        id="new",
        name=body.name,
        target_amount=body.target_amount,
        current_amount=body.current_amount,
        target_date=body.target_date,
        monthly_contribution=0,
        feasibility="on_track",
    )


@router.patch("/{goal_id}", response_model=GoalOut)
async def update_goal(goal_id: str, body: GoalUpdate, user=Depends(get_current_user)):
    for g in MOCK_GOALS:
        if g.id == goal_id:
            return g
    return GoalOut(id=goal_id, name="", target_amount=0, current_amount=0, target_date="", monthly_contribution=0, feasibility="on_track")


@router.delete("/{goal_id}")
async def delete_goal(goal_id: str, user=Depends(get_current_user)):
    return {"status": "deleted", "goal_id": goal_id}


@router.get("/feasibility")
async def get_feasibility(user=Depends(get_current_user)):
    return {
        "overall": "mixed",
        "goals": [
            {"id": g.id, "name": g.name, "feasibility": g.feasibility}
            for g in MOCK_GOALS
        ],
        "recommendations": [
            "Cancel 2 flagged subscriptions to free up $63/mo",
            "Reduce dining spend by $50/mo to accelerate laptop goal",
        ],
    }
