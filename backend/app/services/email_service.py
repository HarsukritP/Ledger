"""Email integration service — scans Gmail for billing receipts using LLM extraction."""
import base64
import json
import logging
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

EXTRACTION_PROMPT = """Analyze these billing/receipt emails and extract ONLY recurring subscriptions or recurring charges.

For each email that represents a subscription or recurring charge, extract:
- merchant: the company name (clean human-readable name, e.g. "Netflix" not "noreply@netflix.com")
- amount: the dollar amount charged (number only, no $ sign)
- category: one of RENT_AND_UTILITIES, ENTERTAINMENT, GENERAL_SERVICES, PERSONAL_CARE, FOOD_AND_DRINK, TRANSPORTATION
- frequency: monthly, weekly, annual, or one-time

Rules:
- Only include actual subscriptions or recurring charges (things that repeat).
- Skip one-time purchases, shipping notifications, marketing emails, and promotional offers.
- If you cannot determine the amount, omit that entry entirely.
- Deduplicate: if multiple emails are from the same merchant, include only one entry with the most recent amount.

Return ONLY a valid JSON array, no markdown, no explanation:
[{"merchant": "...", "amount": ..., "category": "...", "frequency": "..."}, ...]

If no recurring charges are found, return: []

Emails:
"""

BATCH_SIZE = 10


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

    # ------------------------------------------------------------------
    # Scanning
    # ------------------------------------------------------------------

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
                    "frequency": charge.get("frequency", "monthly"),
                    "category": charge.get("category", "GENERAL_SERVICES"),
                    "value_score": 3,
                    "status": "active",
                    "source": "email",
                }, on_conflict="user_id,merchant_name").execute()
            except Exception as e:
                logger.warning(f"Could not store email-detected charge: {e}")

        return detected

    async def _scan_gmail(self, access_token: str) -> list[dict]:
        """Search Gmail for billing/receipt emails, then use LLM to extract charges."""
        query = " OR ".join(f'"{kw}"' for kw in BILLING_KEYWORDS)
        query = f"({query}) newer_than:90d"

        try:
            async with httpx.AsyncClient(timeout=30) as http:
                resp = await http.get(
                    f"{GMAIL_API_BASE}/users/me/messages",
                    params={"q": query, "maxResults": 100},
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                if resp.status_code != 200:
                    logger.warning(f"Gmail search failed: {resp.status_code} {resp.text[:200]}")
                    return []
                messages = resp.json().get("messages", [])
                logger.info(f"[EMAIL] Found {len(messages)} candidate emails")

                emails = []
                for msg_ref in messages[:50]:
                    email_data = await self._fetch_email(http, access_token, msg_ref["id"])
                    if email_data:
                        emails.append(email_data)

                logger.info(f"[EMAIL] Fetched {len(emails)} emails, sending to LLM in batches")

                all_charges: list[dict] = []
                for i in range(0, len(emails), BATCH_SIZE):
                    batch = emails[i:i + BATCH_SIZE]
                    charges = await self._extract_with_llm(batch)
                    all_charges.extend(charges)

                seen: dict[str, dict] = {}
                for c in all_charges:
                    key = c.get("merchant", "").lower().strip()
                    if key and c.get("amount"):
                        seen[key] = c
                deduped = list(seen.values())

                logger.info(f"[EMAIL] LLM extracted {len(deduped)} unique recurring charges")
                return deduped

        except Exception as e:
            logger.error(f"Gmail scan error: {e}")
            return []

    async def _fetch_email(self, http: httpx.AsyncClient, access_token: str, msg_id: str) -> Optional[dict]:
        """Fetch a single email's headers and body preview."""
        try:
            resp = await http.get(
                f"{GMAIL_API_BASE}/users/me/messages/{msg_id}",
                params={"format": "full"},
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if resp.status_code != 200:
                return None

            data = resp.json()
            headers = {h["name"]: h["value"] for h in data.get("payload", {}).get("headers", [])}

            body_text = self._extract_body_text(data.get("payload", {}))

            return {
                "subject": headers.get("Subject", ""),
                "from": headers.get("From", ""),
                "date": headers.get("Date", ""),
                "body": body_text[:500],
            }
        except Exception as e:
            logger.warning(f"Could not fetch email {msg_id}: {e}")
            return None

    def _extract_body_text(self, payload: dict) -> str:
        """Extract plain text from a Gmail message payload, handling multipart."""
        mime = payload.get("mimeType", "")

        if mime == "text/plain":
            body_data = payload.get("body", {}).get("data", "")
            if body_data:
                try:
                    return base64.urlsafe_b64decode(body_data).decode("utf-8", errors="replace")
                except Exception:
                    return ""

        for part in payload.get("parts", []):
            text = self._extract_body_text(part)
            if text:
                return text

        return payload.get("snippet", "")

    # ------------------------------------------------------------------
    # LLM extraction via Backboard Audit specialist
    # ------------------------------------------------------------------

    async def _extract_with_llm(self, emails: list[dict]) -> list[dict]:
        """Send a batch of emails to the Backboard Audit specialist for extraction."""
        if not emails:
            return []

        prompt = EXTRACTION_PROMPT
        for i, e in enumerate(emails, 1):
            prompt += f"\n---\n{i}. From: {e['from']}\n   Subject: {e['subject']}\n   Date: {e['date']}\n   Body: {e['body']}\n"

        try:
            from app.services.backboard_service import backboard_service
            result = await backboard_service._call_specialist("audit", prompt, user_sub="")

            if isinstance(result, list):
                return self._validate_charges(result)

            if isinstance(result, dict):
                for key in ("charges", "subscriptions", "data", "results"):
                    if isinstance(result.get(key), list):
                        return self._validate_charges(result[key])

                raw = result.get("analysis", result.get("_raw_non_json", ""))
                if isinstance(raw, str):
                    return self._parse_json_array(raw)

            return []

        except Exception as e:
            logger.error(f"LLM extraction failed: {e}")
            return []

    def _parse_json_array(self, text: str) -> list[dict]:
        """Try to extract a JSON array from raw text."""
        try:
            parsed = json.loads(text)
            if isinstance(parsed, list):
                return self._validate_charges(parsed)
        except (json.JSONDecodeError, TypeError):
            pass

        start = text.find("[")
        end = text.rfind("]") + 1
        if start != -1 and end > start:
            try:
                parsed = json.loads(text[start:end])
                if isinstance(parsed, list):
                    return self._validate_charges(parsed)
            except (json.JSONDecodeError, TypeError):
                pass
        return []

    def _validate_charges(self, items: list) -> list[dict]:
        """Filter and normalize extracted charge items."""
        valid = []
        for item in items:
            if not isinstance(item, dict):
                continue
            merchant = item.get("merchant", "").strip()
            amount = item.get("amount")
            if not merchant or not amount:
                continue
            try:
                amount = float(amount)
            except (ValueError, TypeError):
                continue
            if amount <= 0 or amount > 10000:
                continue
            valid.append({
                "merchant": merchant,
                "amount": round(amount, 2),
                "category": item.get("category", "GENERAL_SERVICES"),
                "frequency": item.get("frequency", "monthly"),
            })
        return valid

    # ------------------------------------------------------------------
    # Account management
    # ------------------------------------------------------------------

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
