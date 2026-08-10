"use client";

import { useRouter } from "next/navigation";
import { useAccount, type Role } from "@/app/lib/account";

const ADMIN_MENU_ITEMS = [
  { label: "Quản lý người dùng", href: "/" },
  { label: "Quản lý sách", href: "/books" },
  { label: "Quản lý tác giả", href: "/authors" },
  { label: "Quản lý thể loại", href: "/genres" },
  { label: "Phiếu mượn", href: "/loans" },
  { label: "Lịch sử mượn", href: "/loans/history" },
  { label: "Phiếu mượn quá hạn", href: "/loans/overdue" },
];

const USER_MENU_ITEMS = [
  { label: "Danh mục sách", href: "/books" },
  { label: "Danh sách mượn", href: "/loans" },
  { label: "Lịch sử mượn", href: "/loans/history" },
  { label: "Phiếu mượn quá hạn", href: "/loans/overdue" },
  { label: "Danh sách tác giả", href: "/authors" },
];

function getMenuItems(role?: Role) {
  if (role === "user") return USER_MENU_ITEMS;
  if (role === "admin") return [{ label: "Dashboard", href: "/dashboard" }, ...ADMIN_MENU_ITEMS];
  return ADMIN_MENU_ITEMS;
}

export default function Sidebar({ active }: { active: string }) {
  const router = useRouter();
  const account = useAccount();
  const menuItems = getMenuItems(account?.role);

  return (
    <aside className="flex h-full w-72 flex-col rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm">
      <div className="mb-10 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-500 px-4 py-4 text-white shadow-sm">
        <p className="text-xs uppercase tracking-[0.3em] text-indigo-100">Thư viện</p>
        <h2 className="text-lg font-semibold">Quản lý thư viện</h2>
      </div>

      <nav className="space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.href}
            type="button"
            onClick={() => router.push(item.href)}
            className={`flex w-full items-center justify-between rounded-3xl px-4 py-3 text-left text-sm font-medium transition ${
              active === item.href
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
