import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { AgentBadge } from "../../components/finance/AgentBadge";
import { api } from "../../lib/api";
import type { AgentName } from "../../types";

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

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    api.chat
      .history()
      .then((history) => {
        if (!history || history.length === 0) return;
        setMessages(
          history.map((h: any) => ({
            id: h.id,
            role: h.role === "agent" ? "agent" : h.role === "error" ? "error" : "user",
            agent: mapAgent(h.agent),
            text: h.text,
          }))
        );
      })
      .catch((err) => console.error("Failed to load history:", err))
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

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
      setMessages((prev) => [
        ...prev,
        {
          id: response.id || `agent-${Date.now()}`,
          role: "agent",
          agent: mapAgent(response.agent),
          text: response.text,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "error",
          text: `Agent error: ${err.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-base" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* Header */}
        <View className="flex-row items-start justify-between px-4 pt-2 pb-3">
          <View>
            <Text className="text-2xl font-bold tracking-tight text-text-primary">
              Talk to Ledger
            </Text>
            <Text className="text-sm text-text-muted mt-0.5">
              Ask anything about your finances — your agents are listening
            </Text>
          </View>
          {messages.length > 0 && (
            <Pressable
              onPress={clearChat}
              disabled={clearing}
              className="flex-row items-center gap-1.5 rounded-full border border-border px-3 py-1.5 mt-1"
              style={{ opacity: clearing ? 0.5 : 1 }}
            >
              {clearing ? (
                <ActivityIndicator size={12} color="#71717A" />
              ) : (
                <Feather name="trash-2" size={12} color="#71717A" />
              )}
              <Text className="text-xs text-text-muted">Clear</Text>
            </Pressable>
          )}
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          className="flex-1 px-4"
          contentContainerStyle={{ gap: 12, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
        >
          {historyLoading && (
            <View className="flex-row items-center justify-center gap-2 py-8">
              <ActivityIndicator size="small" color="#71717A" />
              <Text className="text-sm text-text-muted">
                Loading conversation...
              </Text>
            </View>
          )}

          {messages.map((msg) => (
            <View
              key={msg.id}
              className={
                msg.role === "user" ? "items-end" : "items-start"
              }
            >
              {msg.role === "error" ? (
                <View className="max-w-[85%] rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Feather name="alert-triangle" size={14} color="#EF4444" />
                    <Text className="text-xs font-medium text-danger">
                      Error
                    </Text>
                  </View>
                  <Text className="font-mono text-xs text-danger/80 leading-relaxed">
                    {msg.text}
                  </Text>
                </View>
              ) : (
                <View
                  className={
                    msg.role === "user"
                      ? "max-w-[75%] rounded-2xl bg-surface-raised px-4 py-3"
                      : "max-w-[85%] rounded-2xl border border-border bg-surface px-4 py-3"
                  }
                >
                  {msg.agent && (
                    <View className="mb-2">
                      <AgentBadge agent={msg.agent} />
                    </View>
                  )}
                  <Text className="text-sm leading-relaxed text-text-primary">
                    {msg.text}
                  </Text>
                </View>
              )}
            </View>
          ))}

          {loading && (
            <View className="items-start">
              <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
                <ActivityIndicator size="small" color="#D4A853" />
                <Text className="text-sm text-text-muted">
                  Agents are thinking...
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Suggestion chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-none"
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 8 }}
        >
          {SUGGESTIONS.map((s) => (
            <Pressable
              key={s}
              onPress={() => send(s)}
              disabled={loading}
              className="rounded-full border border-border px-3 py-1.5"
              style={{ opacity: loading ? 0.4 : 1 }}
            >
              <Text className="text-xs text-text-secondary">{s}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Input bar */}
        <View className="flex-row items-center gap-2 px-4 pb-4 pt-1">
          <View className="flex-1 rounded-full border border-border bg-surface px-4 py-2.5">
            <TextInput
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => send(input)}
              placeholder="Ask Ledger anything..."
              placeholderTextColor="#71717A"
              returnKeyType="send"
              editable={!loading}
              className="text-sm text-text-primary"
              style={{ maxHeight: 80 }}
              multiline
            />
          </View>
          <Pressable
            onPress={() => send(input)}
            disabled={loading || !input.trim()}
            className="h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold"
            style={{ opacity: loading || !input.trim() ? 0.4 : 1 }}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Feather name="send" size={18} color="#000" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
