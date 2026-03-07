"""Sentinel agent — anomaly detection and spend guard.

FAIL-LOUD: No local fallbacks.
"""
import logging

logger = logging.getLogger(__name__)


class SentinelAgent:
    async def analyze(self, user_id: str, transactions: list | None = None) -> list:
        """Scan for anomalies via the Backboard Sentinel specialist."""
        from app.services.backboard_service import backboard_service

        backboard_service._require_configured()

        logger.info(f"[SENTINEL] scanning for anomalies for user={user_id}")
        result = await backboard_service._call_specialist(
            "sentinel",
            "Scan recent transactions for anomalies, budget drift, and "
            "suspicious charges. Compare against historical baselines.",
        )
        alerts = result.get("alerts", [])
        if isinstance(alerts, list) and alerts:
            return [
                {"priority": 5 - i, "agent": "sentinel", "description": str(a)}
                for i, a in enumerate(alerts)
            ]
        logger.warning(f"[SENTINEL] no alerts in response: {result}")
        return []

    async def check_budget_drift(self, user_id: str) -> dict:
        """Check for budget drift across spending categories."""
        from app.services.backboard_service import backboard_service

        backboard_service._require_configured()

        logger.info(f"[SENTINEL] checking budget drift for user={user_id}")
        result = await backboard_service._call_specialist(
            "sentinel",
            "Check for budget drift across all spending categories. "
            "Compare this month to the 8-week average.",
        )
        return result
