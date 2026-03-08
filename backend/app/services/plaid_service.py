"""Plaid API integration using the official plaid-python SDK."""
import json
import logging
from datetime import date, timedelta

import plaid
from plaid.api import plaid_api
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.sandbox_public_token_create_request import SandboxPublicTokenCreateRequest
from plaid.model.transactions_sync_request import TransactionsSyncRequest
from plaid.model.accounts_balance_get_request import AccountsBalanceGetRequest
from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid.model.transactions_get_request_options import TransactionsGetRequestOptions

from app.config import settings
from app.services.supabase_client import get_supabase

logger = logging.getLogger("ledger.plaid")

PLAID_ENVS = {
    "sandbox": plaid.Environment.Sandbox,
    "production": plaid.Environment.Production,
}
if hasattr(plaid.Environment, "Development"):
    PLAID_ENVS["development"] = plaid.Environment.Development


class PlaidError(Exception):
    pass


class PlaidService:
    def __init__(self):
        self.client_id = settings.plaid_client_id
        self.secret = settings.plaid_secret
        self.env = settings.plaid_env
        self._configured = bool(self.client_id and self.secret)
        self._client: plaid_api.PlaidApi | None = None

    @property
    def is_configured(self) -> bool:
        return self._configured

    def _require_configured(self):
        if not self._configured:
            raise PlaidError(
                "PLAID_CLIENT_ID or PLAID_SECRET not set. "
                "Plaid features WILL NOT WORK."
            )

    def _get_client(self) -> plaid_api.PlaidApi:
        self._require_configured()
        if self._client is None:
            configuration = plaid.Configuration(
                host=PLAID_ENVS.get(self.env, plaid.Environment.Sandbox),
                api_key={
                    "clientId": self.client_id,
                    "secret": self.secret,
                },
            )
            api_client = plaid.ApiClient(configuration)
            self._client = plaid_api.PlaidApi(api_client)
            logger.info(f"[PLAID] Client initialized — env={self.env}")
        return self._client

    # ── Link Token ────────────────────────────────────────────

    async def create_link_token(self, user_id: str) -> dict:
        """Create a Plaid Link token so the frontend can open the Link UI."""
        self._require_configured()
        client = self._get_client()

        request = LinkTokenCreateRequest(
            products=[Products("auth"), Products("transactions")],
            client_name="Ledger",
            country_codes=[CountryCode("US")],
            language="en",
            user=LinkTokenCreateRequestUser(client_user_id=user_id),
        )

        logger.info(f"[PLAID] Creating link token for user={user_id}")
        try:
            response = client.link_token_create(request)
            result = response.to_dict()
            logger.info(f"[PLAID] Link token created — expires={result.get('expiration')}")
            return {
                "link_token": result["link_token"],
                "expiration": str(result.get("expiration", "")),
            }
        except plaid.ApiException as e:
            body = json.loads(e.body) if e.body else {}
            logger.error(f"[PLAID] link_token_create failed: {body}")
            raise PlaidError(f"Plaid link_token_create failed: {body.get('error_message', str(e))}")

    # ── Token Exchange ────────────────────────────────────────

    async def exchange_public_token(self, public_token: str, user_db_id: str) -> dict:
        """Exchange a public_token from Link for a permanent access_token, then store it."""
        self._require_configured()
        client = self._get_client()

        request = ItemPublicTokenExchangeRequest(public_token=public_token)

        logger.info("[PLAID] Exchanging public token...")
        try:
            response = client.item_public_token_exchange(request)
            result = response.to_dict()
            access_token = result["access_token"]
            item_id = result["item_id"]
            logger.info(f"[PLAID] Token exchanged — item_id={item_id}")

            accounts = await self._fetch_accounts(access_token)
            institution_name = "Linked Bank"
            if accounts:
                institution_name = accounts[0].get("institution_name", "Linked Bank")

            sb = get_supabase()
            if sb:
                sb.table("linked_accounts").insert({
                    "user_id": user_db_id,
                    "plaid_access_token": access_token,
                    "plaid_item_id": item_id,
                    "institution_name": institution_name,
                    "accounts": json.dumps([
                        {
                            "account_id": a["account_id"],
                            "name": a["name"],
                            "type": a["type"],
                            "subtype": a.get("subtype", ""),
                            "balance_current": a.get("balance_current"),
                            "balance_available": a.get("balance_available"),
                        }
                        for a in accounts
                    ]),
                }).execute()
                logger.info(f"[PLAID] Stored linked account in Supabase — item_id={item_id}")

            return {
                "access_token": access_token,
                "item_id": item_id,
                "accounts_linked": len(accounts),
                "accounts": accounts,
            }
        except plaid.ApiException as e:
            body = json.loads(e.body) if e.body else {}
            logger.error(f"[PLAID] exchange failed: {body}")
            raise PlaidError(f"Plaid exchange failed: {body.get('error_message', str(e))}")

    # ── Accounts ──────────────────────────────────────────────

    async def _fetch_accounts(self, access_token: str) -> list[dict]:
        """Fetch accounts + balances for a given access_token."""
        client = self._get_client()
        request = AccountsBalanceGetRequest(access_token=access_token)

        try:
            response = client.accounts_balance_get(request)
            result = response.to_dict()
            accounts = []
            for acct in result.get("accounts", []):
                balances = acct.get("balances", {})
                accounts.append({
                    "account_id": acct.get("account_id", ""),
                    "name": acct.get("name", ""),
                    "official_name": acct.get("official_name", ""),
                    "type": str(acct.get("type", "")),
                    "subtype": str(acct.get("subtype", "")),
                    "balance_current": balances.get("current"),
                    "balance_available": balances.get("available"),
                    "balance_limit": balances.get("limit"),
                    "currency": balances.get("iso_currency_code", "USD"),
                })
            return accounts
        except plaid.ApiException as e:
            body = json.loads(e.body) if e.body else {}
            logger.error(f"[PLAID] accounts_balance_get failed: {body}")
            raise PlaidError(f"Plaid accounts failed: {body.get('error_message', str(e))}")

    async def get_accounts_for_user(self, user_db_id: str) -> list[dict]:
        """Get all linked accounts for a user, refreshing balances from Plaid."""
        sb = get_supabase()
        if not sb:
            raise PlaidError("Supabase not configured")

        result = sb.table("linked_accounts").select("*").eq("user_id", user_db_id).execute()
        if not result.data:
            return []

        all_accounts = []
        for linked in result.data:
            try:
                accounts = await self._fetch_accounts(linked["plaid_access_token"])
                for acct in accounts:
                    acct["institution_name"] = linked.get("institution_name", "Bank")
                    acct["linked_account_id"] = linked["id"]
                all_accounts.extend(accounts)
            except PlaidError as e:
                logger.warning(f"[PLAID] Could not refresh accounts for item={linked.get('plaid_item_id')}: {e}")
                stored = json.loads(linked.get("accounts", "[]")) if isinstance(linked.get("accounts"), str) else (linked.get("accounts") or [])
                for acct in stored:
                    acct["institution_name"] = linked.get("institution_name", "Bank")
                    acct["linked_account_id"] = linked["id"]
                    acct["stale"] = True
                all_accounts.extend(stored)

        return all_accounts

    # ── Transaction Sync ──────────────────────────────────────

    async def sync_transactions(self, user_db_id: str) -> dict:
        """Sync transactions from Plaid for all of a user's linked accounts."""
        self._require_configured()
        sb = get_supabase()
        if not sb:
            raise PlaidError("Supabase not configured")

        result = sb.table("linked_accounts").select("*").eq("user_id", user_db_id).execute()
        if not result.data:
            raise PlaidError("No linked accounts found. Please link a bank account first.")

        total_added = 0
        total_modified = 0
        total_removed = 0

        for linked in result.data:
            access_token = linked["plaid_access_token"]
            try:
                added, modified, removed = await self._sync_item_transactions(
                    access_token=access_token,
                    user_db_id=user_db_id,
                )
                total_added += added
                total_modified += modified
                total_removed += removed

                from datetime import datetime
                sb.table("linked_accounts").update({
                    "last_synced_at": datetime.utcnow().isoformat(),
                }).eq("id", linked["id"]).execute()

            except PlaidError as e:
                logger.error(f"[PLAID] sync failed for item={linked.get('plaid_item_id')}: {e}")

        logger.info(f"[PLAID] Sync complete — added={total_added}, modified={total_modified}, removed={total_removed}")
        return {
            "status": "synced",
            "new_transactions": total_added,
            "modified": total_modified,
            "removed": total_removed,
        }

    async def _sync_item_transactions(self, access_token: str, user_db_id: str) -> tuple[int, int, int]:
        """Use transactions/sync for a single Plaid item."""
        client = self._get_client()
        sb = get_supabase()

        added_count = 0
        modified_count = 0
        removed_count = 0
        cursor = ""
        has_more = True

        while has_more:
            kwargs = {"access_token": access_token}
            if cursor:
                kwargs["cursor"] = cursor
            request = TransactionsSyncRequest(**kwargs)
            try:
                response = client.transactions_sync(request)
                data = response.to_dict()
            except plaid.ApiException as e:
                body = json.loads(e.body) if e.body else {}
                logger.error(f"[PLAID] transactions_sync failed: {body}")
                raise PlaidError(f"transactions_sync failed: {body.get('error_message', str(e))}")

            for txn in data.get("added", []):
                self._upsert_transaction(sb, user_db_id, txn)
                added_count += 1

            for txn in data.get("modified", []):
                self._upsert_transaction(sb, user_db_id, txn)
                modified_count += 1

            for txn in data.get("removed", []):
                txn_id = txn.get("transaction_id", "")
                if txn_id and sb:
                    sb.table("transactions").delete().eq(
                        "plaid_transaction_id", txn_id
                    ).eq("user_id", user_db_id).execute()
                removed_count += 1

            has_more = data.get("has_more", False)
            cursor = data.get("next_cursor", "")

        return added_count, modified_count, removed_count

    def _upsert_transaction(self, sb, user_db_id: str, txn: dict):
        """Insert or update a single Plaid transaction in Supabase."""
        if not sb:
            return

        plaid_id = txn.get("transaction_id", "")
        category_list = txn.get("personal_finance_category", {})
        category = ""
        if isinstance(category_list, dict):
            category = category_list.get("primary", "")
        elif isinstance(category_list, list) and category_list:
            category = category_list[0]

        amount = txn.get("amount", 0)
        txn_type = "expense" if amount > 0 else "income"

        pfc = txn.get("personal_finance_category") or {}
        detailed = pfc.get("detailed", "") if isinstance(pfc, dict) else ""

        row = {
            "user_id": user_db_id,
            "plaid_transaction_id": plaid_id,
            "account_id": txn.get("account_id", ""),
            "amount": abs(amount),
            "date": str(txn.get("date", "")),
            "merchant_name": txn.get("merchant_name") or txn.get("name", ""),
            "category": category,
            "type": txn_type,
            "is_recurring": bool(detailed.startswith("SUBSCRIPTION")),
        }

        existing = sb.table("transactions").select("id").eq(
            "plaid_transaction_id", plaid_id
        ).eq("user_id", user_db_id).execute()

        if existing.data:
            sb.table("transactions").update(row).eq("id", existing.data[0]["id"]).execute()
        else:
            sb.table("transactions").insert(row).execute()

    # ── Sandbox Helper ────────────────────────────────────────

    async def create_sandbox_token(self, institution_id: str = "ins_109508") -> str:
        """Create a sandbox public token for testing (skips the Link UI)."""
        self._require_configured()
        client = self._get_client()

        request = SandboxPublicTokenCreateRequest(
            institution_id=institution_id,
            initial_products=[Products("auth"), Products("transactions")],
        )

        logger.info(f"[PLAID] Creating sandbox public token for institution={institution_id}")
        try:
            response = client.sandbox_public_token_create(request)
            result = response.to_dict()
            logger.info("[PLAID] Sandbox public token created")
            return result["public_token"]
        except plaid.ApiException as e:
            body = json.loads(e.body) if e.body else {}
            logger.error(f"[PLAID] sandbox_public_token_create failed: {body}")
            raise PlaidError(f"Sandbox token creation failed: {body.get('error_message', str(e))}")

    # ── Transaction History (Fallback) ────────────────────────

    async def get_transactions(self, user_db_id: str, days: int = 30) -> list[dict]:
        """Fetch transactions from Supabase for a user (already synced from Plaid)."""
        sb = get_supabase()
        if not sb:
            raise PlaidError("Supabase not configured")

        start_date = (date.today() - timedelta(days=days)).isoformat()
        result = (
            sb.table("transactions")
            .select("*")
            .eq("user_id", user_db_id)
            .gte("date", start_date)
            .order("date", desc=True)
            .execute()
        )
        return result.data or []


plaid_service = PlaidService()
