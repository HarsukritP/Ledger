"""North Star agent — goal planner. Tracks feasibility, runs scenarios, suggests optimizations."""


class NorthStarAgent:
    async def analyze(self, user_id: str) -> list:
        from app.services.backboard_service import backboard_service

        if backboard_service.is_configured:
            result = await backboard_service._call_specialist(
                "north_star",
                "Assess feasibility of all goals given current income and spending patterns. Identify conflicts and suggest reallocation.",
            )
            recs = result.get("recommendations", [])
            if isinstance(recs, list):
                return [{"priority": 4 - i, "agent": "north_star", "description": str(r)} for i, r in enumerate(recs)]

        return self._local_goals()

    def _local_goals(self) -> list:
        return [
            {"priority": 4, "agent": "north_star", "description": "Japan Trip needs $422/mo but you're averaging $350 — at risk."},
            {"priority": 2, "agent": "north_star", "description": "Emergency Fund on track at $1,450 of $2,000. Keep it up."},
        ]

    async def run_scenario(self, user_id: str, scenario: str) -> dict:
        from app.services.backboard_service import backboard_service

        if backboard_service.is_configured:
            result = await backboard_service._call_specialist(
                "north_star",
                f"Run a '{scenario}' spending scenario. Show how each goal's timeline changes under strict, balanced, and relaxed approaches.",
            )
            if "error" not in result:
                return result

        return {
            "scenario": scenario,
            "adjustments": [
                {"goal": "Japan Trip", "change": "Push deadline by 2 months" if scenario == "relaxed" else "Cut dining by $100/mo"},
            ],
            "summary": f"Under the {scenario} plan, Japan Trip becomes feasible with minor adjustments.",
        }
