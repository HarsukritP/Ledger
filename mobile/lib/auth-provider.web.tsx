import { Auth0Provider as WebProvider } from "@auth0/auth0-react";
import { PropsWithChildren } from "react";

const domain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN ?? "";
const clientId = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID ?? "";
const audience = `https://${domain}/api/v2/`;

export function Auth0Provider({ children }: PropsWithChildren) {
  // For loginWithPopup the popup itself navigates to redirect_uri internally.
  // Pointing to origin (the SPA root) ensures the popup loads the app shell,
  // which the Auth0 SDK uses to extract the auth code and post it back.
  const redirectUri =
    typeof window !== "undefined" ? window.location.origin : "";

  return (
    <WebProvider
      domain={domain}
      clientId={clientId}
      authorizationParams={{ redirect_uri: redirectUri, audience }}
    >
      {children}
    </WebProvider>
  );
}
