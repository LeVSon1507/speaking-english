"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

function toHex(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(text: string) {
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(digest);
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isValid = () => {
    if (!username || username.trim().length < 3) {
      setError("Tên đăng nhập phải có ít nhất 3 ký tự");
      return false;
    }
    if (!password || password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự");
      return false;
    }
    return true;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isValid()) return;
    setLoading(true);
    try {
      const passwordHash = await sha256Hex(password);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), passwordHash }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Đăng nhập thất bại");
        return;
      }
      router.push("/account");
    } catch {
      setError("Lỗi mạng, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh max-w-[420px] mx-auto px-6 py-10">
      <div className="rounded-2xl bg-white p-5 border border-black/10 shadow-md">
        <h1 className="text-xl font-semibold">Đăng nhập</h1>
        <p className="text-xs text-neutral-600 mt-1">
          Sử dụng tên đăng nhập và mật khẩu để tiếp tục.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="text-xs text-neutral-700">Tên đăng nhập</label>
            <input
              type="text"
              className="w-full h-10 px-3 rounded-xl border border-black/15 bg-white outline-none text-sm"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="text-xs text-neutral-700">Mật khẩu</label>
            <div className="flex items-center gap-2">
              <input
                type={showPassword ? "text" : "password"}
                className="flex-1 h-10 px-3 rounded-xl border border-black/15 bg-white outline-none text-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="px-3 h-10 rounded-xl border border-black/15 bg-white text-xs shadow-[3px_3px_0px_#00000012]"
                title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? "Ẩn" : "Hiện"}
              </button>
            </div>
          </div>

          {error ? <div className="text-xs text-red-600">{error}</div> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-full bg-[#f6d184] border border-black/10 shadow-[4px_4px_0px_#00000015] text-sm disabled:opacity-60"
          >
            {loading ? "Đang xử lý..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </div>
  );
}
