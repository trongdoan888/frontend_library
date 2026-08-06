"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@/app/lib/auth";
import Sidebar from "@/app/components/Sidebar";
import { users, books, authors, genres, loans } from "@/app/lib/mockData";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200/10 bg-slate-900/95 p-6 shadow-xl shadow-slate-950/10">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-8 px-6 py-8">
        <Sidebar active="/" />
        <main className="flex-1 space-y-8">
          <div className="rounded-3xl border border-slate-200/10 bg-slate-900/95 p-8 shadow-xl shadow-slate-950/10">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Xin chào</p>
            <h1 className="mt-4 text-3xl font-semibold text-white">Trang quản lý thư viện</h1>
            <p className="mt-2 text-slate-400">Chọn mục bên trái để quản lý người dùng, sách, tác giả, thể loại và mượn/trả.</p>
          </div>

          <Section title="Người dùng">
            <div className="grid gap-4 sm:grid-cols-3">
              {users.map((user) => (
                <div key={user.id} className="rounded-3xl border border-slate-700/70 bg-slate-950/80 p-4">
                  <p className="text-sm text-slate-400">{user.role}</p>
                  <h3 className="mt-2 text-lg font-semibold text-white">{user.fullName}</h3>
                  <p className="mt-1 text-sm text-slate-300">{user.username}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Sách nổi bật">
            <div className="grid gap-4 sm:grid-cols-3">
              {books.map((book) => (
                <div key={book.id} className="rounded-3xl border border-slate-700/70 bg-slate-950/80 p-4">
                  <h3 className="text-lg font-semibold text-white">{book.title}</h3>
                  <p className="mt-2 text-sm text-slate-300">Tác giả: {book.author}</p>
                  <p className="mt-1 text-sm text-slate-400">Thể loại: {book.genre}</p>
                </div>
              ))}
            </div>
          </Section>
        </main>
      </div>
    </div>
  );
}
