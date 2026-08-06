"use client";

import { useRouter } from "next/navigation";
import { useAccount, type Role } from "@/app/lib/account";

const ADMIN_MENU_ITEMS = [
  { label: "Quản lý người dùng", href: "/" },
  { label: "Quản lý sách", href: "/books" },
  { label: "Quản lý tác giả", href: "/authors" },
  { label: "Quản lý thể loại", href: "/genres" },
  { label: "Quản lý mượn/trả", href: "/loans" },
];

const USER_MENU_ITEMS = [
  { label: "Danh mục sách", href: "/books" },
  { label: "Danh sách mượn", href: "/loans" },
  { label: "Danh sách tác giả", href: "/authors" },
];

function getMenuItems(role?: Role) {
  return role === "user" ? USER_MENU_ITEMS : ADMIN_MENU_ITEMS;
}

export default function Sidebar({ active }: { active: string }) {
  const router = useRouter();
  const account = useAccount();
  const menuItems = getMenuItems(account?.role);

  return (
    <aside className="flex h-full w-72 flex-col rounded-3xl border border-slate-200/10 bg-slate-950/95 p-6 text-slate-100 shadow-2xl shadow-slate-950/20">
      <div className="mb-10 rounded-3xl bg-slate-900/90 px-4 py-4">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Dashboard</p>
        <h2 className="text-lg font-semibold">Thư viện</h2>
      </div>

      <nav className="space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.href}
            type="button"
            onClick={() => router.push(item.href)}
            className={`flex w-full items-center justify-between rounded-3xl px-4 py-3 text-left text-sm font-medium transition ${
              active === item.href
                ? "bg-slate-800 text-white"
                : "bg-slate-950/80 text-slate-300 hover:bg-slate-900"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
