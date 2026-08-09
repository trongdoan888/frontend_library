"use client";

import { useEffect, useState, type FormEvent } from "react";
import ProtectedPage from "@/app/components/ProtectedPage";
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

  return (
    <ProtectedPage
      active="/authors"
      title="Quản lý tác giả"
      description="Thông tin các tác giả có trong hệ thống."
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
              + Thêm tác giả
            </button>
          ) : null}
        </div>

        <input
          type="text"
          value={nameSearch}
          onChange={(event) => setNameSearch(event.target.value)}
          placeholder="Tìm theo tên tác giả..."
          className="mt-4 w-full max-w-md rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
        />

        {isFullAccess ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700/70 text-slate-400">
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Tên tác giả</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-6 text-center text-slate-400">
                      Đang tải...
                    </td>
                  </tr>
                ) : authors.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-6 text-center text-slate-400">
                      Không tìm thấy tác giả nào.
                    </td>
                  </tr>
                ) : (
                  authors.map((author) => (
                    <tr key={author.id} className="border-b border-slate-800/70 text-slate-200">
                      <td className="px-4 py-3">{author.id}</td>
                      <td className="px-4 py-3 font-medium text-white">{author.name}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : loading ? (
          <p className="mt-4 text-sm text-slate-400">Đang tải...</p>
        ) : authors.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">Không tìm thấy tác giả nào.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {authors.map((author) => (
              <li
                key={author.id}
                className="rounded-2xl border border-slate-700/70 bg-slate-950/70 px-4 py-3 font-medium text-white"
              >
                {author.name}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-400">
          <p>
            Trang {page}/{totalPages} · Tổng {total} tác giả
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
          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-white">Thêm tác giả</h2>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Tên tác giả *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
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
                  {submitting ? "Đang lưu..." : "Lưu tác giả"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </ProtectedPage>
  );
}
