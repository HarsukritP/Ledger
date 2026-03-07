"""North Star agent — goal planner. Tracks feasibility, runs scenarios, suggests optimizations."""


class NorthStarAgent:
    async def analyze(self, user_id: str) -> list:
        """Recalculate goal feasibility based on current spending and income patterns."""
        # TODO: implement with Backboard for reasoning
        return []

    async def run_scenario(self, user_id: str, scenario: str) -> dict:
        """Run a what-if scenario (strict/balanced/relaxed)."""
        return {
            "scenario": scenario,
            "adjustments": [],
            "new_completion_dates": {},
        }
