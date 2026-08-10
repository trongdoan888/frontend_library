"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import ProtectedPage from "@/app/components/ProtectedPage";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { getAccessToken } from "@/app/lib/auth";
import { useAccount } from "@/app/lib/account";

type NamedItem = {
  id: string;
  name: string;
};

type Book = {
  id: string;
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
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      {selected.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {selected.map((item) => (
            <span
              key={item.id}
              className="flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
            >
              {item.name}
              <button type="button" onClick={() => removeOption(item.id)} className="text-indigo-400 hover:text-indigo-700">
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
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
        />
        {suggestions.length > 0 ? (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
            {suggestions.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => addOption(option)}
                  className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
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

  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [editForm, setEditForm] = useState<BookFormState>(EMPTY_FORM);
  const [editError, setEditError] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    if (!showAddForm && !editingBook) return;
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
  }, [showAddForm, editingBook]);

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

  function openEditForm(book: Book) {
    setEditingBook(book);
    setEditForm({
      name: book.name,
      content: book.content ?? "",
      total: book.total !== undefined ? String(book.total) : "",
      authors: book.authors ?? [],
      categories: book.categories ?? [],
    });
    setEditError("");
  }

  function closeEditForm() {
    setEditingBook(null);
    setEditError("");
  }

  async function handleEditSubmit(event: FormEvent) {
    event.preventDefault();
    setEditError("");

    if (!editingBook) return;

    const name = editForm.name.trim();
    if (!name) {
      setEditError("Vui lòng nhập tên sách.");
      return;
    }
    if (books.some((book) => book.id !== editingBook.id && book.name.trim().toLowerCase() === name.toLowerCase())) {
      setEditError("Tên sách đã tồn tại.");
      return;
    }
    if (editForm.authors.length === 0) {
      setEditError("Vui lòng chọn ít nhất một tác giả.");
      return;
    }
    if (editForm.categories.length === 0) {
      setEditError("Vui lòng chọn ít nhất một thể loại.");
      return;
    }
    if (editForm.total.trim() === "" || Number.isNaN(Number(editForm.total)) || Number(editForm.total) < 0) {
      setEditError("Vui lòng nhập tổng số sách hợp lệ.");
      return;
    }

    setEditSubmitting(true);

    try {
      const accessToken = getAccessToken();
      const response = await fetch("http://localhost:8000/api/book/", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          id: editingBook.id,
          name,
          authors: editForm.authors.map((author) => author.id),
          categories: editForm.categories.map((category) => category.id),
          content: editForm.content.trim(),
          total: Number(editForm.total),
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setEditError(result?.error || result?.message || "Không thể cập nhật sách. Vui lòng kiểm tra lại thông tin.");
        return;
      }

      setEditingBook(null);
      setReloadKey((key) => key + 1);
    } catch {
      setEditError("Lỗi kết nối đến máy chủ. Vui lòng thử lại sau.");
    } finally {
      setEditSubmitting(false);
    }
  }

  function cancelDelete() {
    if (deleting) return;
    setDeleteTarget(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    setError("");

    try {
      const accessToken = getAccessToken();
      const response = await fetch("http://localhost:8000/api/book/", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ id: deleteTarget.id }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || result?.message || "Không thể xóa sách.");
      }

      setDeleteTarget(null);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa sách.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ProtectedPage
      active="/books"
      title="Quản lý sách"
      description="Danh sách sách hiện có trong thư viện."
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {error ? <p className="text-sm text-rose-600">{error}</p> : <span />}
          {isFullAccess ? (
            <button
              type="button"
              onClick={openAddForm}
              className="rounded-2xl bg-indigo-600 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-500"
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
          className="mt-4 w-full max-w-md rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
        />

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Đang tải...</p>
        ) : books.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Không tìm thấy sách nào.</p>
        ) : (
          <div className="mt-4 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {books.map((book) => (
              <div
                key={book.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-xl font-semibold text-slate-900">{book.name}</h3>
                  {isFullAccess ? (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => openEditForm(book)}
                        className="rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(book)}
                        className="rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
                      >
                        Xóa
                      </button>
                    </div>
                  ) : null}
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  Tác giả: {(book.authors ?? []).map((author) => author.name).join(", ") || "—"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Thể loại: {(book.categories ?? []).map((category) => category.name).join(", ") || "—"}
                </p>
                {book.content ? <p className="mt-3 line-clamp-3 text-sm text-slate-500">{book.content}</p> : null}
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
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

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-500">
          <p>
            Trang {page}/{totalPages} · Tổng {total} sách
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1 || loading}
              className="rounded-2xl bg-slate-100 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Trước
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages || loading}
              className="rounded-2xl bg-slate-100 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {showAddForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-slate-900">Thêm sách</h2>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Tên sách *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
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
                <label className="mb-2 block text-sm font-medium text-slate-700">Nội dung</label>
                <textarea
                  value={form.content}
                  onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Tổng số *</label>
                <input
                  type="number"
                  min={0}
                  value={form.total}
                  onChange={(event) => setForm((prev) => ({ ...prev, total: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              {formError ? <p className="text-sm text-rose-600">{formError}</p> : null}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeAddForm}
                  disabled={submitting}
                  className="rounded-2xl bg-slate-100 px-5 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-2xl bg-indigo-600 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Đang lưu..." : "Lưu sách"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editingBook ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-slate-900">Chỉnh sửa sách</h2>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Tên sách *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <TagAutocomplete
                label="Tác giả *"
                placeholder="Nhập tên tác giả để tìm..."
                options={authorOptions}
                selected={editForm.authors}
                onChange={(authors) => setEditForm((prev) => ({ ...prev, authors }))}
              />

              <TagAutocomplete
                label="Thể loại *"
                placeholder="Nhập tên thể loại để tìm..."
                options={categoryOptions}
                selected={editForm.categories}
                onChange={(categories) => setEditForm((prev) => ({ ...prev, categories }))}
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Nội dung</label>
                <textarea
                  value={editForm.content}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, content: event.target.value }))}
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Tổng số *</label>
                <input
                  type="number"
                  min={0}
                  value={editForm.total}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, total: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              {editError ? <p className="text-sm text-rose-600">{editError}</p> : null}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeEditForm}
                  disabled={editSubmitting}
                  className="rounded-2xl bg-slate-100 px-5 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="rounded-2xl bg-indigo-600 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {editSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Xóa sách"
        message={`Bạn có chắc chắn muốn xóa sách "${deleteTarget?.name}"? Hành động này không thể hoàn tác.`}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </ProtectedPage>
  );
}
