import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, Mic, Loader2, AlertTriangle, Trash2 } from "lucide-react";
import { AgentBadge } from "../components/finance/AgentBadge";
import { api } from "../lib/api";
import type { AgentName } from "../types";

interface Message {
  id: string;
  role: "user" | "agent" | "error";
  agent?: AgentName;
  text: string;
}

const SUGGESTIONS = [
  "How is my cashflow looking this week?",
  "Review my subscriptions",
  "Are my goals on track?",
  "Sentinel, anything unusual in my spending?",
];

function mapAgent(backend: string | undefined): AgentName | undefined {
  if (!backend) return undefined;
  const map: Record<string, AgentName> = {
    pulse: "pulse",
    audit: "audit",
    north_star: "north-star",
    "north-star": "north-star",
    sentinel: "sentinel",
    council: "pulse",
  };
  return map[backend] ?? "pulse";
}

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    api.chat
      .history()
      .then((history) => {
        if (!history || history.length === 0) return;
        const mapped: Message[] = history.map((h: any) => ({
          id: h.id,
          role: h.role === "agent" ? "agent" : h.role === "error" ? "error" : "user",
          agent: mapAgent(h.agent),
          text: h.text,
        }));
        setMessages(mapped);
      })
      .catch((err) => {
        console.error("Failed to load chat history:", err);
      })
      .finally(() => setHistoryLoading(false));
  }, []);

  const clearChat = useCallback(async () => {
    setClearing(true);
    try {
      await api.chat.clear();
      setMessages([]);
    } catch (err) {
      console.error("Failed to clear chat:", err);
    } finally {
      setClearing(false);
    }
  }, []);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      text: text.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await api.chat.send(text.trim());
      const agentMsg: Message = {
        id: response.id || `agent-${Date.now()}`,
        role: "agent",
        agent: mapAgent(response.agent),
        text: response.text,
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch (err: any) {
      console.error("Chat send failed:", err);
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        role: "error",
        text: `Agent error: ${err.message}`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col md:h-[calc(100vh-4rem)]">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Talk to Ledger
          </h1>
          <p className="text-sm text-text-muted">
            Ask anything about your finances — your agents are listening
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            disabled={clearing}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-danger/30 hover:text-danger disabled:opacity-50"
          >
            {clearing ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pr-2">
        {historyLoading && (
          <div className="flex items-center justify-center py-8 text-text-muted">
            <Loader2 size={16} className="animate-spin" />
            <span className="ml-2 text-sm">Loading conversation...</span>
          </div>
        )}

        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={
              msg.role === "user"
                ? "flex justify-end"
                : "flex justify-start"
            }
          >
            {msg.role === "error" ? (
              <div className="max-w-[85%] rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                <div className="mb-1 flex items-center gap-2 text-red-400">
                  <AlertTriangle size={14} />
                  <span className="text-xs font-medium">Error</span>
                </div>
                <p className="font-mono text-xs leading-relaxed text-red-300">
                  {msg.text}
                </p>
              </div>
            ) : (
              <div
                className={
                  msg.role === "user"
                    ? "max-w-[75%] rounded-2xl bg-surface-raised px-4 py-3"
                    : "max-w-[85%] rounded-2xl border border-border bg-surface px-4 py-3"
                }
              >
                {msg.agent && (
                  <AgentBadge agent={msg.agent} className="mb-2" />
                )}
                <p className="text-sm leading-relaxed text-text-primary whitespace-pre-wrap">
                  {msg.text}
                </p>
              </div>
            )}
          </motion.div>
        ))}

        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
              <Loader2 size={16} className="animate-spin text-gold" />
              <span className="text-sm text-text-muted">
                Agents are thinking...
              </span>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto py-1">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            disabled={loading}
            className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary disabled:opacity-40"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-text-muted hover:bg-surface-raised">
          <Mic size={18} />
        </button>
        <div className="relative flex-1">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder="Ask Ledger anything..."
            disabled={loading}
            className="w-full rounded-full border border-border bg-surface px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/50 focus:outline-none disabled:opacity-50"
          />
        </div>
        <button
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-black hover:bg-gold/90 disabled:opacity-40"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Send size={18} />
          )}
        </button>
      </div>
    </div>
  );
}
