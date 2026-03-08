import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { api } from "../lib/api";

export function EmailCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setStatus("error");
      setMessage("No authorization code received from Google.");
      return;
    }

    api.email
      .callback(code)
      .then((data: any) => {
        setStatus("success");
        setMessage(`Linked ${data.email || "your Gmail account"} successfully!`);
        setTimeout(() => navigate("/expenses"), 2000);
      })
      .catch((err: any) => {
        setStatus("error");
        setMessage(err.message || "Failed to link email account.");
      });
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 text-center">
        {status === "loading" && (
          <>
            <Loader2 size={32} className="mx-auto animate-spin text-gold" />
            <p className="mt-4 text-sm text-text-secondary">Linking your email account...</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 size={32} className="mx-auto text-income" />
            <p className="mt-4 text-sm font-medium text-income">{message}</p>
            <p className="mt-2 text-xs text-text-muted">Redirecting to Expenses...</p>
          </>
        )}
        {status === "error" && (
          <>
            <AlertTriangle size={32} className="mx-auto text-danger" />
            <p className="mt-4 text-sm text-danger">{message}</p>
            <button
              onClick={() => navigate("/expenses")}
              className="mt-4 rounded-full bg-gold px-6 py-2 text-xs font-medium text-black"
            >
              Back to Expenses
            </button>
          </>
        )}
      </div>
    </div>
  );
}
