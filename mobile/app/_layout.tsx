import "../global.css";
import { Stack } from "expo-router";
import { Auth0Provider } from "react-native-auth0";
import { StatusBar } from "expo-status-bar";
import { useAuthToken } from "../hooks/useAuthToken";

const AUTH0_DOMAIN = process.env.EXPO_PUBLIC_AUTH0_DOMAIN ?? "";
const AUTH0_CLIENT_ID = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID ?? "";

function TokenSyncer() {
  useAuthToken();
  return null;
}

export default function RootLayout() {
  return (
    <Auth0Provider domain={AUTH0_DOMAIN} clientId={AUTH0_CLIENT_ID}>
      <TokenSyncer />
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </Auth0Provider>
  );
}
