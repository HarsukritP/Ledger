"""Audit agent — subscription auditor. Scores value, detects waste, suggests cancellations.

FAIL-LOUD: No local fallbacks.
"""
import logging

logger = logging.getLogger(__name__)


class AuditAgent:
    async def analyze(self, user_id: str, transactions: list | None = None) -> list:
        """Review recurring subscriptions via the Backboard Audit specialist."""
        from app.services.backboard_service import backboard_service

        backboard_service._require_configured()

        logger.info(f"[AUDIT] analyzing subscriptions for user={user_id}")
        result = await backboard_service._call_specialist(
            "audit",
            "Review all recurring subscriptions. Score each for value, "
            "flag low-value ones, and calculate potential savings.",
        )
        flagged = result.get("flagged", [])
        if isinstance(flagged, list) and flagged:
            return [
                {"priority": 4 - i, "agent": "audit", "description": str(f)}
                for i, f in enumerate(flagged)
            ]
        logger.warning(f"[AUDIT] no flagged items in response: {result}")
        return []

    async def get_value_assessment(self, user_id: str, subscription_id: str) -> str:
        """Get a detailed value assessment for a specific subscription."""
        from app.services.backboard_service import backboard_service

        backboard_service._require_configured()

        logger.info(f"[AUDIT] value assessment for sub={subscription_id}")
        result = await backboard_service._call_specialist(
            "audit",
            f"Give a detailed value assessment for subscription {subscription_id}. "
            f"Consider cost, usage frequency, and alternatives.",
        )
        return result.get("summary", result.get("analysis", str(result)))
