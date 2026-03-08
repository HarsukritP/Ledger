"""Plaid API endpoints — link token, token exchange, transaction sync, accounts, sandbox tools."""
import logging
import random
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.dependencies import get_current_user
from app.services.plaid_service import plaid_service, PlaidError
from app.services.supabase_client import get_supabase

logger = logging.getLogger("ledger.plaid")

router = APIRouter(prefix="/plaid", tags=["plaid"])


class ExchangeRequest(BaseModel):
    public_token: str
    institution_name: str | None = None


class SandboxRequest(BaseModel):
    institution_id: str = "ins_109508"


@router.post("/link-token")
async def create_link_token(user=Depends(get_current_user)):
    """Create a Plaid Link token for the frontend."""
    user_sub = user.get("sub", "unknown")
    try:
        result = await plaid_service.create_link_token(user_id=user_sub)
        return result
    except PlaidError as e:
        logger.error(f"[PLAID] /link-token failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/exchange")
async def exchange_token(body: ExchangeRequest, user=Depends(get_current_user)):
    """Exchange a public_token from Plaid Link for a permanent access_token."""
    user_db_id = user.get("db_id")
    if not user_db_id:
        raise HTTPException(status_code=400, detail="User not found in database")

    try:
        result = await plaid_service.exchange_public_token(
            public_token=body.public_token,
            user_db_id=user_db_id,
        )
        return {
            "status": "success",
            "accounts_linked": result["accounts_linked"],
            "accounts": result["accounts"],
        }
    except PlaidError as e:
        logger.error(f"[PLAID] /exchange failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync")
async def sync_transactions(user=Depends(get_current_user)):
    """Trigger a transaction sync from Plaid for all linked accounts."""
    user_db_id = user.get("db_id")
    if not user_db_id:
        raise HTTPException(status_code=400, detail="User not found in database")

    try:
        result = await plaid_service.sync_transactions(user_db_id=user_db_id)
        return result
    except PlaidError as e:
        logger.error(f"[PLAID] /sync failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.exception(f"[PLAID] /sync unhandled crash: {e}")
        raise HTTPException(status_code=500, detail=f"Sync failed unexpectedly: {e}")


@router.get("/accounts")
async def list_accounts(user=Depends(get_current_user)):
    """List linked bank accounts with live balances."""
    user_db_id = user.get("db_id")
    if not user_db_id:
        raise HTTPException(status_code=400, detail="User not found in database")

    try:
        accounts = await plaid_service.get_accounts_for_user(user_db_id=user_db_id)
        return {"accounts": accounts}
    except PlaidError as e:
        logger.error(f"[PLAID] /accounts failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/transactions")
async def get_transactions(days: int = 30, user=Depends(get_current_user)):
    """Retrieve synced transactions from the database."""
    user_db_id = user.get("db_id")
    if not user_db_id:
        raise HTTPException(status_code=400, detail="User not found in database")

    try:
        transactions = await plaid_service.get_transactions(
            user_db_id=user_db_id, days=days
        )
        return {"transactions": transactions}
    except PlaidError as e:
        logger.error(f"[PLAID] /transactions failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sandbox/create-token")
async def create_sandbox_token(body: SandboxRequest, user=Depends(get_current_user)):
    """(Sandbox only) Create a test public token without using Link UI."""
    try:
        public_token = await plaid_service.create_sandbox_token(
            institution_id=body.institution_id
        )
        return {"public_token": public_token}
    except PlaidError as e:
        logger.error(f"[PLAID] /sandbox/create-token failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class SeedRequest(BaseModel):
    weeks: int = 8
    clear_existing: bool = True


@router.post("/sandbox/clear")
async def clear_data(user=Depends(get_current_user)):
    """Clear all transactions and recurring charges for the current user."""
    user_db_id = user.get("db_id")
    if not user_db_id:
        raise HTTPException(status_code=400, detail="User not found in database")
    sb = get_supabase()
    if not sb:
        raise HTTPException(status_code=500, detail="Database not configured")
    sb.table("transactions").delete().eq("user_id", user_db_id).execute()
    sb.table("recurring_charges").delete().eq("user_id", user_db_id).execute()
    sb.table("action_queue").delete().eq("user_id", user_db_id).execute()
    logger.info(f"[PLAID] Cleared all data for user={user_db_id}")
    return {"status": "cleared"}


@router.post("/sandbox/seed")
async def seed_demo_data(body: SeedRequest = SeedRequest(), user=Depends(get_current_user)):
    """Seed realistic demo transactions directly into Supabase for the current user.

    This generates 8 weeks of transactions with realistic patterns:
    - Biweekly paychecks ($3,200/mo)
    - Rent, phone, internet, gym bills
    - Subscriptions (Netflix, Spotify, etc.)
    - Random dining, shopping, rideshare spending
    - Varied amounts with realistic seasonality
    """
    user_db_id = user.get("db_id")
    if not user_db_id:
        raise HTTPException(status_code=400, detail="User not found in database")

    sb = get_supabase()
    if not sb:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    try:
        if body.clear_existing:
            sb.table("transactions").delete().eq("user_id", user_db_id).execute()
            sb.table("recurring_charges").delete().eq("user_id", user_db_id).execute()
            logger.info(f"[SEED] Cleared existing transactions for user={user_db_id}")

        today = date.today()
        start = today - timedelta(weeks=body.weeks)
        txns = _generate_demo_transactions(start, today)

        inserted = 0
        for txn in txns:
            txn["user_id"] = user_db_id
            sb.table("transactions").insert(txn).execute()
            inserted += 1

        recurring = _generate_recurring_charges(user_db_id)
        for r in recurring:
            try:
                sb.table("recurring_charges").insert(r).execute()
            except Exception:
                pass

        logger.info(f"[SEED] Inserted {inserted} transactions + {len(recurring)} recurring charges")

        return {
            "status": "seeded",
            "transactions_created": inserted,
            "recurring_charges_created": len(recurring),
            "date_range": {"start": start.isoformat(), "end": today.isoformat()},
        }
    except Exception as e:
        logger.error(f"[SEED] Failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _generate_demo_transactions(start: date, end: date) -> list[dict]:
    """Generate realistic demo transactions spanning the given date range."""
    random.seed(42)
    txns = []
    d = start

    while d <= end:
        dom = d.day

        if dom == 15 or dom == 30 or (dom == 28 and d.month == 2):
            txns.append({
                "plaid_transaction_id": f"demo_inc_{d.isoformat()}",
                "account_id": "demo_checking",
                "amount": 1600.00,
                "date": d.isoformat(),
                "merchant_name": "Employer Direct Deposit",
                "category": "INCOME",
                "type": "income",
                "is_recurring": True,
            })

        if dom == 1:
            txns.append({
                "plaid_transaction_id": f"demo_rent_{d.isoformat()}",
                "account_id": "demo_checking",
                "amount": 1200.00,
                "date": d.isoformat(),
                "merchant_name": "Landlord Payment",
                "category": "RENT_AND_UTILITIES",
                "type": "bill",
                "is_recurring": True,
            })
            txns.append({
                "plaid_transaction_id": f"demo_gym_{d.isoformat()}",
                "account_id": "demo_checking",
                "amount": 50.00,
                "date": d.isoformat(),
                "merchant_name": "FitLife Gym",
                "category": "PERSONAL_CARE",
                "type": "bill",
                "is_recurring": True,
            })
            txns.append({
                "plaid_transaction_id": f"demo_nflx_{d.isoformat()}",
                "account_id": "demo_checking",
                "amount": 17.99,
                "date": d.isoformat(),
                "merchant_name": "Netflix",
                "category": "ENTERTAINMENT",
                "type": "bill",
                "is_recurring": True,
            })

        if dom == 3:
            txns.append({
                "plaid_transaction_id": f"demo_spot_{d.isoformat()}",
                "account_id": "demo_checking",
                "amount": 11.99,
                "date": d.isoformat(),
                "merchant_name": "Spotify",
                "category": "ENTERTAINMENT",
                "type": "bill",
                "is_recurring": True,
            })

        if dom == 2:
            txns.append({
                "plaid_transaction_id": f"demo_news_{d.isoformat()}",
                "account_id": "demo_checking",
                "amount": 12.99,
                "date": d.isoformat(),
                "merchant_name": "Apple News+",
                "category": "ENTERTAINMENT",
                "type": "bill",
                "is_recurring": True,
            })

        if dom == 5:
            txns.append({
                "plaid_transaction_id": f"demo_adbe_{d.isoformat()}",
                "account_id": "demo_checking",
                "amount": 54.99,
                "date": d.isoformat(),
                "merchant_name": "Adobe Creative Cloud",
                "category": "GENERAL_SERVICES",
                "type": "bill",
                "is_recurring": True,
            })
            txns.append({
                "plaid_transaction_id": f"demo_yt_{d.isoformat()}",
                "account_id": "demo_checking",
                "amount": 13.99,
                "date": d.isoformat(),
                "merchant_name": "YouTube Premium",
                "category": "ENTERTAINMENT",
                "type": "bill",
                "is_recurring": True,
            })

        if dom == 8:
            txns.append({
                "plaid_transaction_id": f"demo_phone_{d.isoformat()}",
                "account_id": "demo_checking",
                "amount": 65.00,
                "date": d.isoformat(),
                "merchant_name": "T-Mobile",
                "category": "RENT_AND_UTILITIES",
                "type": "bill",
                "is_recurring": True,
            })

        if dom == 15:
            txns.append({
                "plaid_transaction_id": f"demo_inet_{d.isoformat()}",
                "account_id": "demo_checking",
                "amount": 60.00,
                "date": d.isoformat(),
                "merchant_name": "Comcast Internet",
                "category": "RENT_AND_UTILITIES",
                "type": "bill",
                "is_recurring": True,
            })

        if dom == 28:
            txns.append({
                "plaid_transaction_id": f"demo_icld_{d.isoformat()}",
                "account_id": "demo_checking",
                "amount": 2.99,
                "date": d.isoformat(),
                "merchant_name": "Apple iCloud+",
                "category": "GENERAL_SERVICES",
                "type": "bill",
                "is_recurring": True,
            })

        if d.weekday() < 5 and random.random() < 0.3:
            amt = round(random.uniform(8, 22), 2)
            merchant = random.choice(["Starbucks", "Chipotle", "Uber Eats", "McDonald's", "Sweetgreen"])
            txns.append({
                "plaid_transaction_id": f"demo_dine_{d.isoformat()}_{random.randint(1,99)}",
                "account_id": "demo_checking",
                "amount": amt,
                "date": d.isoformat(),
                "merchant_name": merchant,
                "category": "FOOD_AND_DRINK",
                "type": "expense",
                "is_recurring": False,
            })

        if d.weekday() in (4, 5, 6) and random.random() < 0.25:
            amt = round(random.uniform(25, 80), 2)
            merchant = random.choice(["The Keg", "Cactus Club", "Earls", "Local Pub", "Wine Bar"])
            txns.append({
                "plaid_transaction_id": f"demo_eat_{d.isoformat()}_{random.randint(1,99)}",
                "account_id": "demo_checking",
                "amount": amt,
                "date": d.isoformat(),
                "merchant_name": merchant,
                "category": "FOOD_AND_DRINK",
                "type": "expense",
                "is_recurring": False,
            })

        if d.weekday() == 6 and random.random() < 0.4:
            amt = round(random.uniform(30, 120), 2)
            merchant = random.choice(["Amazon", "Best Buy", "Apple Store", "Walmart", "Costco"])
            txns.append({
                "plaid_transaction_id": f"demo_shop_{d.isoformat()}_{random.randint(1,99)}",
                "account_id": "demo_checking",
                "amount": amt,
                "date": d.isoformat(),
                "merchant_name": merchant,
                "category": "GENERAL_MERCHANDISE",
                "type": "expense",
                "is_recurring": False,
            })

        if random.random() < 0.12:
            amt = round(random.uniform(8, 25), 2)
            merchant = random.choice(["Uber", "Lyft"])
            txns.append({
                "plaid_transaction_id": f"demo_ride_{d.isoformat()}_{random.randint(1,99)}",
                "account_id": "demo_checking",
                "amount": amt,
                "date": d.isoformat(),
                "merchant_name": merchant,
                "category": "TRANSPORTATION",
                "type": "expense",
                "is_recurring": False,
            })

        d += timedelta(days=1)

    return txns


def _generate_recurring_charges(user_db_id: str) -> list[dict]:
    """Generate recurring charge records for detected subscriptions."""
    today = date.today()
    return [
        {"user_id": user_db_id, "merchant_name": "Landlord Payment", "average_amount": 1200.00, "frequency": "monthly", "category": "RENT_AND_UTILITIES", "value_score": 5, "status": "active", "last_charge_date": today.replace(day=1).isoformat()},
        {"user_id": user_db_id, "merchant_name": "Netflix", "average_amount": 17.99, "frequency": "monthly", "category": "ENTERTAINMENT", "value_score": 4, "status": "active", "last_charge_date": today.replace(day=1).isoformat()},
        {"user_id": user_db_id, "merchant_name": "Spotify", "average_amount": 11.99, "frequency": "monthly", "category": "ENTERTAINMENT", "value_score": 5, "status": "active", "last_charge_date": today.replace(day=3).isoformat()},
        {"user_id": user_db_id, "merchant_name": "Apple News+", "average_amount": 12.99, "frequency": "monthly", "category": "ENTERTAINMENT", "value_score": 1, "status": "flagged", "last_charge_date": today.replace(day=2).isoformat()},
        {"user_id": user_db_id, "merchant_name": "FitLife Gym", "average_amount": 50.00, "frequency": "monthly", "category": "PERSONAL_CARE", "value_score": 2, "status": "flagged", "last_charge_date": today.replace(day=1).isoformat()},
        {"user_id": user_db_id, "merchant_name": "Apple iCloud+", "average_amount": 2.99, "frequency": "monthly", "category": "GENERAL_SERVICES", "value_score": 4, "status": "active", "last_charge_date": today.replace(day=28 if today.day >= 28 else 28).isoformat()},
        {"user_id": user_db_id, "merchant_name": "Adobe Creative Cloud", "average_amount": 54.99, "frequency": "monthly", "category": "GENERAL_SERVICES", "value_score": 3, "status": "active", "last_charge_date": today.replace(day=5).isoformat()},
        {"user_id": user_db_id, "merchant_name": "YouTube Premium", "average_amount": 13.99, "frequency": "monthly", "category": "ENTERTAINMENT", "value_score": 4, "status": "active", "last_charge_date": today.replace(day=5).isoformat()},
        {"user_id": user_db_id, "merchant_name": "T-Mobile", "average_amount": 65.00, "frequency": "monthly", "category": "RENT_AND_UTILITIES", "value_score": 5, "status": "active", "last_charge_date": today.replace(day=8).isoformat()},
        {"user_id": user_db_id, "merchant_name": "Comcast Internet", "average_amount": 60.00, "frequency": "monthly", "category": "RENT_AND_UTILITIES", "value_score": 5, "status": "active", "last_charge_date": today.replace(day=min(15, today.day) if today.day >= 15 else 15).isoformat()},
    ]
