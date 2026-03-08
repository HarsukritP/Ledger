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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: "700", letterSpacing: -0.5, color: colors.textPrimary }}>
              Talk to Ledger
            </Text>
            <Text style={{ fontSize: 13, marginTop: 2, color: colors.textMuted }}>
              Ask anything about your finances — your agents are listening
            </Text>
          </View>
          {messages.length > 0 && (
            <Pressable
              onPress={clearChat}
              disabled={clearing}
              style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, marginTop: 4, opacity: clearing ? 0.5 : 1, borderColor: colors.border }}
            >
              {clearing ? (
                <ActivityIndicator size={12} color={colors.textMuted} />
              ) : (
                <Feather name="trash-2" size={12} color={colors.textMuted} />
              )}
              <Text style={{ fontSize: 12, color: colors.textMuted }}>Clear</Text>
            </Pressable>
          )}
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 12, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
        >
          {historyLoading && (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 32 }}>
              <ActivityIndicator size="small" color={colors.textMuted} />
              <Text style={{ fontSize: 14, color: colors.textMuted }}>
                Loading conversation...
              </Text>
            </View>
          )}

          {messages.map((msg) => (
            <View
              key={msg.id}
              style={{ alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}
            >
              {msg.role === "error" ? (
                <View
                  style={{ maxWidth: "85%", borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, borderColor: `${colors.danger}4D`, backgroundColor: `${colors.danger}1A` }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <Feather name="alert-triangle" size={14} color={colors.danger} />
                    <Text style={{ fontSize: 12, fontWeight: "500", color: colors.danger }}>Error</Text>
                  </View>
                  <Text style={{ fontSize: 12, lineHeight: 18, color: `${colors.danger}CC` }}>
                    {msg.text}
                  </Text>
                </View>
              ) : (
                <View
                  style={[
                    { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
                    msg.role === "user"
                      ? { maxWidth: "75%", backgroundColor: colors.surfaceRaised }
                      : { maxWidth: "85%", borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
                  ]}
                >
                  {msg.agent && (
                    <View style={{ marginBottom: 8 }}>
                      <AgentBadge agent={msg.agent} />
                    </View>
                  )}
                  <Text style={{ fontSize: 14, lineHeight: 20, color: colors.textPrimary }}>
                    {msg.text}
                  </Text>
                </View>
              )}
            </View>
          ))}

          {loading && (
            <View style={{ alignItems: "flex-start" }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, borderColor: colors.border, backgroundColor: colors.surface }}
              >
                <ActivityIndicator size="small" color={colors.gold} />
                <Text style={{ fontSize: 14, color: colors.textMuted }}>
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
          style={{ flexShrink: 0 }}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 8 }}
        >
          {SUGGESTIONS.map((s) => (
            <Pressable
              key={s}
              onPress={() => send(s)}
              disabled={loading}
              style={{ borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, opacity: loading ? 0.4 : 1, borderColor: colors.border }}
            >
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Input bar */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingBottom: 8, paddingTop: 4 }}>
          <View
            style={{ flex: 1, borderRadius: 999, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, borderColor: colors.border, backgroundColor: colors.surface }}
          >
            <TextInput
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => send(input)}
              placeholder="Ask Ledger anything..."
              placeholderTextColor={colors.textMuted}
              returnKeyType="send"
              editable={!loading}
              style={{ maxHeight: 80, fontSize: 14, color: colors.textPrimary }}
              multiline
            />
          </View>
          <Pressable
            onPress={() => send(input)}
            disabled={loading || !input.trim()}
            style={{ height: 40, width: 40, alignItems: "center", justifyContent: "center", borderRadius: 999, flexShrink: 0, opacity: loading || !input.trim() ? 0.4 : 1, backgroundColor: colors.gold }}
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
