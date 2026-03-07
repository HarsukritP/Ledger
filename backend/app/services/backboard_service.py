"""Backboard.io multi-agent orchestration service.

Architecture:
- 1 Council assistant per user (persistent memory, tool calls, orchestration)
- 4 shared specialist assistants (stateless analytical engines)
- Council delegates to specialists via tool calls
- Memory="Auto" on Council gives it long-term learning about each user
"""
import json
import logging
from datetime import date, timedelta

import httpx
from backboard import BackboardClient

from app.config import settings
from app.agents.prompts import (
    PULSE_SYSTEM_PROMPT,
    AUDIT_SYSTEM_PROMPT,
    NORTH_STAR_SYSTEM_PROMPT,
    SENTINEL_SYSTEM_PROMPT,
    COUNCIL_SYSTEM_PROMPT,
    COUNCIL_TOOLS,
)

logger = logging.getLogger(__name__)

SPECIALIST_DEFS = {
    "pulse": ("Ledger Pulse", PULSE_SYSTEM_PROMPT),
    "audit": ("Ledger Audit", AUDIT_SYSTEM_PROMPT),
    "north_star": ("Ledger North Star", NORTH_STAR_SYSTEM_PROMPT),
    "sentinel": ("Ledger Sentinel", SENTINEL_SYSTEM_PROMPT),
}

BASE_URL = "https://app.backboard.io/api"


class BackboardService:
    """Manages Backboard client, assistants, threads, and agent coordination."""

    def __init__(self):
        self.api_key = settings.backboard_api_key
        self._configured = bool(self.api_key)
        self._client: BackboardClient | None = None

        self._specialist_ids: dict[str, str] = {}
        self._council_ids: dict[str, str] = {}  # user_sub → assistant_id
        self._thread_ids: dict[str, str] = {}   # user_sub → thread_id
        self._memories_seeded: set[str] = set()
        self._initialized = False

    @property
    def is_configured(self) -> bool:
        return self._configured

    def _get_client(self) -> BackboardClient | None:
        if not self._configured:
            return None
        if self._client is None:
            self._client = BackboardClient(api_key=self.api_key)
        return self._client

    # ------------------------------------------------------------------
    # REST helpers (for endpoints the SDK doesn't expose directly)
    # ------------------------------------------------------------------

    async def _rest_get(self, path: str) -> dict | list | None:
        try:
            async with httpx.AsyncClient(timeout=15) as http:
                resp = await http.get(f"{BASE_URL}{path}", headers={"X-API-Key": self.api_key})
                if resp.status_code == 200:
                    return resp.json()
        except Exception as e:
            logger.warning(f"REST GET {path} failed: {e}")
        return None

    async def _rest_post(self, path: str, body: dict) -> dict | None:
        try:
            async with httpx.AsyncClient(timeout=15) as http:
                resp = await http.post(f"{BASE_URL}{path}", headers={"X-API-Key": self.api_key}, json=body)
                if resp.status_code == 200:
                    return resp.json()
                logger.warning(f"REST POST {path} returned {resp.status_code}: {resp.text[:200]}")
        except Exception as e:
            logger.warning(f"REST POST {path} failed: {e}")
        return None

    # ------------------------------------------------------------------
    # Initialization
    # ------------------------------------------------------------------

    async def _list_existing_assistants(self) -> dict[str, str]:
        """Return {name: assistant_id} for all assistants in the account."""
        data = await self._rest_get("/assistants")
        if data is None:
            return {}
        assistants = data.get("assistants", data) if isinstance(data, dict) else data
        result: dict[str, str] = {}
        for a in assistants if isinstance(assistants, list) else []:
            name = a.get("name", "")
            aid = a.get("assistant_id", "")
            if name and aid:
                result[name] = aid
        return result

    async def initialize(self):
        """Create / find the 4 specialist assistants. Called lazily on first use."""
        if self._initialized or not self._configured:
            return

        client = self._get_client()
        if not client:
            return

        existing = await self._list_existing_assistants()

        for key, (name, prompt) in SPECIALIST_DEFS.items():
            if name in existing:
                self._specialist_ids[key] = existing[name]
                logger.info(f"Reusing specialist {name} → {existing[name]}")
            else:
                try:
                    asst = await client.create_assistant(name=name, system_prompt=prompt)
                    self._specialist_ids[key] = asst.assistant_id
                    logger.info(f"Created specialist {name} → {asst.assistant_id}")
                except Exception as e:
                    logger.error(f"Failed to create specialist {name}: {e}")

        for name, aid in existing.items():
            if name.startswith("Ledger Council:"):
                user_sub = name.split(":", 1)[1].strip()
                self._council_ids[user_sub] = aid

        self._initialized = True

    # ------------------------------------------------------------------
    # Per-user Council management
    # ------------------------------------------------------------------

    async def get_or_create_council(self, user_sub: str, user_name: str = "") -> str:
        await self.initialize()

        if user_sub in self._council_ids:
            return self._council_ids[user_sub]

        client = self._get_client()
        if not client:
            return ""

        display = user_name or user_sub.split("|")[-1]
        council_name = f"Ledger Council: {user_sub}"
        prompt = COUNCIL_SYSTEM_PROMPT + f"\n\nThe user's name is {display}. Address them by first name."

        try:
            asst = await client.create_assistant(
                name=council_name,
                system_prompt=prompt,
                tools=COUNCIL_TOOLS,
            )
            self._council_ids[user_sub] = asst.assistant_id
            logger.info(f"Created Council for {display} → {asst.assistant_id}")
            return asst.assistant_id
        except Exception as e:
            logger.error(f"Council creation failed for {user_sub}: {e}")
            return ""

    async def get_or_create_thread(self, user_sub: str) -> str:
        if user_sub in self._thread_ids:
            return self._thread_ids[user_sub]

        council_id = self._council_ids.get(user_sub)
        if not council_id:
            return ""

        client = self._get_client()
        if not client:
            return ""

        # Look for an existing thread first
        data = await self._rest_get(f"/assistants/{council_id}/threads")
        if data:
            threads = data.get("threads", data) if isinstance(data, dict) else data
            if isinstance(threads, list) and threads:
                tid = threads[0].get("thread_id", "")
                if tid:
                    self._thread_ids[user_sub] = tid
                    return tid

        try:
            thread = await client.create_thread(council_id)
            self._thread_ids[user_sub] = thread.thread_id
            return thread.thread_id
        except Exception as e:
            logger.error(f"Thread creation failed: {e}")
            return ""

    async def seed_memories(self, user_sub: str):
        """Pre-seed the Council's memory with demo financial insights."""
        if user_sub in self._memories_seeded:
            return

        council_id = self._council_ids.get(user_sub)
        if not council_id:
            return

        from app.services.demo_data import DEMO_MEMORIES

        for mem in DEMO_MEMORIES:
            await self._rest_post(
                f"/assistants/{council_id}/memories",
                {"content": mem["content"]},
            )

        self._memories_seeded.add(user_sub)
        logger.info(f"Seeded {len(DEMO_MEMORIES)} memories for {user_sub}")

    # ------------------------------------------------------------------
    # Main chat entry point
    # ------------------------------------------------------------------

    async def send_message(
        self,
        user_sub: str,
        message: str,
        user_name: str = "",
        stream: bool = False,
    ) -> dict:
        """Send a user message to their Council, handle tool calls, return response."""
        client = self._get_client()
        if not client:
            return self._fallback_response(message)

        council_id = await self.get_or_create_council(user_sub, user_name)
        if not council_id:
            return self._fallback_response(message)

        thread_id = await self.get_or_create_thread(user_sub)
        if not thread_id:
            return self._fallback_response(message)

        # Seed memories on first interaction
        await self.seed_memories(user_sub)

        try:
            response = await client.add_message(
                thread_id=thread_id,
                content=message,
                memory="Auto",
                stream=False,
            )

            # Iteratively handle tool calls (max 5 rounds to avoid loops)
            for _ in range(5):
                status = getattr(response, "status", None)
                tool_calls = getattr(response, "tool_calls", None)
                if status != "REQUIRES_ACTION" or not tool_calls:
                    break

                tool_outputs = []
                for tc in tool_calls:
                    fn_name = tc.function.name
                    try:
                        args = tc.function.parsed_arguments
                    except Exception:
                        args = json.loads(getattr(tc.function, "arguments", "{}"))
                    result = await self._execute_tool(user_sub, fn_name, args)
                    tool_outputs.append({
                        "tool_call_id": tc.id,
                        "output": json.dumps(result, default=str),
                    })

                response = await client.submit_tool_outputs(
                    thread_id=thread_id,
                    run_id=response.run_id,
                    tool_outputs=tool_outputs,
                )

            content = getattr(response, "content", None) or str(response)
            agent = self._detect_primary_agent(content)
            return {"content": content, "agent": agent}

        except Exception as e:
            logger.error(f"send_message error: {e}", exc_info=True)
            return {"content": f"I ran into an issue: {e}", "agent": "system"}

    # ------------------------------------------------------------------
    # Tool execution
    # ------------------------------------------------------------------

    async def _execute_tool(self, user_sub: str, fn_name: str, args: dict) -> dict:
        from app.services.demo_data import (
            DEMO_TRANSACTIONS,
            DEMO_GOAL_SNAPSHOTS,
            get_spending_summary,
        )

        if fn_name == "get_account_summary":
            s = get_spending_summary()
            return {
                "current_balance": 2847.32,
                "accounts": [{"name": "Main Checking", "balance": 2847.32, "type": "checking"}],
                "total_income": s["total_income"],
                "total_expenses": s["total_expenses"],
                "net": s["net"],
                "march_spent_so_far": s["march_spent"],
                "top_categories": s["top_categories"],
            }

        if fn_name == "get_recent_transactions":
            days = args.get("days", 30)
            category = args.get("category")
            cutoff = (date.today() - timedelta(days=days)).isoformat()
            txns = [t for t in DEMO_TRANSACTIONS if t["date"] >= cutoff]
            if category:
                txns = [t for t in txns if t.get("category", "").lower() == category.lower()]
            return {"transactions": txns[:25], "total_returned": len(txns)}

        if fn_name == "get_recurring_charges":
            seen: dict[str, dict] = {}
            for t in DEMO_TRANSACTIONS:
                if t.get("is_recurring") and t["amount"] < 0:
                    name = t["merchant_name"]
                    if name not in seen:
                        seen[name] = {
                            "name": name,
                            "monthly_amount": abs(t["amount"]),
                            "category": t.get("category", ""),
                            "last_charge": t["date"],
                        }
            charges = list(seen.values())
            return {
                "recurring_charges": charges,
                "total_monthly": round(sum(c["monthly_amount"] for c in charges), 2),
            }

        if fn_name == "get_goals":
            return {
                "goals": [
                    {"name": "Japan Trip", "target": 5000, "current": 1200, "deadline": "2026-12-01", "monthly_needed": 422, "feasibility": "at_risk"},
                    {"name": "Emergency Fund", "target": 2000, "current": 1450, "deadline": "2026-06-01", "monthly_needed": 183, "feasibility": "on_track"},
                    {"name": "New Laptop", "target": 1800, "current": 300, "deadline": "2026-09-01", "monthly_needed": 250, "feasibility": "behind"},
                ],
                "goal_history": DEMO_GOAL_SNAPSHOTS,
            }

        if fn_name == "analyze_with_specialist":
            specialist = args.get("specialist", "pulse")
            context = args.get("context", "")
            return await self._call_specialist(specialist, context)

        if fn_name == "create_action_item":
            return {
                "status": "created",
                "item": {
                    "agent": args.get("agent"),
                    "type": args.get("action_type"),
                    "title": args.get("title"),
                    "description": args.get("description"),
                    "amount": args.get("amount"),
                },
            }

        return {"error": f"Unknown tool: {fn_name}"}

    # ------------------------------------------------------------------
    # Specialist delegation
    # ------------------------------------------------------------------

    async def _call_specialist(self, specialist: str, context: str) -> dict:
        client = self._get_client()
        if not client or specialist not in self._specialist_ids:
            return {"error": f"Specialist '{specialist}' not available"}

        specialist_id = self._specialist_ids[specialist]

        from app.services.demo_data import DEMO_TRANSACTIONS, get_spending_summary
        summary = get_spending_summary()

        data_block = json.dumps(DEMO_TRANSACTIONS[:25], indent=1, default=str)
        enriched = (
            f"=== USER FINANCIAL SNAPSHOT ===\n"
            f"Balance: $2,847.32\n"
            f"Monthly income: ~$3,200\n"
            f"Monthly expenses: ~${summary['total_expenses']:.0f}\n"
            f"March spending so far: ${summary['march_spent']:.0f}\n"
            f"Top categories: {summary['top_categories']}\n\n"
            f"=== RECENT TRANSACTIONS (last 25) ===\n{data_block}\n\n"
            f"=== ANALYSIS REQUEST ===\n{context}\n\n"
            f"Respond with a JSON object following your output format instructions."
        )

        try:
            thread = await client.create_thread(specialist_id)
            response = await client.add_message(
                thread_id=thread.thread_id,
                content=enriched,
                memory="off",
                stream=False,
            )
            raw = getattr(response, "content", "") or str(response)

            # Attempt to parse JSON from the response
            try:
                return json.loads(raw)
            except json.JSONDecodeError:
                start = raw.find("{")
                end = raw.rfind("}") + 1
                if start != -1 and end > start:
                    return json.loads(raw[start:end])
                return {"analysis": raw}

        except Exception as e:
            logger.error(f"Specialist {specialist} error: {e}")
            return {"error": str(e)}

    # ------------------------------------------------------------------
    # Briefing generation
    # ------------------------------------------------------------------

    async def generate_briefing(self, user_sub: str, user_name: str = "") -> str:
        result = await self.send_message(
            user_sub=user_sub,
            message=(
                "Generate my weekly financial briefing. Check my account summary, "
                "review upcoming cashflow via Pulse, audit my subscriptions, check "
                "goal progress, and flag any anomalies from Sentinel. Synthesize "
                "everything into a warm but direct 45-second summary. Start with "
                "the single most important thing I need to know this week."
            ),
            user_name=user_name,
        )
        return result.get("content", "Unable to generate briefing.")

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _detect_primary_agent(content: str) -> str:
        low = content.lower()
        scores = {
            "pulse": low.count("[pulse]") * 3 + low.count("cashflow") + low.count("forecast") + low.count("balance"),
            "audit": low.count("[audit]") * 3 + low.count("subscription") + low.count("recurring"),
            "north_star": low.count("[north star]") * 3 + low.count("goal") + low.count("saving"),
            "sentinel": low.count("[sentinel]") * 3 + low.count("anomal") + low.count("unusual"),
        }
        best = max(scores, key=scores.get)
        return best if scores[best] > 0 else "council"

    @staticmethod
    def _fallback_response(message: str) -> dict:
        """Return a helpful mock response when Backboard is unavailable."""
        lower = message.lower()
        if any(w in lower for w in ["subscription", "cancel", "recurring"]):
            agent = "audit"
            text = (
                "[Audit] You're spending $164.94/month across 7 active subscriptions. "
                "Apple News+ ($12.99) and FitLife Gym ($50) show low usage — "
                "cancelling both would save $63/month. Want me to break down each one?"
            )
        elif any(w in lower for w in ["goal", "save", "japan", "laptop"]):
            agent = "north_star"
            text = (
                "[North Star] Your Emergency Fund is on track at $1,450 of $2,000. "
                "Japan Trip needs $422/month but you're only averaging $350 — it's at risk. "
                "If you cancel 2 flagged subscriptions, that frees up $63/month toward it."
            )
        elif any(w in lower for w in ["unusual", "weird", "charge", "anomal"]):
            agent = "sentinel"
            text = (
                "[Sentinel] No major anomalies this week. Your dining spend is 15% above "
                "your monthly baseline, mostly from weekend restaurants. Nothing alarming "
                "yet, but worth watching if it continues."
            )
        else:
            agent = "pulse"
            text = (
                "[Pulse] Your current balance is $2,847. Phone bill ($65) hits March 9, "
                "then your paycheck ($1,600) lands March 11. Your balance dips to ~$380 "
                "on the 10th — consider holding off on large purchases until Wednesday."
            )
        return {"content": text, "agent": agent}


backboard_service = BackboardService()
