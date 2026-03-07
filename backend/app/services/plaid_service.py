"""Plaid API wrapper. Requires PLAID_CLIENT_ID and PLAID_SECRET env vars."""
from app.config import settings


class PlaidService:
    def __init__(self):
        self.client_id = settings.plaid_client_id
        self.secret = settings.plaid_secret
        self.env = settings.plaid_env
        self._configured = bool(self.client_id and self.secret)

    @property
    def is_configured(self) -> bool:
        return self._configured

    async def create_link_token(self, user_id: str) -> dict:
        if not self._configured:
            return {"link_token": "link-sandbox-placeholder", "expiration": "2026-03-08T00:00:00Z"}
        # TODO: implement with plaid-python SDK
        return {}

    async def exchange_public_token(self, public_token: str) -> dict:
        if not self._configured:
            return {"access_token": "access-sandbox-placeholder", "item_id": "item-sandbox"}
        return {}

    async def sync_transactions(self, access_token: str) -> dict:
        if not self._configured:
            return {"added": [], "modified": [], "removed": []}
        return {}

    async def get_accounts(self, access_token: str) -> list:
        if not self._configured:
            return [
                {"account_id": "acc_1", "name": "Plaid Checking", "type": "depository",
                 "subtype": "checking", "balance": {"current": 2847.32}}
            ]
        return []


plaid_service = PlaidService()
