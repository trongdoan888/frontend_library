"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAccount } from "@/app/lib/account";

type TokenResponse = {
  refresh: string;
  access: string;
};

const ACCESS_TOKEN_KEY = "library_access_token";
const REFRESH_TOKEN_KEY = "library_refresh_token";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (accessToken) {
      router.replace("/");
    }
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:8000/api/token/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = (await response.json()) as TokenResponse | { detail?: string };

      if (!response.ok) {
        setError((data as { detail?: string }).detail || "Đăng nhập thất bại. Vui lòng kiểm tra lại.");
        setLoading(false);
        return;
      }

      localStorage.setItem(ACCESS_TOKEN_KEY, (data as TokenResponse).access);
      localStorage.setItem(REFRESH_TOKEN_KEY, (data as TokenResponse).refresh);
      await fetchAccount();
      router.replace("/");
    } catch (err) {
      setError("Lỗi kết nối đến máy chủ. Vui lòng thử lại sau.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-slate-50 to-white px-4 py-8 text-slate-900">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-500">Quản lý thư viện</p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-900">Đăng nhập</h1>
          <p className="mt-2 text-sm text-slate-500">Sử dụng tài khoản để quản lý hệ thống thư viện.</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="username">
              Tên đăng nhập
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Nhập tên đăng nhập"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="password">
              Mật khẩu
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Nhập mật khẩu"
            />
          </div>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          <p>API đăng nhập sẽ gọi tới:</p>
          <p className="mt-2 break-words">http://localhost:8000/api/token/</p>
        </div>
      </div>
    </div>
  );
}
