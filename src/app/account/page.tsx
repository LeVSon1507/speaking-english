"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import LoginPrompt from "@/components/LoginPrompt";

type AccountInfo = { email?: string; userId?: string };

export default function AccountPage() {
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  async function fetchAccount(signal?: AbortSignal) {
    try {
      const res = await fetch("/api/auth/me", { signal });
      if (res.status === 401) {
        setShowLogin(true);
        return;
      }
      const data = await res.json();
      setAccount({ email: data?.email, userId: data?.userId });
    } catch {}
  }

  useEffect(() => {
    const controller = new AbortController();
    void fetchAccount(controller.signal);
    return () => controller.abort();
  }, []);

  async function doLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setAccount(null);
      setShowLogin(true);
    } catch {}
  }

  function onLoginSuccess() {
    setShowLogin(false);
    const controller = new AbortController();
    void fetchAccount(controller.signal);
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-semibold">Tài khoản</h1>

      <div className="mt-4 rounded-2xl bg-white p-4 border border-black/10 shadow-md flex items-center gap-4">
        <Image
          src="/undraw/undraw_professor-avatar_y9ai.svg"
          alt="Avatar"
          width={72}
          height={72}
          className="object-contain p-1"
        />
        <div className="flex-1">
          {account ? (
            <div className="space-y-2">
              <div className="text-sm">Email: <span className="font-semibold">{account.email}</span></div>
              <div className="text-sm">User ID: <span className="font-mono">{account.userId}</span></div>
              <button onClick={doLogout} className="mt-2 px-3 h-9 rounded-full border bg-white">Đăng xuất</button>
            </div>
          ) : (
            <div className="text-sm text-neutral-600">Bạn chưa đăng nhập.</div>
          )}
        </div>
      </div>

      <LoginPrompt open={showLogin} onClose={() => setShowLogin(false)} onSuccess={onLoginSuccess} />
    </div>
  );
}
