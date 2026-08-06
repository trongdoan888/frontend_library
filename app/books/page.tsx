"use client";

import ProtectedPage from "@/app/components/ProtectedPage";
import { books } from "@/app/lib/mockData";

export default function BooksPage() {
  return (
    <ProtectedPage
      active="/books"
      title="Quản lý sách"
      description="Danh sách sách hiện có trong thư viện."
    >
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {books.map((book) => (
          <div key={book.id} className="rounded-3xl border border-slate-700/70 bg-slate-900/90 p-6">
            <h3 className="text-xl font-semibold text-white">{book.title}</h3>
            <p className="mt-3 text-sm text-slate-300">Tác giả: {book.author}</p>
            <p className="mt-1 text-sm text-slate-400">Thể loại: {book.genre}</p>
          </div>
        ))}
      </div>
    </ProtectedPage>
  );
}
