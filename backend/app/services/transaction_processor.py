"""Transaction processing pipeline: sync, categorize, detect recurring, trigger agents."""
from app.services.demo_data import DEMO_TRANSACTIONS


class TransactionProcessor:
    async def process_new_transactions(self, user_id: str, raw_transactions: list) -> dict:
        """Process raw Plaid transactions: categorize, detect recurring, store."""
        categorized = self._categorize(raw_transactions)
        recurring = self._detect_recurring(categorized)
        return {
            "processed": len(categorized),
            "recurring_detected": len(recurring),
            "categories": list({t.get("category", "Other") for t in categorized}),
        }

    def _categorize(self, transactions: list) -> list:
        """Enrich transactions with categories (LLM-based in production)."""
        return transactions

    def _detect_recurring(self, transactions: list) -> list:
        """Find recurring charges by merchant frequency patterns."""
        merchant_counts: dict[str, int] = {}
        for t in transactions:
            if t.get("amount", 0) < 0:
                name = t.get("merchant_name", "")
                merchant_counts[name] = merchant_counts.get(name, 0) + 1
        return [m for m, c in merchant_counts.items() if c >= 2]

    def get_demo_transactions(self, limit: int = 50) -> list:
        return DEMO_TRANSACTIONS[:limit]


transaction_processor = TransactionProcessor()
