import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useRef } from "react";

let cachedToken: string | null = null;

export function useAuthToken() {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const fetching = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !cachedToken && !fetching.current) {
      fetching.current = true;
      getAccessTokenSilently()
        .then((token) => {
          cachedToken = token;
          console.log("[AUTH] token acquired, length:", token.length);
        })
        .catch((err) => {
          console.error("[AUTH] FAILED to get token:", err);
        })
        .finally(() => {
          fetching.current = false;
        });
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  return cachedToken;
}

export function getToken(): string | null {
  if (!cachedToken) {
    console.warn("[AUTH] getToken called but no token cached yet");
  }
  return cachedToken;
}

export function setToken(token: string) {
  cachedToken = token;
}
