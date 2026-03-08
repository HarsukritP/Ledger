import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { api } from "../lib/api";

export function CallbackPage() {
  const { isAuthenticated, isLoading } = useAuth0();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (isLoading || !isAuthenticated || checking) return;

    setChecking(true);
    api.auth
      .me()
      .then((user) => {
        if (user.onboarding_completed) {
          navigate("/", { replace: true });
        } else {
          navigate("/onboarding", { replace: true });
        }
      })
      .catch((err) => {
        console.error("[CALLBACK] Failed to check onboarding status:", err);
        navigate("/onboarding", { replace: true });
      });
  }, [isLoading, isAuthenticated, navigate, checking]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-base">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        <p className="mt-4 text-sm text-text-secondary">Signing you in...</p>
      </div>
    </div>
  );
}
