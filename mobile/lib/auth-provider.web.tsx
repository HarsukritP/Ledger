import { Auth0Provider as WebProvider } from "@auth0/auth0-react";
import { PropsWithChildren } from "react";

const domain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN ?? "";
const clientId = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID ?? "";

export function Auth0Provider({ children }: PropsWithChildren) {
  const redirectUri =
    typeof window !== "undefined"
      ? window.location.origin + "/callback"
      : "";

  return (
    <WebProvider
      domain={domain}
      clientId={clientId}
      authorizationParams={{ redirect_uri: redirectUri }}
    >
      {children}
    </WebProvider>
  );
}
