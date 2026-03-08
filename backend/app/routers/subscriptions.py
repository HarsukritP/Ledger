"""Expenses endpoints — recurring charges (bills, subscriptions, rent) detected from Plaid transactions."""
import logging
from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_current_user
from app.services.data_service import data_service
from app.services.supabase_client import get_supabase

logger = logging.getLogger("ledger.expenses")

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.get("")
async def list_expenses(user=Depends(get_current_user)):
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
                "source": r.get("source", "bank"),
            }
            for i, r in enumerate(recurring)
        ]
    except Exception as e:
        logger.error(f"[EXPENSES] list failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{expense_id}")
async def get_expense(expense_id: str, user=Depends(get_current_user)):
    user_db_id = user.get("db_id")
    if not user_db_id:
        raise HTTPException(status_code=400, detail="User not found in database")

    sb = get_supabase()
    if not sb:
        raise HTTPException(status_code=500, detail="Database not configured")

    result = (
        sb.table("recurring_charges")
        .select("*")
        .eq("id", expense_id)
        .eq("user_id", user_db_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Expense not found")

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
        "source": r.get("source", "bank"),
    }


@router.post("/{expense_id}/decision")
async def decide_expense(expense_id: str, decision: str, reason: str = "", user=Depends(get_current_user)):
    user_db_id = user.get("db_id")
    sb = get_supabase()
    if sb and user_db_id:
        try:
            new_status = "cancelled" if decision == "cancel" else "active" if decision == "keep" else "flagged"
            sb.table("recurring_charges").update({
                "status": new_status,
                "decision_reason": reason or decision,
            }).eq("id", expense_id).eq("user_id", user_db_id).execute()
        except Exception as e:
            logger.warning(f"[EXPENSES] Could not update decision for {expense_id}: {e}")

    return {"status": "ok", "expense_id": expense_id, "decision": decision, "reason": reason}
