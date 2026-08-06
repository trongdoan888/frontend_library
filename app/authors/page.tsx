"use client";

import ProtectedPage from "@/app/components/ProtectedPage";
import { authors } from "@/app/lib/mockData";

export default function AuthorsPage() {
  return (
    <ProtectedPage
      active="/authors"
      title="Quản lý tác giả"
      description="Thông tin các tác giả có trong hệ thống." 
    >
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {authors.map((author) => (
          <div key={author.id} className="rounded-3xl border border-slate-700/70 bg-slate-900/90 p-6">
            <h3 className="text-xl font-semibold text-white">{author.name}</h3>
            <p className="mt-3 text-sm text-slate-300">Quốc gia: {author.country}</p>
          </div>
        ))}
      </div>
    </ProtectedPage>
  );
}
