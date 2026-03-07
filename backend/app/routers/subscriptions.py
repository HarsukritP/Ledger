from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.models import SubscriptionOut

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])

MOCK_SUBS = [
    SubscriptionOut(id="1", name="Netflix", amount=17.99, frequency="monthly", value_score=4, status="active", last_charge_date="2026-03-01", usage_estimate="~12 hours/mo"),
    SubscriptionOut(id="2", name="Spotify", amount=11.99, frequency="monthly", value_score=5, status="active", last_charge_date="2026-03-03", usage_estimate="Daily use"),
    SubscriptionOut(id="3", name="Apple News+", amount=12.99, frequency="monthly", value_score=1, status="flagged", last_charge_date="2026-03-02", usage_estimate="2 articles/mo"),
    SubscriptionOut(id="4", name="Gym Membership", amount=50.0, frequency="monthly", value_score=2, status="flagged", last_charge_date="2026-03-01", usage_estimate="Last visited 6 weeks ago"),
    SubscriptionOut(id="5", name="iCloud+", amount=2.99, frequency="monthly", value_score=4, status="active", last_charge_date="2026-02-28"),
    SubscriptionOut(id="6", name="Adobe CC", amount=54.99, frequency="monthly", value_score=3, status="active", last_charge_date="2026-03-05", usage_estimate="~8 hours/mo"),
    SubscriptionOut(id="7", name="YouTube Premium", amount=13.99, frequency="monthly", value_score=4, status="active", last_charge_date="2026-03-01", usage_estimate="~20 hours/mo"),
]


@router.get("", response_model=list[SubscriptionOut])
async def list_subscriptions(user=Depends(get_current_user)):
    return MOCK_SUBS


@router.get("/{sub_id}", response_model=SubscriptionOut)
async def get_subscription(sub_id: str, user=Depends(get_current_user)):
    for sub in MOCK_SUBS:
        if sub.id == sub_id:
            return sub
    return {"error": "not found"}


@router.post("/{sub_id}/decision")
async def decide_subscription(sub_id: str, decision: str, reason: str = "", user=Depends(get_current_user)):
    return {"status": "ok", "sub_id": sub_id, "decision": decision, "reason": reason}
