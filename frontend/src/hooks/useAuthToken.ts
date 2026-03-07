import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useRef, useState } from "react";

let cachedToken: string | null = null;
let tokenError: string | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

export function useAuthToken() {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const fetching = useRef(false);
  const [token, setTokenState] = useState<string | null>(cachedToken);

  useEffect(() => {
    const onChange = () => setTokenState(cachedToken);
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated && !cachedToken && !fetching.current) {
      fetching.current = true;
      tokenError = null;
      getAccessTokenSilently()
        .then((t) => {
          cachedToken = t;
          console.log("[AUTH] token acquired, length:", t.length);
          notifyListeners();
        })
        .catch((err) => {
          tokenError = String(err?.message || err);
          console.error("[AUTH] FAILED to get token:", err);
          notifyListeners();
        })
        .finally(() => {
          fetching.current = false;
        });
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  return token;
}

export function getToken(): string | null {
  return cachedToken;
}

export function getTokenError(): string | null {
  return tokenError;
}

export function waitForToken(timeoutMs = 10000): Promise<string> {
  if (cachedToken) return Promise.resolve(cachedToken);
  if (tokenError) return Promise.reject(new Error(`Auth failed: ${tokenError}`));

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      listeners.delete(onChange);
      const reason = tokenError
        ? `Auth failed: ${tokenError}`
        : `Auth token not available after ${timeoutMs}ms`;
      reject(new Error(reason));
    }, timeoutMs);

    const onChange = () => {
      if (cachedToken) {
        clearTimeout(timeout);
        listeners.delete(onChange);
        resolve(cachedToken);
      } else if (tokenError) {
        clearTimeout(timeout);
        listeners.delete(onChange);
        reject(new Error(`Auth failed: ${tokenError}`));
      }
    };
    listeners.add(onChange);
  });
}

export function setToken(t: string) {
  cachedToken = t;
  tokenError = null;
  notifyListeners();
}
