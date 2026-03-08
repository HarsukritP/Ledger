import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  PropsWithChildren,
} from "react";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

// Required: lets the in-app browser hand the auth result back to the app.
WebBrowser.maybeCompleteAuthSession();

const DOMAIN = process.env.EXPO_PUBLIC_AUTH0_DOMAIN ?? "";
const CLIENT_ID = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID ?? "";
const AUDIENCE = `https://${DOMAIN}/api/v2/`;

const DISCOVERY = {
  authorizationEndpoint: `https://${DOMAIN}/authorize`,
  tokenEndpoint: `https://${DOMAIN}/oauth/token`,
};

interface AuthContextValue {
  user: any | null;
  isLoading: boolean;
  accessToken: string | null;
  authorize: () => Promise<void>;
  getCredentials: () => Promise<{ accessToken: string } | null>;
  clearSession: () => void;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: false,
  accessToken: null,
  authorize: async () => {},
  getCredentials: async () => null,
  clearSession: () => {},
});

export function Auth0Provider({
  children,
  domain: _domain,
  clientId: _clientId,
}: PropsWithChildren<{ domain?: string; clientId?: string }>) {
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // makeRedirectUri generates the right URI for the current environment:
  //   Expo Go (tunnel)   → exp://xxxx.exp.direct/--/callback
  //   Expo Go (LAN)      → exp://192.168.x.x:8081/--/callback
  //   Standalone build   → ledger://callback
  const redirectUri = AuthSession.makeRedirectUri({ path: "callback" });
  // Log once so you can copy-paste the exact value into Auth0 dashboard.
  console.log("[AUTH] Redirect URI →", redirectUri);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CLIENT_ID,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      scopes: ["openid", "profile", "email"],
      extraParams: { audience: AUDIENCE },
    },
    DISCOVERY
  );

  // Exchange the auth code for tokens once the browser session closes.
  useEffect(() => {
    if (!response) return;

    if (response.type !== "success" || !request?.codeVerifier) {
      setIsLoading(false);
      return;
    }

    AuthSession.exchangeCodeAsync(
      {
        clientId: CLIENT_ID,
        code: response.params.code,
        redirectUri,
        extraParams: { code_verifier: request.codeVerifier },
      },
      DISCOVERY
    )
      .then((tokenResponse) => {
        setAccessToken(tokenResponse.accessToken);
        if (tokenResponse.idToken) {
          try {
            const [, payload] = tokenResponse.idToken.split(".");
            // atob is available in both React Native and web environments.
            const decoded = JSON.parse(atob(payload));
            setUser({
              sub: decoded.sub,
              name: decoded.name,
              email: decoded.email,
              picture: decoded.picture,
            });
          } catch {
            setUser({ sub: "unknown" });
          }
        }
      })
      .catch((err) => console.error("[AUTH] Token exchange failed:", err))
      .finally(() => setIsLoading(false));
  }, [response]);

  const authorize = async () => {
    setIsLoading(true);
    try {
      await promptAsync();
    } catch (err) {
      console.error("[AUTH] promptAsync failed:", err);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        accessToken,
        authorize,
        getCredentials: async () =>
          accessToken ? { accessToken } : null,
        clearSession: () => {
          setUser(null);
          setAccessToken(null);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
