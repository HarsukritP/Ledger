"""Central data service: reads real Plaid-synced data from Supabase for all dashboard views."""
import logging
from datetime import date, timedelta
from collections import defaultdict

from app.services.supabase_client import get_supabase
from app.services.plaid_service import plaid_service

logger = logging.getLogger("ledger.data")


class DataService:
    """Reads transactions, accounts, recurring charges, and goals from Supabase."""

    def _sb(self):
        sb = get_supabase()
        if not sb:
            raise RuntimeError("Supabase not configured")
        return sb

    # ── Accounts & Balances ───────────────────────────────────

    async def get_total_balance(self, user_db_id: str) -> float:
        """Derive balance from transaction history (income - expenses).

        Falls back to Plaid live balance only when there are no
        transactions in Supabase at all (e.g. fresh account before seeding).
        """
        all_txns = self.get_transactions(user_db_id, days=365)
        if all_txns:
            income = sum(
                float(t.get("amount", 0))
                for t in all_txns if t.get("type") == "income"
            )
            expenses = sum(
                float(t.get("amount", 0))
                for t in all_txns if t.get("type") in ("expense", "bill")
            )
            return income - expenses

        try:
            accounts = await plaid_service.get_accounts_for_user(user_db_id)
            return sum(a.get("balance_current") or 0 for a in accounts)
        except Exception as e:
            logger.warning(f"[DATA] Could not fetch live balances: {e}")
            return 0.0

    async def get_accounts(self, user_db_id: str) -> list[dict]:
        try:
            return await plaid_service.get_accounts_for_user(user_db_id)
        except Exception:
            return []

    # ── Transactions ──────────────────────────────────────────

    def get_transactions(self, user_db_id: str, days: int = 90) -> list[dict]:
        sb = self._sb()
        start = (date.today() - timedelta(days=days)).isoformat()
        result = (
            sb.table("transactions")
            .select("*")
            .eq("user_id", user_db_id)
            .gte("date", start)
            .order("date", desc=True)
            .execute()
        )
        return result.data or []

    def get_this_month_transactions(self, user_db_id: str) -> list[dict]:
        sb = self._sb()
        first_of_month = date.today().replace(day=1).isoformat()
        result = (
            sb.table("transactions")
            .select("*")
            .eq("user_id", user_db_id)
            .gte("date", first_of_month)
            .order("date", desc=True)
            .execute()
        )
        return result.data or []

    # ── Spending Summary ──────────────────────────────────────

    async def get_health_metrics(self, user_db_id: str) -> dict:
        balance = await self.get_total_balance(user_db_id)
        month_txns = self.get_this_month_transactions(user_db_id)

        spent = sum(
            float(t.get("amount", 0))
            for t in month_txns
            if t.get("type") in ("expense", "bill")
        )
        income = sum(
            float(t.get("amount", 0))
            for t in month_txns
            if t.get("type") == "income"
        )
        saved = max(income - spent, 0)

        all_txns = self.get_transactions(user_db_id, days=90)
        monthly_expenses = defaultdict(float)
        for t in all_txns:
            if t.get("type") in ("expense", "bill"):
                month_key = t.get("date", "")[:7]
                monthly_expenses[month_key] += float(t.get("amount", 0))

        if monthly_expenses:
            avg_monthly = sum(monthly_expenses.values()) / len(monthly_expenses)
        else:
            avg_monthly = 2400

        return {
            "balance": round(balance, 2),
            "spent_this_month": round(spent, 2),
            "saved": round(saved, 2),
            "budget_limit": round(avg_monthly, 2),
        }

    # ── Recurring Detection → Subscriptions ───────────────────

    def get_recurring_charges(self, user_db_id: str) -> list[dict]:
        sb = self._sb()
        result = (
            sb.table("recurring_charges")
            .select("*")
            .eq("user_id", user_db_id)
            .order("average_amount", desc=True)
            .execute()
        )
        if result.data:
            return result.data

        return self._detect_recurring_from_transactions(user_db_id)

    def _detect_recurring_from_transactions(self, user_db_id: str) -> list[dict]:
        """Auto-detect recurring charges from transaction history."""
        txns = self.get_transactions(user_db_id, days=90)
        merchant_data: dict[str, list[dict]] = defaultdict(list)

        for t in txns:
            if t.get("type") in ("expense", "bill") and t.get("merchant_name"):
                merchant_data[t["merchant_name"]].append(t)

        recurring = []
        for merchant, charges in merchant_data.items():
            if len(charges) >= 2:
                amounts = [float(c.get("amount", 0)) for c in charges]
                avg = sum(amounts) / len(amounts)
                amount_variance = max(amounts) - min(amounts) if len(amounts) > 1 else 0

                if amount_variance < avg * 0.2:
                    dates = sorted(c.get("date", "") for c in charges)
                    category = charges[0].get("category", "Other")

                    sb = self._sb()
                    row = {
                        "user_id": user_db_id,
                        "merchant_name": merchant,
                        "average_amount": round(avg, 2),
                        "frequency": "monthly",
                        "category": category,
                        "value_score": 3,
                        "status": "active",
                        "last_charge_date": dates[-1] if dates else None,
                    }
                    try:
                        sb.table("recurring_charges").upsert(
                            row,
                            on_conflict="user_id,merchant_name",
                        ).execute()
                    except Exception:
                        try:
                            sb.table("recurring_charges").insert(row).execute()
                        except Exception as e:
                            logger.warning(f"[DATA] Could not store recurring charge: {e}")

                    row["id"] = merchant
                    recurring.append(row)

        return recurring

    # ── Goals (from Supabase) ─────────────────────────────────

    def get_goals(self, user_db_id: str) -> list[dict]:
        sb = self._sb()
        result = (
            sb.table("goals")
            .select("*")
            .eq("user_id", user_db_id)
            .order("created_at", desc=False)
            .execute()
        )
        return result.data or []

    def create_goal(self, user_db_id: str, data: dict) -> dict:
        sb = self._sb()
        row = {
            "user_id": user_db_id,
            "name": data["name"],
            "target_amount": data["target_amount"],
            "current_amount": data.get("current_amount", 0),
            "target_date": data.get("target_date"),
        }
        result = sb.table("goals").insert(row).execute()
        return result.data[0] if result.data else row

    def update_goal(self, user_db_id: str, goal_id: str, data: dict) -> dict:
        sb = self._sb()
        update = {k: v for k, v in data.items() if v is not None}
        result = (
            sb.table("goals")
            .update(update)
            .eq("id", goal_id)
            .eq("user_id", user_db_id)
            .execute()
        )
        return result.data[0] if result.data else {}

    def delete_goal(self, user_db_id: str, goal_id: str):
        sb = self._sb()
        sb.table("goals").delete().eq("id", goal_id).eq("user_id", user_db_id).execute()

    # ── Forecast: Upcoming Events ─────────────────────────────

    def get_upcoming_events(self, user_db_id: str) -> list[dict]:
        """Build upcoming 30-day forecast from recurring charges and past patterns."""
        recurring = self.get_recurring_charges(user_db_id)
        today = date.today()
        events = []

        for i, r in enumerate(recurring):
            last_str = r.get("last_charge_date")
            amount = float(r.get("average_amount", 0))
            merchant = r.get("merchant_name", "Unknown")
            category = r.get("category", "")

            if last_str:
                try:
                    last_date = date.fromisoformat(last_str)
                    next_date = last_date.replace(month=last_date.month + 1) if last_date.month < 12 else last_date.replace(year=last_date.year + 1, month=1)
                    if next_date < today:
                        next_date = today + timedelta(days=(last_date.day - today.day) % 30 or 30)
                except (ValueError, OverflowError):
                    next_date = today + timedelta(days=i * 3 + 5)
            else:
                next_date = today + timedelta(days=i * 3 + 5)

            if next_date <= today + timedelta(days=30):
                events.append({
                    "id": str(i + 1),
                    "date": next_date.isoformat(),
                    "name": merchant,
                    "amount": amount,
                    "type": "bill",
                    "category": category,
                })

        txns = self.get_transactions(user_db_id, days=90)
        income_txns = [t for t in txns if t.get("type") == "income"]
        if income_txns:
            income_dates: dict[int, list[float]] = defaultdict(list)
            for t in income_txns:
                try:
                    d = date.fromisoformat(t["date"])
                    amt = float(t.get("amount", 0))
                    if amt >= 100:
                        income_dates[d.day].append(amt)
                except (ValueError, KeyError):
                    pass

            for day_of_month, amounts in income_dates.items():
                if len(amounts) < 2:
                    continue
                avg_income = sum(amounts) / len(amounts)
                next_pay = today.replace(day=min(day_of_month, 28))
                if next_pay <= today:
                    if today.month < 12:
                        next_pay = next_pay.replace(month=today.month + 1)
                    else:
                        next_pay = next_pay.replace(year=today.year + 1, month=1)

                if next_pay <= today + timedelta(days=30):
                    merchant = next(
                        (t.get("merchant_name", "Paycheck") for t in income_txns
                         if float(t.get("amount", 0)) >= 100),
                        "Paycheck",
                    )
                    events.append({
                        "id": f"inc_{day_of_month}",
                        "date": next_pay.isoformat(),
                        "name": merchant,
                        "amount": round(avg_income, 2),
                        "type": "income",
                        "category": "Income",
                    })

        goals = self.get_goals(user_db_id)
        logger.info(f"[DATA] Found {len(goals)} goals for forecast")
        for g in goals:
            target = float(g.get("target_amount", 0))
            current = float(g.get("current_amount", 0))
            remaining = target - current
            if remaining <= 0:
                logger.info(f"[DATA] Skipping goal '{g.get('name')}' — already reached")
                continue

            raw_date = g.get("target_date")
            if raw_date:
                try:
                    target_date = date.fromisoformat(str(raw_date)[:10])
                except (ValueError, TypeError):
                    logger.warning(f"[DATA] Could not parse target_date '{raw_date}' for goal '{g.get('name')}'")
                    target_date = today + timedelta(days=180)
            else:
                target_date = today + timedelta(days=180)

            months_left = max(
                (target_date.year - today.year) * 12 + (target_date.month - today.month),
                1,
            )
            monthly_contribution = round(remaining / months_left, 2)

            next_contrib = today.replace(day=1)
            if today.month < 12:
                next_contrib = next_contrib.replace(month=today.month + 1)
            else:
                next_contrib = next_contrib.replace(year=today.year + 1, month=1)

            if next_contrib <= today + timedelta(days=30):
                logger.info(f"[DATA] Goal '{g.get('name')}' → ${monthly_contribution}/mo on {next_contrib}")
                events.append({
                    "id": f"goal_{g.get('id', '')}",
                    "date": next_contrib.isoformat(),
                    "name": f"Savings: {g.get('name', 'Goal')}",
                    "amount": monthly_contribution,
                    "type": "savings",
                    "category": "Goal",
                })
            else:
                logger.info(f"[DATA] Goal '{g.get('name')}' next_contrib={next_contrib} outside 30-day window")

        events.sort(key=lambda e: e["date"])
        return events

    # ── Action Queue ──────────────────────────────────────────

    def get_action_queue(self, user_db_id: str) -> list[dict]:
        sb = self._sb()
        result = (
            sb.table("action_queue")
            .select("*")
            .eq("user_id", user_db_id)
            .eq("status", "pending")
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )
        return result.data or []

    # ── Spending by Category ──────────────────────────────────

    def get_category_breakdown(self, user_db_id: str, days: int = 30) -> list[dict]:
        txns = self.get_transactions(user_db_id, days=days)
        cats: dict[str, float] = defaultdict(float)
        for t in txns:
            if t.get("type") in ("expense", "bill"):
                cat = t.get("category") or "Other"
                cats[cat] += float(t.get("amount", 0))

        return sorted(
            [{"category": k, "amount": round(v, 2)} for k, v in cats.items()],
            key=lambda x: x["amount"],
            reverse=True,
        )


data_service = DataService()
