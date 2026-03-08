# Ledger

A personal finance platform that brings together bank data, email receipt scanning, and AI-powered agents to give users a complete picture of their money. Built with React, FastAPI, Supabase, and Plaid.

---

## Overview

Ledger connects to your bank accounts via Plaid and your email via Gmail to automatically track income, expenses, and recurring subscriptions. Four AI agents (Pulse, Audit, North Star, Sentinel) analyze your financial data and provide actionable insights through a conversational interface.

### Key Features

- **Cashflow View** -- Historical and projected cashflow chart with time-range selection (1W, 1M, 3M, 6M)
- **Expense Tracking** -- Recurring charges detected from bank transactions, email receipts, or manual entry, grouped by category
- **Gmail Integration** -- OAuth-based email scanning that uses LLM extraction to find subscriptions from billing receipts
- **AI Agent Team** -- Four specialized agents coordinated by a Council orchestrator via Backboard.io
- **Goal Planning** -- Savings goals with feasibility analysis and monthly contribution tracking
- **Chat Interface** -- Natural language Q&A about your finances, routed to the appropriate specialist agent
- **Plaid Banking** -- Link bank accounts, sync transactions, detect recurring patterns
- **Interactive Onboarding** -- Multi-step flow with common expense selection, email linking, rent/utilities setup, and goal creation

---

## Architecture

```
frontend/          React 18 + Vite + TypeScript + Tailwind CSS v4
backend/           FastAPI + Python 3.11
database           Supabase (PostgreSQL + Row Level Security)
auth               Auth0 (JWT-based)
banking            Plaid (sandbox or production)
ai agents          Backboard.io (multi-agent orchestration)
email              Gmail API (OAuth 2.0, read-only)
deployment         Railway (Docker, auto-deploy on push)
```

### Backend Structure

```
backend/
  app/
    main.py                    FastAPI app, CORS, router registration
    config.py                  Environment variable configuration
    dependencies.py            Auth0 JWT validation, user resolution
    routers/
      auth.py                  /auth -- login status, onboarding completion
      plaid.py                 /plaid -- link tokens, transaction sync, sandbox tools
      dashboard.py             /dashboard -- health metrics, week ahead, action queue
      forecast.py              /cashflow -- historical + projected cashflow data
      subscriptions.py         /expenses -- recurring charges CRUD
      goals.py                 /goals -- savings goals with feasibility
      chat.py                  /chat -- agent conversations with history persistence
      briefing.py              /briefing -- weekly briefing generation
      email.py                 /email -- Gmail OAuth, receipt scanning
      settings.py              /settings -- user preferences, data export, account deletion
    services/
      backboard_service.py     Multi-agent orchestration (Council + 4 specialists)
      data_service.py          Central data access layer for all Supabase queries
      email_service.py         Gmail API integration, LLM-powered receipt extraction
      plaid_service.py         Plaid API wrapper
      supabase_client.py       Supabase client singleton
      elevenlabs_service.py    Voice briefing (TTS)
      demo_data.py             Seed data generation
      transaction_processor.py Transaction categorization and recurring detection
    agents/
      orchestrator.py          Routes chat to Council, coordinates specialist calls
      prompts.py               System prompts for all agents and Council tools
      pulse.py                 Cashflow forecasting specialist
      audit.py                 Subscription/expense auditing specialist
      north_star.py            Goal planning specialist
      sentinel.py              Anomaly detection specialist
```

### Frontend Structure

```
frontend/src/
  App.tsx                      Router setup, protected routes
  main.tsx                     Auth0Provider wrapper
  pages/
    LandingPage.tsx            Public welcome/login page
    CallbackPage.tsx           Auth0 OAuth callback handler
    OnboardingPage.tsx         7-step interactive onboarding flow
    HomePage.tsx               Dashboard with health metrics, week ahead, category breakdown
    CashflowPage.tsx           Cashflow chart with time-range selector
    ExpensesPage.tsx           Recurring charges with category grouping, email scanning, manual add
    GoalsPage.tsx              Savings goals with progress rings and feasibility
    ChatPage.tsx               Agent chat with history persistence
    SettingsPage.tsx           Linked accounts, preferences, sandbox tools, privacy, about
  components/
    finance/                   CashFlowChart, MoneyText, GoalRing, AgentBadge, ActionCard, BriefingPlayer
    layout/                    AppLayout, Sidebar, MobileNav, DotGrid
  lib/
    api.ts                     Typed API client for all backend endpoints
    utils.ts                   Formatting helpers (cn, formatMoney, getGreeting)
  hooks/
    useAuthToken.ts            Auth0 token management
  types/
    index.ts                   Shared TypeScript interfaces
```

---

## Database Schema

Supabase PostgreSQL with RLS enabled on all tables.

| Table | Purpose |
|-------|---------|
| `users` | Auth0 user profiles, preferences (JSONB), monthly rent |
| `linked_accounts` | Plaid access tokens, institution info, account balances |
| `transactions` | Synced transaction history from Plaid |
| `recurring_charges` | Detected recurring expenses (bank, email, or manual source) |
| `goals` | Savings goals with target amounts, dates, feasibility |
| `action_queue` | Agent-generated action items (pending/approved/dismissed) |
| `briefings` | Generated weekly briefings with optional audio URL |
| `chat_messages` | Persisted chat history (user + agent messages) |
| `email_accounts` | Linked Gmail accounts with OAuth tokens |

---

## AI Agents

Powered by [Backboard.io](https://backboard.io) for multi-agent orchestration with persistent memory.

| Agent | Role | Color |
|-------|------|-------|
| **Council** | Lead orchestrator -- routes queries, delegates to specialists, synthesizes responses | -- |
| **Pulse** | Cashflow forecasting -- predicts low balances, finds timing strategies | Blue |
| **Audit** | Expense auditing -- scores subscriptions, detects waste, extracts email receipts | Gold |
| **North Star** | Goal planning -- feasibility analysis, scenario modeling, reallocation | Emerald |
| **Sentinel** | Anomaly detection -- unusual charges, budget drift, spending guards | Amber |

Council uses tool calls to fetch real financial data before responding. Specialists run stateless analysis with `memory="off"`.

---

## Environment Variables

### Backend

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH0_DOMAIN` | Yes | Auth0 tenant domain |
| `AUTH0_CLIENT_ID` | Yes | Auth0 application client ID |
| `AUTH0_CLIENT_SECRET` | Yes | Auth0 application client secret |
| `AUTH0_AUDIENCE` | Yes | Auth0 API audience |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (bypasses RLS) |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `PLAID_CLIENT_ID` | Yes | Plaid API client ID |
| `PLAID_SECRET` | Yes | Plaid API secret |
| `PLAID_ENV` | No | `sandbox` (default) or `production` |
| `BACKBOARD_API_KEY` | Yes | Backboard.io API key for agent orchestration |
| `LLM_PROVIDER` | No | `openai` (default) |
| `LLM_MODEL` | No | `gpt-4.1-mini` (default) |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID for Gmail integration |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `ELEVENLABS_API_KEY` | No | ElevenLabs API key for voice briefings |
| `FRONTEND_URL` | Yes | Frontend origin for CORS and OAuth redirects |

### Frontend

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL |
| `VITE_AUTH0_DOMAIN` | Auth0 tenant domain |
| `VITE_AUTH0_CLIENT_ID` | Auth0 SPA client ID |
| `VITE_AUTH0_AUDIENCE` | Auth0 API audience |

---

## Local Development

### Prerequisites

- Node.js 20+
- Python 3.11+
- A Supabase project
- Auth0 tenant with SPA + API configured
- Plaid sandbox credentials

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Fill in your keys
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env  # Fill in your keys
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies API calls to `http://localhost:8000`.

---

## Deployment

Both services deploy to Railway via Docker. Push to `main` triggers auto-deploy.

- **Backend**: Python 3.11 slim image, uvicorn on `$PORT`
- **Frontend**: Two-stage Node build, served with `serve` on port 3000

### Gmail Integration Setup

1. Create a Google Cloud project and enable the Gmail API
2. Configure OAuth consent screen (External, add `gmail.readonly` scope)
3. Create OAuth Web client with redirect URI: `https://<backend-domain>/email/oauth-callback`
4. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` on the backend

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/me` | Current user + onboarding status |
| POST | `/auth/onboarding-complete` | Complete onboarding with preferences |
| POST | `/plaid/link-token` | Create Plaid Link token |
| POST | `/plaid/exchange` | Exchange public token for access token |
| POST | `/plaid/sync` | Sync transactions from Plaid |
| GET | `/plaid/accounts` | List linked bank accounts |
| GET | `/dashboard/briefing` | Health metrics, week ahead, action queue |
| GET | `/dashboard/categories` | Spending breakdown by category |
| GET | `/cashflow` | Historical + projected cashflow |
| GET | `/expenses` | List recurring charges |
| POST | `/expenses` | Manually add an expense |
| POST | `/expenses/{id}/decision` | Keep, cancel, or flag an expense |
| GET | `/goals` | List savings goals |
| POST | `/goals` | Create a goal |
| PATCH | `/goals/{id}` | Update a goal |
| DELETE | `/goals/{id}` | Delete a goal |
| POST | `/chat/message` | Send message to agent team |
| GET | `/chat/history` | Load chat history |
| GET | `/email/auth-url` | Get Gmail OAuth consent URL |
| GET | `/email/oauth-callback` | Handle Gmail OAuth redirect |
| POST | `/email/scan` | Scan linked emails for subscriptions |
| GET | `/settings` | User preferences |
| PATCH | `/settings` | Update preferences |
| POST | `/settings/export` | Export all user data as JSON |
| DELETE | `/settings/account` | Delete user account and all data |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS v4, Framer Motion |
| Backend | FastAPI, Python 3.11, Pydantic |
| Database | Supabase (PostgreSQL) |
| Auth | Auth0 (JWT RS256) |
| Banking | Plaid |
| AI | Backboard.io, GPT-4.1-mini |
| Email | Gmail API (OAuth 2.0) |
| Voice | ElevenLabs (optional) |
| Deployment | Railway (Docker) |
| Icons | Lucide React |
| Fonts | Inter, JetBrains Mono |

---

## License

Private repository. All rights reserved.
