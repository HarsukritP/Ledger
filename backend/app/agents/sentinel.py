"""Sentinel agent — anomaly and spend guard. Catches unusual charges, budget drift, policy violations."""


class SentinelAgent:
    async def analyze(self, user_id: str, transactions: list) -> list:
        """Check for spending anomalies against established baselines."""
        # TODO: implement anomaly detection
        return []

    async def check_budget_drift(self, user_id: str) -> dict:
        """Check if spending categories are drifting from user baselines."""
        return {"drifting_categories": [], "alerts": []}
