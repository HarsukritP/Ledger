import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { api } from "../lib/api";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export type PushState = "unsupported" | "denied" | "granted" | "prompt" | "loading";

export function usePushNotifications() {
  const [state, setState] = useState<PushState>("loading");
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web") { setState("unsupported"); return; }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    setState((Notification.permission as PushState) === "granted" ? "granted"
      : Notification.permission === "denied" ? "denied" : "prompt");
  }, []);

  const enable = async (): Promise<boolean> => {
    if (Platform.OS !== "web") return false;
    setSubscribing(true);
    try {
      // 1. Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setState("denied"); return false; }

      // 2. Get VAPID public key from backend (or use env var directly)
      const vapidKey =
        process.env.EXPO_PUBLIC_VAPID_KEY ||
        (await api.push.vapidKey().then((r) => r.publicKey).catch(() => null));
      if (!vapidKey) throw new Error("VAPID key unavailable");

      // 3. Register service worker
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      // 4. Subscribe to push
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      // 5. Send subscription to backend
      const json = sub.toJSON();
      await api.push.subscribe({
        endpoint: sub.endpoint,
        p256dh: (json.keys as any).p256dh,
        auth: (json.keys as any).auth,
      });

      setState("granted");
      return true;
    } catch (err) {
      console.error("[PUSH] enable failed:", err);
      return false;
    } finally {
      setSubscribing(false);
    }
  };

  const disable = async () => {
    if (Platform.OS !== "web") return;
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;
      const json = sub.toJSON();
      await api.push.unsubscribe({
        endpoint: sub.endpoint,
        p256dh: (json.keys as any).p256dh,
        auth: (json.keys as any).auth,
      });
      await sub.unsubscribe();
      setState("prompt");
    } catch (err) {
      console.error("[PUSH] disable failed:", err);
    }
  };

  const sendTest = () => api.push.test();

  return { state, subscribing, enable, disable, sendTest };
}
