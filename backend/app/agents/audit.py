"""Audit agent — subscription auditor. Tracks recurring charges, scores value, suggests cancellations."""


class AuditAgent:
    async def analyze(self, user_id: str, transactions: list) -> list:
        """Detect and score recurring subscriptions."""
        # TODO: implement subscription detection and value scoring
        return []

    async def get_value_assessment(self, user_id: str, subscription_id: str) -> str:
        """Generate a natural language assessment of a subscription's value."""
        return "This subscription shows low usage. Consider cancelling."
