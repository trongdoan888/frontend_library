"use client";

import { useEffect, useState, type FormEvent } from "react";
import ProtectedPage from "@/app/components/ProtectedPage";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { ChevronLeftIcon, ChevronRightIcon, InboxIcon, PencilIcon, PlusIcon, SearchIcon, TrashIcon } from "@/app/components/icons";
import { getAccessToken } from "@/app/lib/auth";
import { useAccount } from "@/app/lib/account";
import { API_BASE_URL } from "@/app/lib/api";

type Category = {
  id: string;
  name: string;
};

type CategoryListResponse = {
  data: Category[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

export default function GenresPage() {
  const account = useAccount();
  const isFullAccess = account?.role === "admin" || account?.role === "libby";

  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
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

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
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

    async function fetchCategories() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          page_size: String(PAGE_SIZE),
        });
        if (debouncedNameSearch) params.set("name", debouncedNameSearch);

        const accessToken = getAccessToken();
        const response = await fetch(`${API_BASE_URL}/api/category/?${params.toString()}`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        });

        if (!response.ok) {
          throw new Error("Không thể tải danh sách thể loại.");
        }

        const result = (await response.json()) as CategoryListResponse;

        if (!ignore) {
          setCategories(Array.isArray(result.data) ? result.data : []);
          setTotal(result.total ?? 0);
          setTotalPages(Math.max(1, result.total_pages ?? 1));
        }
      } catch {
        if (!ignore) {
          setError("Lỗi kết nối đến máy chủ. Vui lòng thử lại sau.");
          setCategories([]);
          setTotal(0);
          setTotalPages(1);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchCategories();

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
      setFormError("Vui lòng nhập tên thể loại.");
      return;
    }
    if (categories.some((category) => category.name.trim().toLowerCase() === trimmedName.toLowerCase())) {
      setFormError("Tên thể loại đã tồn tại.");
      return;
    }

    setSubmitting(true);

    try {
      const accessToken = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/api/category/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ name: trimmedName }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setFormError(result?.message || "Không thể thêm thể loại. Vui lòng kiểm tra lại thông tin.");
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

  function openEditForm(category: Category) {
    setEditingCategory(category);
    setEditName(category.name);
    setEditError("");
  }

  function closeEditForm() {
    setEditingCategory(null);
    setEditError("");
  }

  async function handleEditSubmit(event: FormEvent) {
    event.preventDefault();
    setEditError("");

    if (!editingCategory) return;

    const trimmedName = editName.trim();
    if (!trimmedName) {
      setEditError("Vui lòng nhập tên thể loại.");
      return;
    }
    if (
      categories.some(
        (category) =>
          category.id !== editingCategory.id && category.name.trim().toLowerCase() === trimmedName.toLowerCase()
      )
    ) {
      setEditError("Tên thể loại đã tồn tại.");
      return;
    }

    setEditSubmitting(true);

    try {
      const accessToken = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/api/category/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ id: editingCategory.id, name: trimmedName }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setEditError(
          result?.error || result?.message || "Không thể cập nhật thể loại. Vui lòng kiểm tra lại thông tin."
        );
        return;
      }

      setEditingCategory(null);
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
      const response = await fetch(`${API_BASE_URL}/api/category/`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ id: deleteTarget.id }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || result?.message || "Không thể xóa thể loại.");
      }

      setDeleteTarget(null);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa thể loại.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ProtectedPage
      active="/genres"
      title="Quản lý thể loại"
      description="Các thể loại sách đang được lưu trữ trong thư viện."
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
              Thêm loại sách
            </button>
          ) : null}
        </div>

        <div className="relative mt-4 w-full max-w-md">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={nameSearch}
            onChange={(event) => setNameSearch(event.target.value)}
            placeholder="Tìm theo tên thể loại..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Đang tải...</p>
        ) : categories.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-2 py-10 text-sm text-slate-500">
            <InboxIcon className="h-8 w-8 text-slate-300" />
            Không tìm thấy thể loại nào.
          </div>
        ) : (
          <div className="mt-4 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <h3 className="text-xl font-semibold text-slate-900">{category.name}</h3>
                {isFullAccess ? (
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => openEditForm(category)}
                      className="flex items-center gap-1 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100"
                    >
                      <PencilIcon className="h-3.5 w-3.5" />
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(category)}
                      className="flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                      Xóa
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-500">
          <p>
            Trang {page}/{totalPages} · Tổng {total} thể loại
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
            <h2 className="text-xl font-semibold text-slate-900">Thêm loại sách</h2>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Tên thể loại *</label>
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
                  {submitting ? "Đang lưu..." : "Lưu thể loại"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editingCategory ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-slate-900">Chỉnh sửa thể loại</h2>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Tên thể loại *</label>
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
        title="Xóa thể loại"
        message={`Bạn có chắc chắn muốn xóa thể loại "${deleteTarget?.name}"? Hành động này không thể hoàn tác.`}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </ProtectedPage>
  );
}
