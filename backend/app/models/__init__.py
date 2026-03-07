from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class HealthMetrics(BaseModel):
    balance: float
    spent_this_month: float
    saved: float
    budget_limit: float


class ForecastEvent(BaseModel):
    id: str
    date: str
    name: str
    amount: float
    type: str  # income, bill, expense
    category: Optional[str] = None


class ActionItem(BaseModel):
    id: str
    agent: str
    type: str  # warning, suggestion, question
    title: str
    description: str
    amount: Optional[float] = None
    actions: list[dict]


class SubscriptionOut(BaseModel):
    id: str
    name: str
    amount: float
    frequency: str
    value_score: int
    status: str
    last_charge_date: str
    usage_estimate: Optional[str] = None
    price_history: Optional[list[dict]] = None


class GoalOut(BaseModel):
    id: str
    name: str
    target_amount: float
    current_amount: float
    target_date: str
    monthly_contribution: float
    feasibility: str


class GoalCreate(BaseModel):
    name: str
    target_amount: float
    target_date: str
    current_amount: float = 0


class GoalUpdate(BaseModel):
    name: Optional[str] = None
    target_amount: Optional[float] = None
    target_date: Optional[str] = None
    current_amount: Optional[float] = None
    priority: Optional[int] = None


class ChatMessage(BaseModel):
    message: str


class ChatResponse(BaseModel):
    id: str
    role: str
    agent: Optional[str] = None
    text: str


class BriefingOut(BaseModel):
    id: str
    content: str
    audio_url: Optional[str] = None
    created_at: str


class DashboardBriefing(BaseModel):
    health: HealthMetrics
    week_ahead: list[ForecastEvent]
    actions: list[ActionItem]
    briefing: Optional[BriefingOut] = None


class UserPreferences(BaseModel):
    briefing_frequency: str = "weekly"
    communication_style: str = "brief"
    agent_strictness: str = "balanced"


class ActionResponse(BaseModel):
    action_id: str
    response: str  # approved, dismissed, snoozed
