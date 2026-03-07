import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Mic } from "lucide-react";
import { AgentBadge } from "../components/finance/AgentBadge";
import type { AgentName } from "../types";

interface Message {
  id: string;
  role: "user" | "agent";
  agent?: AgentName;
  text: string;
}

const SUGGESTIONS = [
  "Am I on track this month?",
  "What can I cut?",
  "Can I afford a new laptop?",
  "Why did my spending spike?",
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: "1",
    role: "agent",
    agent: "pulse",
    text: "Hey Harsukrit! I've been watching your cash flow. You have 2 bills coming up this week totaling $115. Your balance might get tight on Tuesday — want me to suggest a fix?",
  },
];

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      text: text.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    setTimeout(() => {
      const agentMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "agent",
        agent: "pulse",
        text: "Based on your spending patterns and upcoming bills, I'd recommend holding off on any large purchases until after your paycheck lands on the 11th. Your emergency fund is at 72%, which is solid progress. Want me to run a scenario on the laptop purchase?",
      };
      setMessages((prev) => [...prev, agentMsg]);
    }, 1200);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col md:h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          Talk to Ledger
        </h1>
        <p className="text-sm text-text-muted">Ask anything about your finances</p>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto pr-2">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
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
              <p className="text-sm leading-relaxed text-text-primary">{msg.text}</p>
            </div>
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      <div className="mt-3 flex gap-2 overflow-x-auto py-1">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
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
            className="w-full rounded-full border border-border bg-surface px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/50 focus:outline-none"
          />
        </div>
        <button
          onClick={() => send(input)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-black hover:bg-gold/90"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
