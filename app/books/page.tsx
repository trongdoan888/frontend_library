"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import ProtectedPage from "@/app/components/ProtectedPage";
import { getAccessToken } from "@/app/lib/auth";
import { useAccount } from "@/app/lib/account";

type NamedItem = {
  id: string;
  name: string;
};

type Book = {
  name: string;
  categories: NamedItem[];
  authors: NamedItem[];
  content: string;
  remaining: number;
  total?: number;
  total_borrowed?: number;
  total_error?: number;
};

type BookListResponse = {
  data: Book[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

type NamedItemListResponse = {
  data: NamedItem[];
};

const PAGE_SIZE = 10;
const OPTION_PAGE_SIZE = 200;
const SEARCH_DEBOUNCE_MS = 300;

type BookFormState = {
  name: string;
  content: string;
  total: string;
  authors: NamedItem[];
  categories: NamedItem[];
};

const EMPTY_FORM: BookFormState = {
  name: "",
  content: "",
  total: "",
  authors: [],
  categories: [],
};

type TagAutocompleteProps = {
  label: string;
  placeholder: string;
  options: NamedItem[];
  selected: NamedItem[];
  onChange: (next: NamedItem[]) => void;
};

function TagAutocomplete({ label, placeholder, options, selected, onChange }: TagAutocompleteProps) {
  const [query, setQuery] = useState("");

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return options
      .filter((option) => option.name.toLowerCase().includes(q))
      .filter((option) => !selected.some((item) => item.id === option.id))
      .slice(0, 8);
  }, [query, options, selected]);

  function addOption(option: NamedItem) {
    onChange([...selected, option]);
    setQuery("");
  }

  function removeOption(id: string) {
    onChange(selected.filter((item) => item.id !== id));
  }

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-300">{label}</label>
      {selected.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {selected.map((item) => (
            <span
              key={item.id}
              className="flex items-center gap-2 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-200"
            >
              {item.name}
              <button type="button" onClick={() => removeOption(item.id)} className="text-blue-300 hover:text-white">
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
        />
        {suggestions.length > 0 ? (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-xl">
            {suggestions.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => addOption(option)}
                  className="block w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
                >
                  {option.name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

export default function BooksPage() {
  const account = useAccount();
  const isFullAccess = account?.role === "admin" || account?.role === "libby";

  const [page, setPage] = useState(1);
  const [books, setBooks] = useState<Book[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [authorOptions, setAuthorOptions] = useState<NamedItem[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<NamedItem[]>([]);
  const [form, setForm] = useState<BookFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let ignore = false;

    async function fetchBooks() {
      setLoading(true);
      setError("");

      try {
        const query = debouncedSearch.toLowerCase();

        // Matching by author/category name requires the full list client-side since it's a "match any field" search.
        const params = new URLSearchParams(
          query
            ? { page: "1", page_size: String(OPTION_PAGE_SIZE) }
            : { page: String(page), page_size: String(PAGE_SIZE) }
        );

        const accessToken = getAccessToken();
        const response = await fetch(`http://localhost:8000/api/book/?${params.toString()}`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        });

        if (!response.ok) {
          throw new Error("Không thể tải danh sách sách.");
        }

        const result = (await response.json()) as BookListResponse;

        if (!ignore) {
          const allBooks = Array.isArray(result.data) ? result.data : [];

          if (!query) {
            setBooks(allBooks);
            setTotal(result.total ?? 0);
            setTotalPages(Math.max(1, result.total_pages ?? 1));
          } else {
            const filtered = allBooks.filter(
              (book) =>
                book.name.toLowerCase().includes(query) ||
                (book.authors ?? []).some((author) => author.name.toLowerCase().includes(query)) ||
                (book.categories ?? []).some((category) => category.name.toLowerCase().includes(query))
            );
            const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
            const safePage = Math.min(page, pageCount);
            setBooks(filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE));
            setTotal(filtered.length);
            setTotalPages(pageCount);
            if (safePage !== page) setPage(safePage);
          }
        }
      } catch {
        if (!ignore) {
          setError("Lỗi kết nối đến máy chủ. Vui lòng thử lại sau.");
          setBooks([]);
          setTotal(0);
          setTotalPages(1);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchBooks();

    return () => {
      ignore = true;
    };
  }, [page, reloadKey, debouncedSearch]);

  useEffect(() => {
    if (!showAddForm) return;
    let ignore = false;

    async function fetchOptions() {
      const accessToken = getAccessToken();
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;

      try {
        const [authorRes, categoryRes] = await Promise.all([
          fetch(`http://localhost:8000/api/author/?page=1&page_size=${OPTION_PAGE_SIZE}`, { headers }),
          fetch(`http://localhost:8000/api/category/?page=1&page_size=${OPTION_PAGE_SIZE}`, { headers }),
        ]);

        if (!ignore && authorRes.ok) {
          const authorData = (await authorRes.json()) as NamedItemListResponse;
          setAuthorOptions(Array.isArray(authorData.data) ? authorData.data : []);
        }
        if (!ignore && categoryRes.ok) {
          const categoryData = (await categoryRes.json()) as NamedItemListResponse;
          setCategoryOptions(Array.isArray(categoryData.data) ? categoryData.data : []);
        }
      } catch {
        // suggestions stay empty if this fails
      }
    }

    fetchOptions();

    return () => {
      ignore = true;
    };
  }, [showAddForm]);

  function openAddForm() {
    setForm(EMPTY_FORM);
    setFormError("");
    setShowAddForm(true);
  }

  function closeAddForm() {
    setShowAddForm(false);
    setFormError("");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError("");

    const name = form.name.trim();
    if (!name) {
      setFormError("Vui lòng nhập tên sách.");
      return;
    }
    if (books.some((book) => book.name.trim().toLowerCase() === name.toLowerCase())) {
      setFormError("Tên sách đã tồn tại.");
      return;
    }
    if (form.authors.length === 0) {
      setFormError("Vui lòng chọn ít nhất một tác giả.");
      return;
    }
    if (form.categories.length === 0) {
      setFormError("Vui lòng chọn ít nhất một thể loại.");
      return;
    }
    if (form.total.trim() === "" || Number.isNaN(Number(form.total)) || Number(form.total) < 0) {
      setFormError("Vui lòng nhập tổng số sách hợp lệ.");
      return;
    }

    setSubmitting(true);

    try {
      const accessToken = getAccessToken();
      const response = await fetch("http://localhost:8000/api/book/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          name,
          authors: form.authors.map((author) => author.id),
          categories: form.categories.map((category) => category.id),
          content: form.content.trim(),
          total: Number(form.total),
          total_borrowed: 0,
          total_error: 0,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setFormError(result?.message || "Không thể thêm sách. Vui lòng kiểm tra lại thông tin.");
        return;
      }

      setShowAddForm(false);
      setForm(EMPTY_FORM);
      setPage(1);
      setReloadKey((key) => key + 1);
    } catch {
      setFormError("Lỗi kết nối đến máy chủ. Vui lòng thử lại sau.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ProtectedPage
      active="/books"
      title="Quản lý sách"
      description="Danh sách sách hiện có trong thư viện."
    >
      <div className="rounded-3xl border border-slate-200/10 bg-slate-900/95 p-6 shadow-xl shadow-slate-950/10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {error ? <p className="text-sm text-rose-400">{error}</p> : <span />}
          {isFullAccess ? (
            <button
              type="button"
              onClick={openAddForm}
              className="rounded-2xl bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-500"
            >
              + Thêm sách
            </button>
          ) : null}
        </div>

        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm theo tên sách, tác giả hoặc thể loại..."
          className="mt-4 w-full max-w-md rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
        />

        {loading ? (
          <p className="mt-4 text-sm text-slate-400">Đang tải...</p>
        ) : books.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">Không tìm thấy sách nào.</p>
        ) : (
          <div className="mt-4 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {books.map((book, index) => (
              <div key={`${book.name}-${index}`} className="rounded-3xl border border-slate-700/70 bg-slate-900/90 p-6">
                <h3 className="text-xl font-semibold text-white">{book.name}</h3>
                <p className="mt-3 text-sm text-slate-300">
                  Tác giả: {(book.authors ?? []).map((author) => author.name).join(", ") || "—"}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Thể loại: {(book.categories ?? []).map((category) => category.name).join(", ") || "—"}
                </p>
                {book.content ? <p className="mt-3 line-clamp-3 text-sm text-slate-400">{book.content}</p> : null}
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-300">
                  <span>Còn lại: {book.remaining}</span>
                  {isFullAccess ? (
                    <>
                      <span>Tổng: {book.total}</span>
                      <span>Đang mượn: {book.total_borrowed}</span>
                      <span>Lỗi/hỏng: {book.total_error}</span>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-400">
          <p>
            Trang {page}/{totalPages} · Tổng {total} sách
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1 || loading}
              className="rounded-2xl bg-slate-800 px-4 py-2 font-semibold text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Trước
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages || loading}
              className="rounded-2xl bg-slate-800 px-4 py-2 font-semibold text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {showAddForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-white">Thêm sách</h2>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Tên sách *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <TagAutocomplete
                label="Tác giả *"
                placeholder="Nhập tên tác giả để tìm..."
                options={authorOptions}
                selected={form.authors}
                onChange={(authors) => setForm((prev) => ({ ...prev, authors }))}
              />

              <TagAutocomplete
                label="Thể loại *"
                placeholder="Nhập tên thể loại để tìm..."
                options={categoryOptions}
                selected={form.categories}
                onChange={(categories) => setForm((prev) => ({ ...prev, categories }))}
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Nội dung</label>
                <textarea
                  value={form.content}
                  onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
                  rows={3}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Tổng số *</label>
                <input
                  type="number"
                  min={0}
                  value={form.total}
                  onChange={(event) => setForm((prev) => ({ ...prev, total: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              {formError ? <p className="text-sm text-rose-400">{formError}</p> : null}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeAddForm}
                  disabled={submitting}
                  className="rounded-2xl bg-slate-800 px-5 py-2.5 font-semibold text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-2xl bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Đang lưu..." : "Lưu sách"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </ProtectedPage>
  );
}
