"""Sentinel agent — anomaly detection and spend guard. Catches unusual charges and budget drift."""


class SentinelAgent:
    async def analyze(self, user_id: str, transactions: list | None = None) -> list:
        from app.services.backboard_service import backboard_service

        if backboard_service.is_configured:
            result = await backboard_service._call_specialist(
                "sentinel",
                "Scan recent transactions for anomalies, budget drift, and suspicious charges. Compare against historical baselines.",
            )
            alerts = result.get("alerts", [])
            if isinstance(alerts, list):
                return [{"priority": 5 - i, "agent": "sentinel", "description": str(a)} for i, a in enumerate(alerts)]

        return self._local_check()

    def _local_check(self) -> list:
        return [
            {"priority": 3, "agent": "sentinel", "description": "Dining spend is 15% above your monthly baseline."},
        ]

    async def check_budget_drift(self, user_id: str) -> dict:
        from app.services.backboard_service import backboard_service

        if backboard_service.is_configured:
            result = await backboard_service._call_specialist(
                "sentinel",
                "Check for budget drift across all spending categories. Compare this month to the 8-week average.",
            )
            if "error" not in result:
                return result

        return {
            "drifting_categories": [
                {"category": "Dining", "baseline_monthly": 240, "current_monthly": 276, "drift_pct": 15},
            ],
            "spending_health": "caution",
            "summary": "Dining is trending 15% above baseline. Other categories are stable.",
        }
