import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useColorScheme as useSystemColorScheme, Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  resolved: ResolvedTheme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
  colors: typeof DARK_COLORS;
}

const STORAGE_KEY = "ledger-theme";

const DARK_COLORS = {
  bg: "#0A0A0C",
  surface: "#141418",
  surfaceRaised: "#1C1C22",
  surfaceHover: "#242430",
  border: "#2A2A35",
  borderSubtle: "#1E1E26",
  textPrimary: "#F5F5F7",
  textSecondary: "#94949C",
  textMuted: "#5C5C66",
  gold: "#D4A853",
  pulse: "#3B82F6",
  northStar: "#22C55E",
  sentinel: "#F97316",
  income: "#22C55E",
  warning: "#F97316",
  danger: "#EF4444",
  info: "#3B82F6",
  overlay: "rgba(0,0,0,0.6)",
  cardShadow: "rgba(0,0,0,0.2)",
  tabBar: "#141418",
  tabBorder: "#2A2A35",
  statusBar: "light" as const,
};

const LIGHT_COLORS = {
  bg: "#F7F7FA",
  surface: "#FFFFFF",
  surfaceRaised: "#F0F0F4",
  surfaceHover: "#E6E6EC",
  border: "#E0E0E6",
  borderSubtle: "#EBEBF0",
  textPrimary: "#111118",
  textSecondary: "#6B6B76",
  textMuted: "#9C9CA6",
  gold: "#D4A853",
  pulse: "#3B82F6",
  northStar: "#22C55E",
  sentinel: "#F97316",
  income: "#22C55E",
  warning: "#F97316",
  danger: "#EF4444",
  info: "#3B82F6",
  overlay: "rgba(0,0,0,0.4)",
  cardShadow: "rgba(0,0,0,0.06)",
  tabBar: "#FFFFFF",
  tabBorder: "#E0E0E6",
  statusBar: "dark" as const,
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  resolved: "dark",
  setTheme: () => {},
  toggle: () => {},
  colors: DARK_COLORS,
});

function resolveTheme(theme: Theme, systemScheme: "light" | "dark" | null | undefined): ResolvedTheme {
  if (theme === "system") return systemScheme === "light" ? "light" : "dark";
  return theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [theme, setThemeState] = useState<Theme>("dark");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") {
        setThemeState(stored);
      }
      setLoaded(true);
    });
  }, []);

  const resolved = resolveTheme(theme, systemScheme);
  const colors = resolved === "dark" ? DARK_COLORS : LIGHT_COLORS;

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    AsyncStorage.setItem(STORAGE_KEY, t);
  }, []);

  const toggle = useCallback(() => {
    setTheme(resolved === "dark" ? "light" : "dark");
  }, [resolved, setTheme]);

  useEffect(() => {
    if (loaded && typeof Appearance.setColorScheme === "function") {
      Appearance.setColorScheme(resolved);
    }
  }, [resolved, loaded]);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme, toggle, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export { DARK_COLORS, LIGHT_COLORS };
