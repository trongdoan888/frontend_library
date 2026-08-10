"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuthTokens } from "@/app/lib/auth";
import { clearStoredAccount, useAccount } from "@/app/lib/account";

export default function UserMenu() {
  const router = useRouter();
  const account = useAccount();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLogout() {
    clearAuthTokens();
    clearStoredAccount();
    router.replace("/login");
  }

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-indigo-100 bg-indigo-50 text-indigo-600 transition hover:bg-indigo-100"
        aria-label="Tài khoản"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
          />
        </svg>
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-3 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-semibold text-slate-900">{account?.name ?? account?.username ?? "Người dùng"}</p>
            <p className="truncate text-xs text-slate-500">{account?.email}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push("/profile");
            }}
            className="block w-full px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50"
          >
            Thông tin cá nhân
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="block w-full px-4 py-3 text-left text-sm text-rose-600 transition hover:bg-rose-50"
          >
            Đăng xuất
          </button>
        </div>
      ) : null}
    </div>
  );
}
