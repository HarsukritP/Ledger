import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useRef, useState } from "react";

let cachedToken: string | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

export function useAuthToken() {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const fetching = useRef(false);
  const [token, setToken] = useState<string | null>(cachedToken);

  useEffect(() => {
    const onChange = () => setToken(cachedToken);
    listeners.add(onChange);
    return () => { listeners.delete(onChange); };
  }, []);

  useEffect(() => {
    if (isAuthenticated && !cachedToken && !fetching.current) {
      fetching.current = true;
      getAccessTokenSilently()
        .then((t) => {
          cachedToken = t;
          console.log("[AUTH] token acquired, length:", t.length);
          notifyListeners();
        })
        .catch((err) => {
          console.error("[AUTH] FAILED to get token:", err);
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

export function waitForToken(timeoutMs = 10000): Promise<string> {
  if (cachedToken) return Promise.resolve(cachedToken);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      listeners.delete(onChange);
      reject(new Error("Auth token not available after " + timeoutMs + "ms"));
    }, timeoutMs);

    const onChange = () => {
      if (cachedToken) {
        clearTimeout(timeout);
        listeners.delete(onChange);
        resolve(cachedToken);
      }
    };
    listeners.add(onChange);
  });
}

export function setToken(t: string) {
  cachedToken = t;
  notifyListeners();
}
