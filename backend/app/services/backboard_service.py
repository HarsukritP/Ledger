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
from collections import defaultdict

import httpx
from backboard import BackboardClient

from app.config import settings
from app.agents.prompts import (
    PULSE_SYSTEM_PROMPT,
    AUDIT_SYSTEM_PROMPT,
    NORTH_STAR_SYSTEM_PROMPT,
    SENTINEL_SYSTEM_PROMPT,
    RECEIPT_SCANNER_SYSTEM_PROMPT,
    COUNCIL_SYSTEM_PROMPT,
    COUNCIL_TOOLS,
)

logger = logging.getLogger(__name__)

SPECIALIST_DEFS = {
    "pulse": ("Ledger Pulse", PULSE_SYSTEM_PROMPT),
    "audit": ("Ledger Audit", AUDIT_SYSTEM_PROMPT),
    "north_star": ("Ledger North Star", NORTH_STAR_SYSTEM_PROMPT),
    "sentinel": ("Ledger Sentinel", SENTINEL_SYSTEM_PROMPT),
    "receipt_scanner": ("Ledger Receipt Scanner", RECEIPT_SCANNER_SYSTEM_PROMPT),
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

    async def _rest_delete(self, path: str) -> dict:
        full_url = f"{BASE_URL}{path}"
        try:
            async with httpx.AsyncClient(timeout=15) as http:
                resp = await http.delete(full_url, headers={"X-API-Key": self.api_key})
                if resp.status_code not in (200, 204):
                    logger.error(
                        f"REST DELETE {path} → {resp.status_code}: {resp.text[:500]}"
                    )
                    raise BackboardError(
                        f"Backboard DELETE {path} returned {resp.status_code}: {resp.text[:200]}"
                    )
                return resp.json() if resp.text else {}
        except BackboardError:
            raise
        except Exception as e:
            logger.error(f"REST DELETE {path} failed: {e}\n{traceback.format_exc()}")
            raise BackboardError(f"Backboard DELETE {path} failed: {e}") from e

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

    async def ensure_specialist(self, key: str):
        """Ensure a specific specialist exists, creating it if needed."""
        if key in self._specialist_ids:
            return
        if key not in SPECIALIST_DEFS:
            raise BackboardError(f"Unknown specialist: {key}")

        self._require_configured()
        client = self._get_client()
        name, prompt = SPECIALIST_DEFS[key]
        existing = await self._list_existing_assistants()

        if name in existing:
            self._specialist_ids[key] = existing[name]
            logger.info(f"Found specialist {name} → {existing[name]}")
        else:
            asst = await client.create_assistant(name=name, system_prompt=prompt)
            self._specialist_ids[key] = asst.assistant_id
            logger.info(f"Created specialist {name} → {asst.assistant_id}")

    async def initialize(self):
        """Create / find the specialist assistants. Called lazily on first use."""
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
        """Seed the Council's memory with real financial insights from user data."""
        if user_sub in self._memories_seeded:
            return

        council_id = self._council_ids.get(user_sub)
        if not council_id:
            logger.warning(f"Cannot seed memories — no Council for {user_sub}")
            return

        memories = await self._build_user_memories(user_sub)
        if not memories:
            logger.info(f"No data to seed memories for {user_sub}")
            self._memories_seeded.add(user_sub)
            return

        success = 0
        failed = 0
        for mem in memories:
            try:
                await self._rest_post(
                    f"/assistants/{council_id}/memories",
                    {"content": mem},
                )
                success += 1
            except BackboardError as e:
                failed += 1
                logger.error(f"Memory seed failed: {mem[:60]}... → {e}")

        self._memories_seeded.add(user_sub)
        logger.info(
            f"Memory seeding for {user_sub}: {success} ok, {failed} failed "
            f"out of {len(memories)}"
        )

    async def list_memories(self, user_sub: str) -> list[dict]:
        """List all memories for a user's Council assistant."""
        council_id = self._council_ids.get(user_sub)
        if not council_id:
            return []
        try:
            data = await self._rest_get(f"/assistants/{council_id}/memories")
            if isinstance(data, list):
                return data
            return data.get("memories", data.get("data", []))
        except BackboardError as e:
            logger.warning(f"Could not list memories for {user_sub}: {e}")
            return []

    async def delete_memory(self, user_sub: str, memory_id: str) -> bool:
        """Delete a specific memory from a user's Council assistant."""
        council_id = self._council_ids.get(user_sub)
        if not council_id:
            return False
        try:
            await self._rest_delete(f"/assistants/{council_id}/memories/{memory_id}")
            return True
        except BackboardError as e:
            logger.warning(f"Could not delete memory {memory_id}: {e}")
            return False

    async def _build_user_memories(self, user_sub: str) -> list[str]:
        """Generate memory entries from the user's real transaction data."""
        db_id = await self._resolve_db_id(user_sub)
        if not db_id:
            return []

        from app.services.data_service import data_service

        memories = []
        try:
            txns = data_service.get_transactions(db_id, days=90)
            if not txns:
                return []

            income_txns = [t for t in txns if t.get("type") == "income"]
            if income_txns:
                income_days = defaultdict(list)
                for t in income_txns:
                    try:
                        d = date.fromisoformat(t["date"])
                        income_days[d.day].append(float(t.get("amount", 0)))
                    except (ValueError, KeyError):
                        pass
                if income_days:
                    pay_dates = sorted(income_days.keys())
                    avg_pay = sum(sum(v) for v in income_days.values()) / sum(len(v) for v in income_days.values())
                    merchant = income_txns[0].get("merchant_name", "employer")
                    memories.append(
                        f"Gets paid on the {', '.join(str(d) for d in pay_dates)} of each month. "
                        f"Average paycheck: ${avg_pay:,.0f} from {merchant}."
                    )

            recurring = data_service.get_recurring_charges(db_id)
            bills = [r for r in recurring if float(r.get("average_amount", 0)) >= 30]
            if bills:
                bill_lines = [f"{r['merchant_name']} ${float(r.get('average_amount', 0)):,.0f}" for r in bills[:6]]
                memories.append(f"Major recurring bills: {', '.join(bill_lines)}.")

            cats = defaultdict(float)
            month_txns = data_service.get_this_month_transactions(db_id)
            for t in month_txns:
                if t.get("type") in ("expense", "bill"):
                    cat = t.get("category") or "Other"
                    cats[cat] += float(t.get("amount", 0))
            if cats:
                top = sorted(cats.items(), key=lambda x: x[1], reverse=True)[:3]
                memories.append(
                    f"This month's top spending categories: "
                    + ", ".join(f"{c} (${a:,.0f})" for c, a in top) + "."
                )

            flagged = [r for r in recurring if r.get("value_score", 3) <= 2 or r.get("status") == "flagged"]
            if flagged:
                names = [r["merchant_name"] for r in flagged]
                total = sum(float(r.get("average_amount", 0)) for r in flagged)
                memories.append(
                    f"Low-value/flagged subscriptions: {', '.join(names)}. "
                    f"Potential savings: ${total:,.0f}/mo."
                )

            goals = data_service.get_goals(db_id)
            if goals:
                for g in goals[:3]:
                    memories.append(
                        f"Goal: {g['name']} — ${float(g.get('current_amount', 0)):,.0f} of "
                        f"${float(g.get('target_amount', 0)):,.0f} by {g.get('target_date', 'no deadline')}."
                    )

        except Exception as e:
            logger.warning(f"Could not build memories for {user_sub}: {e}")

        return memories

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
            llm_provider=settings.llm_provider,
            model_name=settings.llm_model,
        )
        logger.info(
            f"[CHAT] initial response status={getattr(response, 'status', 'N/A')} "
            f"tool_calls={len(getattr(response, 'tool_calls', []) or [])}"
        )

        for iteration in range(10):
            status = getattr(response, "status", None)
            tool_calls = getattr(response, "tool_calls", None)
            if status != "REQUIRES_ACTION" or not tool_calls:
                break

            def _tc_fn(tc):
                """Extract function info from a tool call (object or dict)."""
                if isinstance(tc, dict):
                    fn = tc.get("function", {})
                    return fn.get("name", ""), fn.get("arguments", "{}"), tc.get("id", "")
                fn = getattr(tc, "function", None)
                name = getattr(fn, "name", "") if fn else ""
                try:
                    args_raw = fn.parsed_arguments if fn else {}
                except Exception:
                    args_raw = getattr(fn, "arguments", "{}") if fn else "{}"
                tc_id = getattr(tc, "id", "")
                return name, args_raw, tc_id

            logger.info(
                f"[CHAT] tool call round {iteration + 1}: "
                f"{[_tc_fn(tc)[0] for tc in tool_calls]}"
            )

            tool_outputs = []
            for tc in tool_calls:
                fn_name, args_raw, tc_id = _tc_fn(tc)
                if isinstance(args_raw, dict):
                    args = args_raw
                elif isinstance(args_raw, str):
                    args = json.loads(args_raw) if args_raw else {}
                else:
                    args = {}

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
                    "tool_call_id": tc_id,
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

        content = getattr(response, "content", None)
        if not content or content == "None":
            if isinstance(response, dict):
                content = response.get("content") or response.get("message")
            if not content or content == "None":
                logger.warning(
                    f"[CHAT] No content after tool loop. "
                    f"status={getattr(response, 'status', 'N/A')} "
                    f"response_type={type(response).__name__}"
                )
                content = (
                    "I've analyzed your data and created an action item for you. "
                    "Check your dashboard for details."
                )

        agent = self._detect_primary_agent(content)

        logger.info(
            f"[CHAT] final response: agent={agent} length={len(content)} "
            f"preview={content[:120]}..."
        )
        return {"content": content, "agent": agent}

    # ------------------------------------------------------------------
    # Tool execution
    # ------------------------------------------------------------------

    async def _resolve_db_id(self, user_sub: str) -> str | None:
        """Convert an Auth0 user_sub to a Supabase user UUID."""
        from app.services.supabase_client import get_user_by_auth0_id
        user = await get_user_by_auth0_id(user_sub)
        return user["id"] if user else None

    async def _execute_tool(self, user_sub: str, fn_name: str, args: dict) -> dict:
        from app.services.data_service import data_service

        db_id = await self._resolve_db_id(user_sub)
        if not db_id:
            return {"error": "User not found in database. Please link a bank account first."}

        if fn_name == "get_account_summary":
            health = await data_service.get_health_metrics(db_id)
            accounts = await data_service.get_accounts(db_id)
            categories = data_service.get_category_breakdown(db_id, days=30)

            return {
                "current_balance": health["balance"],
                "accounts": [
                    {"name": a.get("name", "Account"), "balance": a.get("balance_current", 0), "type": a.get("type", "")}
                    for a in accounts
                ] if accounts else [{"name": "All Accounts", "balance": health["balance"], "type": "combined"}],
                "spent_this_month": health["spent_this_month"],
                "saved_this_month": health["saved"],
                "avg_monthly_spend": health["budget_limit"],
                "top_categories": [(c["category"], c["amount"]) for c in categories[:5]],
            }

        if fn_name == "get_recent_transactions":
            days = args.get("days", 30)
            category = args.get("category")
            txns = data_service.get_transactions(db_id, days=days)
            if category:
                txns = [
                    t for t in txns
                    if (t.get("category") or "").lower() == category.lower()
                    or (t.get("merchant_name") or "").lower().find(category.lower()) >= 0
                ]
            formatted = [
                {
                    "date": t.get("date", ""),
                    "merchant_name": t.get("merchant_name", ""),
                    "amount": float(t.get("amount", 0)),
                    "category": t.get("category", ""),
                    "type": t.get("type", ""),
                    "is_recurring": t.get("is_recurring", False),
                }
                for t in txns[:30]
            ]
            return {"transactions": formatted, "total_returned": len(txns)}

        if fn_name == "get_recurring_charges":
            recurring = data_service.get_recurring_charges(db_id)
            charges = [
                {
                    "name": r.get("merchant_name", ""),
                    "monthly_amount": float(r.get("average_amount", 0)),
                    "category": r.get("category", ""),
                    "last_charge": r.get("last_charge_date", ""),
                    "value_score": r.get("value_score", 3),
                    "status": r.get("status", "active"),
                }
                for r in recurring
            ]
            return {
                "recurring_charges": charges,
                "total_monthly": round(sum(c["monthly_amount"] for c in charges), 2),
            }

        if fn_name == "get_goals":
            goals = data_service.get_goals(db_id)
            from app.routers.goals import _enrich_goal
            enriched = [_enrich_goal(g) for g in goals]
            return {
                "goals": [
                    {
                        "name": g.get("name", ""),
                        "target": float(g.get("target_amount", 0)),
                        "current": float(g.get("current_amount", 0)),
                        "deadline": g.get("target_date", ""),
                        "monthly_needed": g.get("monthly_contribution", 0),
                        "feasibility": g.get("feasibility", "on_track"),
                    }
                    for g in enriched
                ],
            }

        if fn_name == "analyze_with_specialist":
            specialist = args.get("specialist", "pulse")
            context = args.get("context", "")
            return await self._call_specialist(specialist, context, user_sub)

        if fn_name == "create_action_item":
            from app.services.supabase_client import get_supabase
            sb = get_supabase()
            if sb and db_id:
                try:
                    sb.table("action_queue").insert({
                        "user_id": db_id,
                        "agent_source": args.get("agent", "council"),
                        "type": args.get("action_type", "suggestion"),
                        "title": args.get("title", ""),
                        "description": args.get("description", ""),
                        "amount": args.get("amount"),
                        "status": "pending",
                    }).execute()
                except Exception as e:
                    logger.warning(f"Could not persist action item: {e}")

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

    async def _call_specialist(self, specialist: str, context: str, user_sub: str = "") -> dict:
        self._require_configured()
        client = self._get_client()

        if specialist not in self._specialist_ids:
            raise BackboardError(
                f"Specialist '{specialist}' not found. "
                f"Available: {list(self._specialist_ids.keys())}"
            )

        specialist_id = self._specialist_ids[specialist]

        enriched = await self._build_specialist_context(context, user_sub)

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
            llm_provider=settings.llm_provider,
            model_name=settings.llm_model,
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

    async def _build_specialist_context(self, context: str, user_sub: str) -> str:
        """Build a rich data context string for specialist agents using real user data."""
        from app.services.data_service import data_service

        db_id = await self._resolve_db_id(user_sub) if user_sub else None

        if not db_id:
            return (
                f"=== ANALYSIS REQUEST ===\n{context}\n\n"
                f"Note: No user financial data available. Provide general guidance.\n"
                f"Respond with a JSON object following your output format instructions."
            )

        try:
            health = await data_service.get_health_metrics(db_id)
            txns = data_service.get_transactions(db_id, days=30)
            recurring = data_service.get_recurring_charges(db_id)
            goals = data_service.get_goals(db_id)
            categories = data_service.get_category_breakdown(db_id, days=30)

            txn_sample = [
                {
                    "date": t.get("date", ""),
                    "merchant": t.get("merchant_name", ""),
                    "amount": float(t.get("amount", 0)),
                    "category": t.get("category", ""),
                    "type": t.get("type", ""),
                }
                for t in txns[:25]
            ]
            data_block = json.dumps(txn_sample, indent=1, default=str)

            recurring_block = json.dumps([
                {
                    "name": r.get("merchant_name", ""),
                    "amount": float(r.get("average_amount", 0)),
                    "category": r.get("category", ""),
                    "value_score": r.get("value_score", 3),
                    "status": r.get("status", ""),
                }
                for r in recurring
            ], indent=1, default=str)

            goals_block = json.dumps([
                {
                    "name": g.get("name", ""),
                    "target": float(g.get("target_amount", 0)),
                    "current": float(g.get("current_amount", 0)),
                    "deadline": g.get("target_date", ""),
                }
                for g in goals
            ], indent=1, default=str) if goals else "No goals set."

            cat_lines = ", ".join(f"{c['category']}: ${c['amount']:,.0f}" for c in categories[:5])

            return (
                f"=== USER FINANCIAL SNAPSHOT ===\n"
                f"Balance: ${health['balance']:,.2f}\n"
                f"Spent this month: ${health['spent_this_month']:,.2f}\n"
                f"Saved this month: ${health['saved']:,.2f}\n"
                f"Avg monthly spend: ${health['budget_limit']:,.0f}\n"
                f"Top categories: {cat_lines}\n\n"
                f"=== RECURRING CHARGES ===\n{recurring_block}\n\n"
                f"=== GOALS ===\n{goals_block}\n\n"
                f"=== RECENT TRANSACTIONS (last 25) ===\n{data_block}\n\n"
                f"=== ANALYSIS REQUEST ===\n{context}\n\n"
                f"Respond with a JSON object following your output format instructions."
            )
        except Exception as e:
            logger.warning(f"Could not build specialist context: {e}")
            return (
                f"=== ANALYSIS REQUEST ===\n{context}\n\n"
                f"Note: Error loading user data: {e}. Provide best guidance possible.\n"
                f"Respond with a JSON object following your output format instructions."
            )

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
