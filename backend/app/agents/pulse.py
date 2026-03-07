"""Pulse agent — cashflow forecaster. Predicts balances, warns about crunches.

FAIL-LOUD: No local fallbacks. If Backboard fails, the error propagates.
"""
import logging

logger = logging.getLogger(__name__)


class PulseAgent:
    async def analyze(self, user_id: str, transactions: list | None = None) -> list:
        """Run a cashflow analysis via the Backboard Pulse specialist."""
        from app.services.backboard_service import backboard_service

        backboard_service._require_configured()

        logger.info(f"[PULSE] analyzing cashflow for user={user_id}")
        result = await backboard_service._call_specialist(
            "pulse",
            "Analyze the user's cash flow for the next 30 days. "
            "Identify danger zones and recommend actions.",
        )
        recs = result.get("recommendations", [])
        if isinstance(recs, list) and recs:
            return [
                {"priority": 5 - i, "agent": "pulse", "description": str(r)}
                for i, r in enumerate(recs)
            ]
        logger.warning(f"[PULSE] no recommendations in response: {result}")
        return []

    async def generate_forecast(self, user_id: str, days: int = 30) -> dict:
        """Generate an N-day cash flow forecast via Backboard."""
        from app.services.backboard_service import backboard_service

        backboard_service._require_configured()

        logger.info(f"[PULSE] generating {days}-day forecast for user={user_id}")
        result = await backboard_service._call_specialist(
            "pulse",
            f"Generate a {days}-day cash flow forecast with daily projected "
            f"balances, danger zones, and events.",
        )
        return result
