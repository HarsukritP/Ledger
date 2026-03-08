import { Tabs } from "expo-router";
import { useAuth0 } from "../../lib/use-auth";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AppLayout() {
  const { user, isLoading } = useAuth0();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/welcome");
    }
  }, [user, isLoading, router]);

  // Use actual safe-area inset so the tab bar clears the home indicator on every
  // platform (native iOS, native Android, and iOS Safari/PWA on web).
  const bottomInset = insets.bottom ?? 0;
  const TAB_HEIGHT = 56;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#111114",
          borderTopColor: "#27272A",
          borderTopWidth: 1,
          height: TAB_HEIGHT + bottomInset,
          paddingBottom: bottomInset > 0 ? bottomInset - 4 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: "#D4A853",
        tabBarInactiveTintColor: "#71717A",
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "500",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="forecast"
        options={{
          title: "Cash Flow",
          tabBarIcon: ({ color, size }) => (
            <Feather name="trending-up" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="subscriptions"
        options={{
          title: "Expenses",
          tabBarIcon: ({ color, size }) => (
            <Feather name="credit-card" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: "Goals",
          tabBarIcon: ({ color, size }) => (
            <Feather name="target" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, size }) => (
            <Feather name="message-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Feather name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
