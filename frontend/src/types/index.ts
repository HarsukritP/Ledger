export type AgentName = "pulse" | "audit" | "north-star" | "sentinel";

export interface AgentInfo {
  name: string;
  displayName: string;
  description: string;
  color: string;
  bgColor: string;
}

export const AGENTS: Record<AgentName, AgentInfo> = {
  pulse: {
    name: "pulse",
    displayName: "Pulse",
    description: "Watches your cash flow and warns you before things get tight",
    color: "#60A5FA",
    bgColor: "#60A5FA15",
  },
  audit: {
    name: "audit",
    displayName: "Audit",
    description: "Tracks every subscription and recurring charge, finds waste",
    color: "#D4A853",
    bgColor: "#D4A85315",
  },
  "north-star": {
    name: "north-star",
    displayName: "North Star",
    description: "Keeps your goals realistic and on track",
    color: "#34D399",
    bgColor: "#34D39915",
  },
  sentinel: {
    name: "sentinel",
    displayName: "Sentinel",
    description: "Catches weird charges and spending drift early",
    color: "#F59E0B",
    bgColor: "#F59E0B15",
  },
};

export interface ActionItem {
  id: string;
  agent: AgentName;
  type: "warning" | "suggestion" | "question";
  title: string;
  description: string;
  amount?: number;
  actions: { label: string; variant: "primary" | "ghost" | "danger" }[];
}

export interface ForecastEvent {
  id: string;
  date: string;
  name: string;
  amount: number;
  type: "income" | "bill" | "expense" | "savings";
  category?: string;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: "monthly" | "weekly" | "annual";
  valueScore: number;
  status: "active" | "flagged" | "cancelled" | "paused";
  lastChargeDate: string;
  usageEstimate?: string;
  priceHistory?: { date: string; amount: number }[];
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  monthlyContribution: number;
  feasibility: "on_track" | "at_risk" | "behind";
}

export interface HealthMetrics {
  balance: number;
  spentThisMonth: number;
  saved: number;
  budgetLimit: number;
}
