"""North Star agent — goal planner. Tracks feasibility, runs scenarios, suggests optimizations.

FAIL-LOUD: No local fallbacks.
"""
import logging

logger = logging.getLogger(__name__)


class NorthStarAgent:
    async def analyze(self, user_id: str) -> list:
        """Assess goal feasibility via the Backboard North Star specialist."""
        from app.services.backboard_service import backboard_service

        backboard_service._require_configured()

        logger.info(f"[NORTH_STAR] analyzing goals for user={user_id}")
        result = await backboard_service._call_specialist(
            "north_star",
            "Assess feasibility of all goals given current income and spending "
            "patterns. Identify conflicts and suggest reallocation.",
        )
        recs = result.get("recommendations", [])
        if isinstance(recs, list) and recs:
            return [
                {"priority": 4 - i, "agent": "north_star", "description": str(r)}
                for i, r in enumerate(recs)
            ]
        logger.warning(f"[NORTH_STAR] no recommendations in response: {result}")
        return []

    async def run_scenario(self, user_id: str, scenario: str) -> dict:
        """Run a what-if spending scenario via Backboard."""
        from app.services.backboard_service import backboard_service

        backboard_service._require_configured()

        logger.info(f"[NORTH_STAR] running scenario={scenario} for user={user_id}")
        result = await backboard_service._call_specialist(
            "north_star",
            f"Run a '{scenario}' spending scenario. Show how each goal's timeline "
            f"changes under strict, balanced, and relaxed approaches.",
        )
        return result
