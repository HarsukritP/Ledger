"""Pulse agent — cashflow forecaster. Predicts balances, warns about crunches."""
from app.services.demo_data import DEMO_TRANSACTIONS, get_spending_summary


class PulseAgent:
    async def analyze(self, user_id: str, transactions: list | None = None) -> list:
        """Run a cashflow analysis using Backboard specialist or local fallback."""
        from app.services.backboard_service import backboard_service

        if backboard_service.is_configured:
            result = await backboard_service._call_specialist(
                "pulse",
                "Analyze the user's cash flow for the next 30 days. Identify danger zones and recommend actions.",
            )
            recs = result.get("recommendations", [])
            if isinstance(recs, list):
                return [{"priority": 5 - i, "agent": "pulse", "description": r} for i, r in enumerate(recs)]

        return self._local_forecast()

    def _local_forecast(self) -> list:
        return [
            {"priority": 5, "agent": "pulse", "description": "Balance may dip to $380 on March 10 — hold off on large purchases."},
            {"priority": 3, "agent": "pulse", "description": "Your paycheck lands March 11 — schedule bill payments after that."},
        ]

    async def generate_forecast(self, user_id: str, days: int = 30) -> dict:
        from app.services.backboard_service import backboard_service

        if backboard_service.is_configured:
            result = await backboard_service._call_specialist(
                "pulse",
                f"Generate a {days}-day cash flow forecast with daily projected balances, danger zones, and events.",
            )
            if "error" not in result:
                return result

        return {
            "start_balance": 2847.32,
            "predicted_low": 380.33,
            "predicted_low_date": "2026-03-10",
            "danger_zones": [{"start": "2026-03-09", "end": "2026-03-11", "min_balance": 380.33}],
            "events": [],
            "recommendations": ["Hold off on dining out until paycheck lands March 11."],
            "summary": "Balance dips to $380 between March 9-11 due to phone bill. Paycheck on the 11th resolves it.",
        }
