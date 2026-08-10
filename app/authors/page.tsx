"use client";

import { useEffect, useState, type FormEvent } from "react";
import ProtectedPage from "@/app/components/ProtectedPage";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { ChevronLeftIcon, ChevronRightIcon, InboxIcon, PencilIcon, PlusIcon, SearchIcon, TrashIcon } from "@/app/components/icons";
import { getAccessToken } from "@/app/lib/auth";
import { useAccount } from "@/app/lib/account";

type Author = {
  id: string;
  name: string;
};

type AuthorListResponse = {
  data: Author[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

export default function AuthorsPage() {
  const account = useAccount();
  const isFullAccess = account?.role === "admin" || account?.role === "libby";

  const [page, setPage] = useState(1);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [nameSearch, setNameSearch] = useState("");
  const [debouncedNameSearch, setDebouncedNameSearch] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editingAuthor, setEditingAuthor] = useState<Author | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Author | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedNameSearch(nameSearch.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [nameSearch]);

  useEffect(() => {
    let ignore = false;

    async function fetchAuthors() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          page_size: String(PAGE_SIZE),
        });
        if (debouncedNameSearch) params.set("name", debouncedNameSearch);

        const accessToken = getAccessToken();
        const response = await fetch(`http://localhost:8000/api/author/?${params.toString()}`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        });

        if (!response.ok) {
          throw new Error("Không thể tải danh sách tác giả.");
        }

        const result = (await response.json()) as AuthorListResponse;

        if (!ignore) {
          setAuthors(Array.isArray(result.data) ? result.data : []);
          setTotal(result.total ?? 0);
          setTotalPages(Math.max(1, result.total_pages ?? 1));
        }
      } catch {
        if (!ignore) {
          setError("Lỗi kết nối đến máy chủ. Vui lòng thử lại sau.");
          setAuthors([]);
          setTotal(0);
          setTotalPages(1);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchAuthors();

    return () => {
      ignore = true;
    };
  }, [page, reloadKey, debouncedNameSearch]);

  function openAddForm() {
    setName("");
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

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError("Vui lòng nhập tên tác giả.");
      return;
    }
    if (authors.some((author) => author.name.trim().toLowerCase() === trimmedName.toLowerCase())) {
      setFormError("Tên tác giả đã tồn tại.");
      return;
    }

    setSubmitting(true);

    try {
      const accessToken = getAccessToken();
      const response = await fetch("http://localhost:8000/api/author/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ name: trimmedName }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setFormError(result?.message || "Không thể thêm tác giả. Vui lòng kiểm tra lại thông tin.");
        return;
      }

      setShowAddForm(false);
      setName("");
      setPage(1);
      setReloadKey((key) => key + 1);
    } catch {
      setFormError("Lỗi kết nối đến máy chủ. Vui lòng thử lại sau.");
    } finally {
      setSubmitting(false);
    }
  }

  function openEditForm(author: Author) {
    setEditingAuthor(author);
    setEditName(author.name);
    setEditError("");
  }

  function closeEditForm() {
    setEditingAuthor(null);
    setEditError("");
  }

  async function handleEditSubmit(event: FormEvent) {
    event.preventDefault();
    setEditError("");

    if (!editingAuthor) return;

    const trimmedName = editName.trim();
    if (!trimmedName) {
      setEditError("Vui lòng nhập tên tác giả.");
      return;
    }
    if (
      authors.some(
        (author) => author.id !== editingAuthor.id && author.name.trim().toLowerCase() === trimmedName.toLowerCase()
      )
    ) {
      setEditError("Tên tác giả đã tồn tại.");
      return;
    }

    setEditSubmitting(true);

    try {
      const accessToken = getAccessToken();
      const response = await fetch("http://localhost:8000/api/author/", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ id: editingAuthor.id, name: trimmedName }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setEditError(result?.error || result?.message || "Không thể cập nhật tác giả. Vui lòng kiểm tra lại thông tin.");
        return;
      }

      setEditingAuthor(null);
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
      const response = await fetch("http://localhost:8000/api/author/", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ id: deleteTarget.id }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || result?.message || "Không thể xóa tác giả.");
      }

      setDeleteTarget(null);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa tác giả.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ProtectedPage
      active="/authors"
      title="Quản lý tác giả"
      description="Thông tin các tác giả có trong hệ thống."
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {error ? <p className="text-sm text-rose-600">{error}</p> : <span />}
          {isFullAccess ? (
            <button
              type="button"
              onClick={openAddForm}
              className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-500"
            >
              <PlusIcon className="h-4 w-4" />
              Thêm tác giả
            </button>
          ) : null}
        </div>

        <div className="relative mt-4 w-full max-w-md">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={nameSearch}
            onChange={(event) => setNameSearch(event.target.value)}
            placeholder="Tìm theo tên tác giả..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>

        {isFullAccess ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-4 py-3 font-medium">Tên tác giả</th>
                  <th className="px-4 py-3 font-medium">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-6 text-center text-slate-500">
                      Đang tải...
                    </td>
                  </tr>
                ) : authors.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-10 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <InboxIcon className="h-8 w-8 text-slate-300" />
                        Không tìm thấy tác giả nào.
                      </div>
                    </td>
                  </tr>
                ) : (
                  authors.map((author) => (
                    <tr key={author.id} className="border-b border-slate-100 text-slate-700 transition hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{author.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEditForm(author)}
                            className="flex items-center gap-1 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100"
                          >
                            <PencilIcon className="h-3.5 w-3.5" />
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(author)}
                            className="flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : loading ? (
          <p className="mt-4 text-sm text-slate-500">Đang tải...</p>
        ) : authors.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-2 py-10 text-sm text-slate-500">
            <InboxIcon className="h-8 w-8 text-slate-300" />
            Không tìm thấy tác giả nào.
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {authors.map((author) => (
              <li
                key={author.id}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-900 shadow-sm"
              >
                {author.name}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-500">
          <p>
            Trang {page}/{totalPages} · Tổng {total} tác giả
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1 || loading}
              className="flex items-center gap-1 rounded-2xl bg-slate-100 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Trước
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages || loading}
              className="flex items-center gap-1 rounded-2xl bg-slate-100 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sau
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {showAddForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-slate-900">Thêm tác giả</h2>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Tên tác giả *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
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
                  {submitting ? "Đang lưu..." : "Lưu tác giả"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editingAuthor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-slate-900">Chỉnh sửa tác giả</h2>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Tên tác giả *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
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
        title="Xóa tác giả"
        message={`Bạn có chắc chắn muốn xóa tác giả "${deleteTarget?.name}"? Hành động này không thể hoàn tác.`}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </ProtectedPage>
  );
}
