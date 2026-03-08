"""Subscriptions endpoints — recurring charges detected from real Plaid transaction data."""
import logging
from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_current_user
from app.services.data_service import data_service
from app.services.supabase_client import get_supabase

logger = logging.getLogger("ledger.subs")

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


@router.get("")
async def list_subscriptions(user=Depends(get_current_user)):
    user_db_id = user.get("db_id")
    if not user_db_id:
        raise HTTPException(status_code=400, detail="User not found in database")

    try:
        recurring = data_service.get_recurring_charges(user_db_id)
        return [
            {
                "id": str(r.get("id", i)),
                "name": r.get("merchant_name", "Unknown"),
                "amount": float(r.get("average_amount", 0)),
                "frequency": r.get("frequency", "monthly"),
                "value_score": r.get("value_score", 3),
                "status": r.get("status", "active"),
                "last_charge_date": r.get("last_charge_date", ""),
                "usage_estimate": r.get("usage_estimate"),
                "category": r.get("category", ""),
            }
            for i, r in enumerate(recurring)
        ]
    except Exception as e:
        logger.error(f"[SUBS] list failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{sub_id}")
async def get_subscription(sub_id: str, user=Depends(get_current_user)):
    user_db_id = user.get("db_id")
    if not user_db_id:
        raise HTTPException(status_code=400, detail="User not found in database")

    sb = get_supabase()
    if not sb:
        raise HTTPException(status_code=500, detail="Database not configured")

    result = (
        sb.table("recurring_charges")
        .select("*")
        .eq("id", sub_id)
        .eq("user_id", user_db_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Subscription not found")

    r = result.data[0]
    return {
        "id": str(r["id"]),
        "name": r.get("merchant_name", ""),
        "amount": float(r.get("average_amount", 0)),
        "frequency": r.get("frequency", "monthly"),
        "value_score": r.get("value_score", 3),
        "status": r.get("status", "active"),
        "last_charge_date": r.get("last_charge_date", ""),
        "usage_estimate": r.get("usage_estimate"),
        "category": r.get("category", ""),
        "price_history": r.get("price_history", []),
    }


@router.post("/{sub_id}/decision")
async def decide_subscription(sub_id: str, decision: str, reason: str = "", user=Depends(get_current_user)):
    user_db_id = user.get("db_id")
    sb = get_supabase()
    if sb and user_db_id:
        try:
            new_status = "cancelled" if decision == "cancel" else "active" if decision == "keep" else "flagged"
            sb.table("recurring_charges").update({
                "status": new_status,
                "decision_reason": reason or decision,
            }).eq("id", sub_id).eq("user_id", user_db_id).execute()
        except Exception as e:
            logger.warning(f"[SUBS] Could not update decision for {sub_id}: {e}")

    return {"status": "ok", "sub_id": sub_id, "decision": decision, "reason": reason}
