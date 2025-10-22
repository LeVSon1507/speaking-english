"use client";
import { useState } from "react";

export default function LoginPrompt({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleLogin() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Login failed");
        return;
      }
      onSuccess();
      onClose();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30">
      <div className="w-[360px] rounded-2xl bg-white border border-black/10 shadow-[6px_6px_0px_#00000018] p-4">
        <div className="text-lg font-semibold">Sign in to save data</div>
        <div className="text-sm text-neutral-600">Enter your email to create/access your account.</div>

        <div className="mt-3">
          <input
            type="email"
            className="w-full h-10 px-3 rounded-xl border border-black/15 bg-white outline-none text-sm"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {error ? (
          <div className="mt-2 text-xs text-red-600">{error}</div>
        ) : null}

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={handleLogin}
            disabled={loading || !email}
            className="px-4 h-9 rounded-full bg-[#f6d184] border border-black/10 shadow-[4px_4px_0px_#00000015] text-sm disabled:opacity-60"
          >
            {loading ? "Processing..." : "Sign in"}
          </button>
          <button
            onClick={onClose}
            className="px-3 h-9 rounded-full bg-white border border-black/10 shadow-[4px_4px_0px_#00000015] text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
