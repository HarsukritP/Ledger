"""Backboard.io multi-agent orchestration service.

Architecture:
- 1 Council assistant per user (persistent memory, tool calls, orchestration)
- 4 shared specialist assistants (stateless analytical engines)
- Council delegates to specialists via tool calls
- Memory="Auto" on Council gives it long-term learning about each user

FAIL-LOUD: No silent fallbacks. If Backboard is broken, callers get real errors.
"""
import json
import logging
import traceback
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


class BackboardError(Exception):
    """Raised when any Backboard operation fails."""
    pass


class BackboardService:
    """Manages Backboard client, assistants, threads, and agent coordination."""

    def __init__(self):
        self.api_key = settings.backboard_api_key
        self._configured = bool(self.api_key)
        self._client: BackboardClient | None = None

        self._specialist_ids: dict[str, str] = {}
        self._council_ids: dict[str, str] = {}
        self._thread_ids: dict[str, str] = {}
        self._memories_seeded: set[str] = set()
        self._initialized = False

        if not self._configured:
            logger.error(
                "BACKBOARD_API_KEY is not set. All agent features will fail. "
                "Set the env var and redeploy."
            )

    @property
    def is_configured(self) -> bool:
        return self._configured

    def _require_configured(self):
        if not self._configured:
            raise BackboardError(
                "BACKBOARD_API_KEY is not set. Cannot use agent features."
            )

    def _get_client(self) -> BackboardClient:
        self._require_configured()
        if self._client is None:
            self._client = BackboardClient(api_key=self.api_key)
            logger.info("BackboardClient initialized")
        return self._client

    # ------------------------------------------------------------------
    # REST helpers — FAIL LOUD
    # ------------------------------------------------------------------

    async def _rest_get(self, path: str) -> dict | list:
        full_url = f"{BASE_URL}{path}"
        try:
            async with httpx.AsyncClient(timeout=15) as http:
                resp = await http.get(full_url, headers={"X-API-Key": self.api_key})
                if resp.status_code != 200:
                    logger.error(
                        f"REST GET {path} → {resp.status_code}: {resp.text[:500]}"
                    )
                    raise BackboardError(
                        f"Backboard GET {path} returned {resp.status_code}: {resp.text[:200]}"
                    )
                return resp.json()
        except BackboardError:
            raise
        except Exception as e:
            logger.error(f"REST GET {path} failed: {e}\n{traceback.format_exc()}")
            raise BackboardError(f"Backboard GET {path} failed: {e}") from e

    async def _rest_post(self, path: str, body: dict) -> dict:
        full_url = f"{BASE_URL}{path}"
        try:
            async with httpx.AsyncClient(timeout=15) as http:
                resp = await http.post(
                    full_url, headers={"X-API-Key": self.api_key}, json=body
                )
                if resp.status_code != 200:
                    logger.error(
                        f"REST POST {path} → {resp.status_code}: {resp.text[:500]}"
                    )
                    raise BackboardError(
                        f"Backboard POST {path} returned {resp.status_code}: {resp.text[:200]}"
                    )
                return resp.json()
        except BackboardError:
            raise
        except Exception as e:
            logger.error(f"REST POST {path} failed: {e}\n{traceback.format_exc()}")
            raise BackboardError(f"Backboard POST {path} failed: {e}") from e

    # ------------------------------------------------------------------
    # Initialization
    # ------------------------------------------------------------------

    async def _list_existing_assistants(self) -> dict[str, str]:
        data = await self._rest_get("/assistants")
        assistants = data.get("assistants", data) if isinstance(data, dict) else data
        result: dict[str, str] = {}
        for a in assistants if isinstance(assistants, list) else []:
            name = a.get("name", "")
            aid = a.get("assistant_id", "")
            if name and aid:
                result[name] = aid
        logger.info(f"Found {len(result)} existing assistants on Backboard")
        return result

    async def initialize(self):
        """Create / find the 4 specialist assistants. Called lazily on first use."""
        if self._initialized:
            return

        self._require_configured()
        client = self._get_client()

        existing = await self._list_existing_assistants()

        for key, (name, prompt) in SPECIALIST_DEFS.items():
            if name in existing:
                self._specialist_ids[key] = existing[name]
                logger.info(f"Reusing specialist {name} → {existing[name]}")
            else:
                try:
                    asst = await client.create_assistant(
                        name=name, system_prompt=prompt
                    )
                    self._specialist_ids[key] = asst.assistant_id
                    logger.info(f"Created specialist {name} → {asst.assistant_id}")
                except Exception as e:
                    logger.error(
                        f"FAILED to create specialist {name}: {e}\n{traceback.format_exc()}"
                    )
                    raise BackboardError(
                        f"Could not create specialist {name}: {e}"
                    ) from e

        for name, aid in existing.items():
            if name.startswith("Ledger Council:"):
                user_sub = name.split(":", 1)[1].strip()
                self._council_ids[user_sub] = aid
                logger.info(f"Found existing Council for user {user_sub}")

        self._initialized = True
        logger.info(
            f"Backboard initialized: {len(self._specialist_ids)} specialists, "
            f"{len(self._council_ids)} councils"
        )

    # ------------------------------------------------------------------
    # Per-user Council management
    # ------------------------------------------------------------------

    async def get_or_create_council(self, user_sub: str, user_name: str = "") -> str:
        await self.initialize()

        if user_sub in self._council_ids:
            return self._council_ids[user_sub]

        client = self._get_client()
        display = user_name or user_sub.split("|")[-1]
        council_name = f"Ledger Council: {user_sub}"
        prompt = (
            COUNCIL_SYSTEM_PROMPT
            + f"\n\nThe user's name is {display}. Address them by first name."
        )

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
            logger.error(
                f"FAILED to create Council for {user_sub}: {e}\n{traceback.format_exc()}"
            )
            raise BackboardError(f"Council creation failed: {e}") from e

    async def get_or_create_thread(self, user_sub: str) -> str:
        if user_sub in self._thread_ids:
            return self._thread_ids[user_sub]

        council_id = self._council_ids.get(user_sub)
        if not council_id:
            raise BackboardError(
                f"No Council assistant found for user {user_sub}. "
                "Call get_or_create_council first."
            )

        client = self._get_client()

        try:
            data = await self._rest_get(f"/assistants/{council_id}/threads")
            threads = (
                data.get("threads", data) if isinstance(data, dict) else data
            )
            if isinstance(threads, list) and threads:
                tid = threads[0].get("thread_id", "")
                if tid:
                    self._thread_ids[user_sub] = tid
                    logger.info(f"Reusing thread {tid} for user {user_sub}")
                    return tid
        except BackboardError:
            logger.warning(
                f"Could not list threads for {user_sub}, will create a new one"
            )

        try:
            thread = await client.create_thread(council_id)
            self._thread_ids[user_sub] = thread.thread_id
            logger.info(f"Created thread {thread.thread_id} for user {user_sub}")
            return thread.thread_id
        except Exception as e:
            logger.error(
                f"FAILED to create thread for {user_sub}: {e}\n{traceback.format_exc()}"
            )
            raise BackboardError(f"Thread creation failed: {e}") from e

    async def seed_memories(self, user_sub: str):
        """Pre-seed the Council's memory with demo financial insights."""
        if user_sub in self._memories_seeded:
            return

        council_id = self._council_ids.get(user_sub)
        if not council_id:
            logger.warning(f"Cannot seed memories — no Council for {user_sub}")
            return

        from app.services.demo_data import DEMO_MEMORIES

        success = 0
        failed = 0
        for mem in DEMO_MEMORIES:
            try:
                await self._rest_post(
                    f"/assistants/{council_id}/memories",
                    {"content": mem["content"]},
                )
                success += 1
            except BackboardError as e:
                failed += 1
                logger.error(f"Memory seed failed: {mem['content'][:60]}... → {e}")

        self._memories_seeded.add(user_sub)
        logger.info(
            f"Memory seeding for {user_sub}: {success} ok, {failed} failed "
            f"out of {len(DEMO_MEMORIES)}"
        )

    # ------------------------------------------------------------------
    # Main chat entry point — NO FALLBACKS
    # ------------------------------------------------------------------

    async def send_message(
        self,
        user_sub: str,
        message: str,
        user_name: str = "",
    ) -> dict:
        """Send a user message to their Council, handle tool calls, return response.

        Raises BackboardError on any failure — callers decide how to surface it.
        """
        self._require_configured()
        client = self._get_client()

        council_id = await self.get_or_create_council(user_sub, user_name)
        thread_id = await self.get_or_create_thread(user_sub)

        await self.seed_memories(user_sub)

        logger.info(
            f"[CHAT] user={user_sub} council={council_id} thread={thread_id} "
            f"msg={message[:80]}..."
        )

        response = await client.add_message(
            thread_id=thread_id,
            content=message,
            memory="Auto",
            stream=False,
        )
        logger.info(
            f"[CHAT] initial response status={getattr(response, 'status', 'N/A')} "
            f"tool_calls={len(getattr(response, 'tool_calls', []) or [])}"
        )

        for iteration in range(5):
            status = getattr(response, "status", None)
            tool_calls = getattr(response, "tool_calls", None)
            if status != "REQUIRES_ACTION" or not tool_calls:
                break

            logger.info(
                f"[CHAT] tool call round {iteration + 1}: "
                f"{[tc.function.name for tc in tool_calls]}"
            )

            tool_outputs = []
            for tc in tool_calls:
                fn_name = tc.function.name
                try:
                    args = tc.function.parsed_arguments
                except Exception:
                    args = json.loads(getattr(tc.function, "arguments", "{}"))

                logger.info(f"[TOOL] executing {fn_name}({json.dumps(args, default=str)[:200]})")

                try:
                    result = await self._execute_tool(user_sub, fn_name, args)
                    logger.info(
                        f"[TOOL] {fn_name} → ok "
                        f"({json.dumps(result, default=str)[:200]})"
                    )
                except Exception as e:
                    logger.error(
                        f"[TOOL] {fn_name} FAILED: {e}\n{traceback.format_exc()}"
                    )
                    result = {"error": str(e), "tool": fn_name}

                tool_outputs.append({
                    "tool_call_id": tc.id,
                    "output": json.dumps(result, default=str),
                })

            response = await client.submit_tool_outputs(
                thread_id=thread_id,
                run_id=response.run_id,
                tool_outputs=tool_outputs,
            )
            logger.info(
                f"[CHAT] after tool submit: status={getattr(response, 'status', 'N/A')}"
            )

        content = getattr(response, "content", None) or str(response)
        agent = self._detect_primary_agent(content)

        logger.info(
            f"[CHAT] final response: agent={agent} length={len(content)} "
            f"preview={content[:120]}..."
        )
        return {"content": content, "agent": agent}

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
                "accounts": [
                    {"name": "Main Checking", "balance": 2847.32, "type": "checking"}
                ],
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
                txns = [
                    t
                    for t in txns
                    if t.get("category", "").lower() == category.lower()
                ]
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
                "total_monthly": round(
                    sum(c["monthly_amount"] for c in charges), 2
                ),
            }

        if fn_name == "get_goals":
            return {
                "goals": [
                    {
                        "name": "Japan Trip",
                        "target": 5000,
                        "current": 1200,
                        "deadline": "2026-12-01",
                        "monthly_needed": 422,
                        "feasibility": "at_risk",
                    },
                    {
                        "name": "Emergency Fund",
                        "target": 2000,
                        "current": 1450,
                        "deadline": "2026-06-01",
                        "monthly_needed": 183,
                        "feasibility": "on_track",
                    },
                    {
                        "name": "New Laptop",
                        "target": 1800,
                        "current": 300,
                        "deadline": "2026-09-01",
                        "monthly_needed": 250,
                        "feasibility": "behind",
                    },
                ],
                "goal_history": DEMO_GOAL_SNAPSHOTS,
            }

        if fn_name == "analyze_with_specialist":
            specialist = args.get("specialist", "pulse")
            context = args.get("context", "")
            return await self._call_specialist(specialist, context)

        if fn_name == "create_action_item":
            logger.info(
                f"[ACTION] created: {args.get('title')} "
                f"(agent={args.get('agent')}, type={args.get('action_type')})"
            )
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

        raise BackboardError(f"Unknown tool: {fn_name}")

    # ------------------------------------------------------------------
    # Specialist delegation — NO FALLBACKS
    # ------------------------------------------------------------------

    async def _call_specialist(self, specialist: str, context: str) -> dict:
        self._require_configured()
        client = self._get_client()

        if specialist not in self._specialist_ids:
            raise BackboardError(
                f"Specialist '{specialist}' not found. "
                f"Available: {list(self._specialist_ids.keys())}"
            )

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

        logger.info(
            f"[SPECIALIST] calling {specialist} (assistant={specialist_id}) "
            f"context={context[:100]}..."
        )

        thread = await client.create_thread(specialist_id)
        response = await client.add_message(
            thread_id=thread.thread_id,
            content=enriched,
            memory="off",
            stream=False,
        )
        raw = getattr(response, "content", "") or str(response)

        logger.info(
            f"[SPECIALIST] {specialist} responded: {len(raw)} chars, "
            f"preview={raw[:150]}..."
        )

        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            start = raw.find("{")
            end = raw.rfind("}") + 1
            if start != -1 and end > start:
                try:
                    return json.loads(raw[start:end])
                except json.JSONDecodeError:
                    pass
            logger.warning(
                f"[SPECIALIST] {specialist} returned non-JSON. "
                f"Full response:\n{raw}"
            )
            return {"analysis": raw, "_raw_non_json": True}

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
        return result["content"]

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _detect_primary_agent(content: str) -> str:
        low = content.lower()
        scores = {
            "pulse": low.count("[pulse]") * 3
            + low.count("cashflow")
            + low.count("forecast")
            + low.count("balance"),
            "audit": low.count("[audit]") * 3
            + low.count("subscription")
            + low.count("recurring"),
            "north_star": low.count("[north star]") * 3
            + low.count("goal")
            + low.count("saving"),
            "sentinel": low.count("[sentinel]") * 3
            + low.count("anomal")
            + low.count("unusual"),
        }
        best = max(scores, key=scores.get)
        return best if scores[best] > 0 else "council"


backboard_service = BackboardService()
