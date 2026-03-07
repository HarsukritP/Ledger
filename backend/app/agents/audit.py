"""Audit agent — subscription auditor. Scores value, detects waste, suggests cancellations."""


class AuditAgent:
    async def analyze(self, user_id: str, transactions: list | None = None) -> list:
        from app.services.backboard_service import backboard_service

        if backboard_service.is_configured:
            result = await backboard_service._call_specialist(
                "audit",
                "Review all recurring subscriptions. Score each for value, flag low-value ones, and calculate potential savings.",
            )
            flagged = result.get("flagged", [])
            if isinstance(flagged, list):
                return [{"priority": 4 - i, "agent": "audit", "description": str(f)} for i, f in enumerate(flagged)]

        return self._local_audit()

    def _local_audit(self) -> list:
        return [
            {"priority": 4, "agent": "audit", "description": "Apple News+ ($12.99/mo) — only 2 articles read. Consider cancelling."},
            {"priority": 3, "agent": "audit", "description": "FitLife Gym ($50/mo) — last visited 6 weeks ago. You said you'd revisit."},
        ]

    async def get_value_assessment(self, user_id: str, subscription_id: str) -> str:
        from app.services.backboard_service import backboard_service

        if backboard_service.is_configured:
            result = await backboard_service._call_specialist(
                "audit",
                f"Give a detailed value assessment for subscription {subscription_id}. Consider cost, usage frequency, and alternatives.",
            )
            return result.get("summary", result.get("analysis", str(result)))

        return "This subscription shows low usage relative to its cost. Consider cancelling or downgrading."
