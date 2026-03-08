import { getToken, waitForToken } from "../hooks/useAuthToken";

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let token = getToken();
  if (!token) {
    token = await waitForToken();
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options?.headers as Record<string, string>) ?? {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }

  return res.json();
}

export const api = {
  health: () => request<{ status: string }>("/health"),

  auth: {
    me: () =>
      request<{
        sub: string;
        email: string;
        name: string;
        onboarding_completed: boolean;
      }>("/auth/me"),
    completeOnboarding: (data: {
      rent?: number;
      goal_name?: string;
      goal_amount?: number;
      communication_style: string;
      briefing_frequency: string;
    }) =>
      request<{ status: string; onboarding_completed: boolean }>(
        "/auth/onboarding-complete",
        { method: "POST", body: JSON.stringify(data) }
      ),
  },

  dashboard: {
    briefing: () => request<any>("/dashboard/briefing"),
    health: () => request<any>("/dashboard/health"),
    categories: (days = 30) => request<any[]>(`/dashboard/categories?days=${days}`),
    action: (id: string, response: string) =>
      request(`/dashboard/action/${id}`, {
        method: "POST",
        body: JSON.stringify({ action_id: id, response }),
      }),
  },

  forecast: {
    get: (historyDays = 30) => request<any>(`/cashflow?history_days=${historyDays}`),
    events: () => request<any[]>("/cashflow/events"),
  },

  subscriptions: {
    list: () => request<any[]>("/expenses"),
    get: (id: string) => request<any>(`/expenses/${id}`),
    decide: (id: string, decision: string, reason?: string) =>
      request(
        `/expenses/${id}/decision?decision=${decision}&reason=${reason || ""}`,
        { method: "POST" }
      ),
  },

  goals: {
    list: () => request<any[]>("/goals"),
    create: (data: {
      name: string;
      target_amount: number;
      target_date: string;
    }) => request("/goals", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request(`/goals/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) => request(`/goals/${id}`, { method: "DELETE" }),
    feasibility: () => request<any>("/goals/feasibility"),
  },

  chat: {
    send: (message: string) =>
      request<any>("/chat/message", {
        method: "POST",
        body: JSON.stringify({ message }),
      }),
    history: () => request<any[]>("/chat/history"),
    clear: () => request<any>("/chat/history", { method: "DELETE" }),
  },

  briefing: {
    generate: () => request<any>("/briefing/generate", { method: "POST" }),
    audio: () => request<any>("/briefing/audio"),
  },

  plaid: {
    linkToken: () => request<any>("/plaid/link-token", { method: "POST" }),
    exchange: (publicToken: string) =>
      request<any>("/plaid/exchange", {
        method: "POST",
        body: JSON.stringify({ public_token: publicToken }),
      }),
    sync: () => request<any>("/plaid/sync", { method: "POST" }),
    accounts: () => request<any>("/plaid/accounts"),
    transactions: (days = 30) =>
      request<any>(`/plaid/transactions?days=${days}`),
    seed: (weeks = 8) =>
      request<any>("/plaid/sandbox/seed", {
        method: "POST",
        body: JSON.stringify({ weeks, clear_existing: true }),
      }),
  },

  email: {
    accounts: () => request<any>("/email/accounts"),
    authUrl: () => request<any>("/email/auth-url"),
    scan: () => request<any>("/email/scan", { method: "POST" }),
    unlink: (id: string) => request<any>(`/email/accounts/${id}`, { method: "DELETE" }),
  },

  settings: {
    get: () => request<any>("/settings"),
    update: (prefs: any) =>
      request("/settings", {
        method: "PATCH",
        body: JSON.stringify(prefs),
      }),
    memories: () => request<any>("/settings/memories"),
    deleteMemory: (id: string) =>
      request(`/settings/memory/${id}`, { method: "DELETE" }),
    export: () => request<any>("/settings/export", { method: "POST" }),
    deleteAccount: () => request("/settings/account", { method: "DELETE" }),
  },
};
