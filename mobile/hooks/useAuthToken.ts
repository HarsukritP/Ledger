import { useEffect } from "react";
import { useAuth0 } from "../lib/use-auth";

let cachedToken: string | null = null;
let tokenError: string | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

export function useAuthToken() {
  const { getCredentials, isLoading, user } = useAuth0();

  useEffect(() => {
    if (isLoading || !user) return;
    if (cachedToken) return;

    getCredentials()
      .then((creds) => {
        if (creds?.accessToken) {
          cachedToken = creds.accessToken;
          tokenError = null;
          notifyListeners();
        }
      })
      .catch((err) => {
        tokenError = String(err?.message || err);
        notifyListeners();
      });
  }, [isLoading, user, getCredentials]);
}

export function getToken(): string | null {
  return cachedToken;
}

export function getTokenError(): string | null {
  return tokenError;
}

export function clearToken() {
  cachedToken = null;
  tokenError = null;
}

export function setToken(token: string) {
  cachedToken = token;
  tokenError = null;
  notifyListeners();
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
