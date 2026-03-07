"""Council orchestrator — routes user messages via Backboard, synthesizes outputs, manages actions."""
from app.agents.pulse import PulseAgent
from app.agents.audit import AuditAgent
from app.agents.north_star import NorthStarAgent
from app.agents.sentinel import SentinelAgent


class Orchestrator:
    def __init__(self):
        self.pulse = PulseAgent()
        self.audit = AuditAgent()
        self.north_star = NorthStarAgent()
        self.sentinel = SentinelAgent()

    async def run_all_agents(self, user_id: str, transactions: list | None = None) -> dict:
        """Run all specialist agents and merge outputs into a prioritized action queue."""
        results = {
            "forecast": await self.pulse.analyze(user_id, transactions),
            "subscriptions": await self.audit.analyze(user_id, transactions),
            "goals": await self.north_star.analyze(user_id),
            "anomalies": await self.sentinel.analyze(user_id, transactions),
        }
        actions = self._synthesize_actions(results)
        return {"agent_results": results, "actions": actions}

    def _synthesize_actions(self, results: dict) -> list:
        actions = []
        for items in results.values():
            if isinstance(items, list):
                actions.extend(items)
        actions.sort(key=lambda a: a.get("priority", 0), reverse=True)
        return actions[:5]

    async def route_chat(self, user_sub: str, message: str, user_name: str = "") -> dict:
        """Route a chat message through the Backboard Council for full agent orchestration."""
        from app.services.backboard_service import backboard_service

        if backboard_service.is_configured:
            return await backboard_service.send_message(
                user_sub=user_sub,
                message=message,
                user_name=user_name,
            )

        return backboard_service._fallback_response(message)


orchestrator = Orchestrator()
