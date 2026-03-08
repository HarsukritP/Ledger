"""Email integration service — scans Gmail for billing receipts to detect recurring charges."""
import logging
import re
from datetime import datetime, timedelta
from typing import Optional

import httpx
from app.config import settings
from app.services.supabase_client import get_supabase

logger = logging.getLogger("ledger.email")

GMAIL_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GMAIL_TOKEN_URL = "https://oauth2.googleapis.com/token"
GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1"

BILLING_KEYWORDS = [
    "receipt", "invoice", "payment confirmation", "subscription",
    "billing statement", "payment received", "your order",
    "renewal", "charged", "autopay", "monthly statement",
]

MERCHANT_PATTERNS = {
    "netflix": ("Netflix", "ENTERTAINMENT"),
    "spotify": ("Spotify", "ENTERTAINMENT"),
    "apple": ("Apple", "GENERAL_SERVICES"),
    "google": ("Google", "GENERAL_SERVICES"),
    "amazon prime": ("Amazon Prime", "GENERAL_SERVICES"),
    "adobe": ("Adobe Creative Cloud", "GENERAL_SERVICES"),
    "hulu": ("Hulu", "ENTERTAINMENT"),
    "disney": ("Disney+", "ENTERTAINMENT"),
    "youtube": ("YouTube Premium", "ENTERTAINMENT"),
    "dropbox": ("Dropbox", "GENERAL_SERVICES"),
    "microsoft": ("Microsoft 365", "GENERAL_SERVICES"),
    "gym": ("Gym Membership", "PERSONAL_CARE"),
    "planet fitness": ("Planet Fitness", "PERSONAL_CARE"),
    "t-mobile": ("T-Mobile", "RENT_AND_UTILITIES"),
    "at&t": ("AT&T", "RENT_AND_UTILITIES"),
    "verizon": ("Verizon", "RENT_AND_UTILITIES"),
    "comcast": ("Comcast Internet", "RENT_AND_UTILITIES"),
    "xfinity": ("Xfinity", "RENT_AND_UTILITIES"),
}

AMOUNT_RE = re.compile(r"\$\s?(\d{1,5}(?:\.\d{2})?)")


class EmailService:
    def get_gmail_auth_url(self, user_db_id: str, redirect_uri: str) -> str:
        """Build the Gmail OAuth consent URL."""
        params = {
            "client_id": settings.google_client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "https://www.googleapis.com/auth/gmail.readonly",
            "access_type": "offline",
            "prompt": "consent",
            "state": user_db_id,
        }
        qs = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{GMAIL_AUTH_URL}?{qs}"

    async def exchange_gmail_code(self, code: str, redirect_uri: str, user_db_id: str) -> dict:
        """Exchange OAuth code for tokens and store the email account."""
        async with httpx.AsyncClient() as http:
            resp = await http.post(GMAIL_TOKEN_URL, data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            })
            if resp.status_code != 200:
                logger.error(f"Gmail token exchange failed: {resp.text}")
                raise Exception("Failed to exchange Gmail code")
            tokens = resp.json()

        email_address = await self._get_gmail_address(tokens["access_token"])

        sb = get_supabase()
        if sb:
            sb.table("email_accounts").insert({
                "user_id": user_db_id,
                "provider": "gmail",
                "email_address": email_address,
                "access_token": tokens["access_token"],
                "refresh_token": tokens.get("refresh_token"),
                "token_expiry": (datetime.utcnow() + timedelta(seconds=tokens.get("expires_in", 3600))).isoformat(),
            }).execute()

        return {"email": email_address, "provider": "gmail"}

    async def _get_gmail_address(self, access_token: str) -> str:
        async with httpx.AsyncClient() as http:
            resp = await http.get(
                f"{GMAIL_API_BASE}/users/me/profile",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if resp.status_code == 200:
                return resp.json().get("emailAddress", "unknown@gmail.com")
        return "unknown@gmail.com"

    async def _refresh_token(self, email_account: dict) -> Optional[str]:
        refresh = email_account.get("refresh_token")
        if not refresh:
            return None
        async with httpx.AsyncClient() as http:
            resp = await http.post(GMAIL_TOKEN_URL, data={
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "refresh_token": refresh,
                "grant_type": "refresh_token",
            })
            if resp.status_code != 200:
                return None
            data = resp.json()
            sb = get_supabase()
            if sb:
                sb.table("email_accounts").update({
                    "access_token": data["access_token"],
                    "token_expiry": (datetime.utcnow() + timedelta(seconds=data.get("expires_in", 3600))).isoformat(),
                }).eq("id", email_account["id"]).execute()
            return data["access_token"]

    async def scan_for_receipts(self, user_db_id: str) -> list[dict]:
        """Scan all linked email accounts for billing receipts."""
        sb = get_supabase()
        if not sb:
            return []

        result = sb.table("email_accounts").select("*").eq("user_id", user_db_id).eq("status", "active").execute()
        accounts = result.data or []
        detected = []

        for acct in accounts:
            token = acct.get("access_token")
            expiry = acct.get("token_expiry")
            if expiry:
                try:
                    exp_dt = datetime.fromisoformat(expiry.replace("Z", "+00:00"))
                    if exp_dt < datetime.utcnow().replace(tzinfo=exp_dt.tzinfo):
                        token = await self._refresh_token(acct)
                except ValueError:
                    pass

            if not token:
                continue

            charges = await self._scan_gmail(token)
            detected.extend(charges)

            sb.table("email_accounts").update({"last_scanned_at": datetime.utcnow().isoformat()}).eq("id", acct["id"]).execute()

        for charge in detected:
            try:
                sb.table("recurring_charges").upsert({
                    "user_id": user_db_id,
                    "merchant_name": charge["merchant"],
                    "average_amount": charge["amount"],
                    "frequency": "monthly",
                    "category": charge["category"],
                    "value_score": 3,
                    "status": "active",
                    "source": "email",
                    "last_charge_date": charge.get("date"),
                }, on_conflict="user_id,merchant_name").execute()
            except Exception as e:
                logger.warning(f"Could not store email-detected charge: {e}")

        return detected

    async def _scan_gmail(self, access_token: str) -> list[dict]:
        """Search Gmail for billing/receipt emails in the past 90 days."""
        query = " OR ".join(f'"{kw}"' for kw in BILLING_KEYWORDS[:6])
        query = f"({query}) newer_than:90d"

        try:
            async with httpx.AsyncClient() as http:
                resp = await http.get(
                    f"{GMAIL_API_BASE}/users/me/messages",
                    params={"q": query, "maxResults": 50},
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                if resp.status_code != 200:
                    logger.warning(f"Gmail search failed: {resp.status_code}")
                    return []
                messages = resp.json().get("messages", [])

                charges = []
                for msg_ref in messages[:30]:
                    msg_resp = await http.get(
                        f"{GMAIL_API_BASE}/users/me/messages/{msg_ref['id']}",
                        params={"format": "metadata", "metadataHeaders": ["Subject", "From", "Date"]},
                        headers={"Authorization": f"Bearer {access_token}"},
                    )
                    if msg_resp.status_code != 200:
                        continue

                    headers = {h["name"]: h["value"] for h in msg_resp.json().get("payload", {}).get("headers", [])}
                    subject = headers.get("Subject", "").lower()
                    from_addr = headers.get("From", "").lower()
                    snippet = msg_resp.json().get("snippet", "")

                    for pattern, (merchant, category) in MERCHANT_PATTERNS.items():
                        if pattern in subject or pattern in from_addr:
                            amounts = AMOUNT_RE.findall(snippet)
                            amount = float(amounts[0]) if amounts else None
                            if amount and amount < 500:
                                charges.append({
                                    "merchant": merchant,
                                    "amount": amount,
                                    "category": category,
                                    "date": headers.get("Date", ""),
                                })
                            break

                return charges
        except Exception as e:
            logger.error(f"Gmail scan error: {e}")
            return []

    def get_email_accounts(self, user_db_id: str) -> list[dict]:
        sb = get_supabase()
        if not sb:
            return []
        result = sb.table("email_accounts").select("id, provider, email_address, last_scanned_at, status, created_at").eq("user_id", user_db_id).execute()
        return result.data or []

    def delete_email_account(self, user_db_id: str, account_id: str) -> bool:
        sb = get_supabase()
        if not sb:
            return False
        sb.table("email_accounts").delete().eq("id", account_id).eq("user_id", user_db_id).execute()
        return True


email_service = EmailService()
