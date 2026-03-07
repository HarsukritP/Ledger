"""Council orchestrator — routes to specialist agents, synthesizes outputs, manages action queue."""
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

    async def run_all_agents(self, user_id: str, transactions: list) -> dict:
        """Run all agents on new transaction data and merge outputs."""
        results = {
            "forecast": await self.pulse.analyze(user_id, transactions),
            "subscriptions": await self.audit.analyze(user_id, transactions),
            "goals": await self.north_star.analyze(user_id),
            "anomalies": await self.sentinel.analyze(user_id, transactions),
        }
        actions = self._synthesize_actions(results)
        return {"agent_results": results, "actions": actions}

    def _synthesize_actions(self, results: dict) -> list:
        """Merge agent outputs into a prioritized action queue (max 5 items)."""
        actions = []
        for source, items in results.items():
            if isinstance(items, list):
                actions.extend(items)
        actions.sort(key=lambda a: a.get("priority", 0), reverse=True)
        return actions[:5]

    async def route_chat(self, user_id: str, message: str) -> dict:
        """Route a user chat message to the most relevant agent."""
        lower = message.lower()
        if any(w in lower for w in ["subscription", "cancel", "recurring", "paying for"]):
            agent = "audit"
        elif any(w in lower for w in ["goal", "save", "saving", "target", "afford"]):
            agent = "north-star"
        elif any(w in lower for w in ["spend", "unusual", "weird", "charge"]):
            agent = "sentinel"
        else:
            agent = "pulse"

        return {
            "agent": agent,
            "response": f"[{agent}] would respond to: {message}",
        }


orchestrator = Orchestrator()
