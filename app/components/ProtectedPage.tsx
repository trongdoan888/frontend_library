"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@/app/lib/auth";
import Sidebar from "@/app/components/Sidebar";
import UserMenu from "@/app/components/UserMenu";

type ProtectedPageProps = {
  active: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export default function ProtectedPage({ active, title, description, children }: ProtectedPageProps) {
  const router = useRouter();

  useEffect(() => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-8 px-6 py-8">
        <Sidebar active={active} />
        <main className="min-w-0 flex-1 space-y-8">
          <div className="flex items-start justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-500">{title}</p>
              <h1 className="mt-4 text-3xl font-semibold text-slate-900">{title}</h1>
              <p className="mt-2 text-slate-500">{description}</p>
            </div>
            <UserMenu />
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
