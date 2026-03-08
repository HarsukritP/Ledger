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
import { useTheme } from "../../lib/theme";
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
  const { colors } = useTheme();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* Header */}
        <View className="flex-row items-start justify-between px-4 pt-2 pb-3">
          <View>
            <Text className="text-2xl font-bold tracking-tight" style={{ color: colors.textPrimary }}>
              Talk to Ledger
            </Text>
            <Text className="text-sm mt-0.5" style={{ color: colors.textMuted }}>
              Ask anything about your finances — your agents are listening
            </Text>
          </View>
          {messages.length > 0 && (
            <Pressable
              onPress={clearChat}
              disabled={clearing}
              className="flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 mt-1"
              style={{ opacity: clearing ? 0.5 : 1, borderColor: colors.border }}
            >
              {clearing ? (
                <ActivityIndicator size={12} color={colors.textMuted} />
              ) : (
                <Feather name="trash-2" size={12} color={colors.textMuted} />
              )}
              <Text className="text-xs" style={{ color: colors.textMuted }}>Clear</Text>
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
              <ActivityIndicator size="small" color={colors.textMuted} />
              <Text className="text-sm" style={{ color: colors.textMuted }}>
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
                <View
                  className="max-w-[85%] rounded-2xl border px-4 py-3"
                  style={{ borderColor: `${colors.danger}4D`, backgroundColor: `${colors.danger}1A` }}
                >
                  <View className="flex-row items-center gap-2 mb-1">
                    <Feather name="alert-triangle" size={14} color={colors.danger} />
                    <Text className="text-xs font-medium" style={{ color: colors.danger }}>
                      Error
                    </Text>
                  </View>
                  <Text className="font-mono text-xs leading-relaxed" style={{ color: `${colors.danger}CC` }}>
                    {msg.text}
                  </Text>
                </View>
              ) : (
                <View
                  className={
                    msg.role === "user"
                      ? "max-w-[75%] rounded-2xl px-4 py-3"
                      : "max-w-[85%] rounded-2xl border px-4 py-3"
                  }
                  style={
                    msg.role === "user"
                      ? { backgroundColor: colors.surfaceRaised }
                      : { borderColor: colors.border, backgroundColor: colors.surface }
                  }
                >
                  {msg.agent && (
                    <View className="mb-2">
                      <AgentBadge agent={msg.agent} />
                    </View>
                  )}
                  <Text className="text-sm leading-relaxed" style={{ color: colors.textPrimary }}>
                    {msg.text}
                  </Text>
                </View>
              )}
            </View>
          ))}

          {loading && (
            <View className="items-start">
              <View
                className="flex-row items-center gap-3 rounded-2xl border px-4 py-3"
                style={{ borderColor: colors.border, backgroundColor: colors.surface }}
              >
                <ActivityIndicator size="small" color={colors.gold} />
                <Text className="text-sm" style={{ color: colors.textMuted }}>
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
              className="rounded-full border px-3 py-1.5"
              style={{ opacity: loading ? 0.4 : 1, borderColor: colors.border }}
            >
              <Text className="text-xs" style={{ color: colors.textSecondary }}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Input bar */}
        <View className="flex-row items-center gap-2 px-4 pb-4 pt-1">
          <View
            className="flex-1 rounded-full border px-4 py-2.5"
            style={{ borderColor: colors.border, backgroundColor: colors.surface }}
          >
            <TextInput
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => send(input)}
              placeholder="Ask Ledger anything..."
              placeholderTextColor={colors.textMuted}
              returnKeyType="send"
              editable={!loading}
              className="text-sm"
              style={{ maxHeight: 80, color: colors.textPrimary }}
              multiline
            />
          </View>
          <Pressable
            onPress={() => send(input)}
            disabled={loading || !input.trim()}
            className="h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ opacity: loading || !input.trim() ? 0.4 : 1, backgroundColor: colors.gold }}
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
