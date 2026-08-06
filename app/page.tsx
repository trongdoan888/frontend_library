"use client";

import { useEffect, useState } from "react";
import ProtectedPage from "@/app/components/ProtectedPage";
import { getAccessToken } from "@/app/lib/auth";

type User = {
  id: string;
  username: string;
  email: string;
  phone: string;
  role: string;
  name: string;
};

type UserListResponse = {
  data: User[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

export default function Home() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let ignore = false;

    async function fetchUsers() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        if (debouncedSearch) {
          params.set("name", debouncedSearch);
        }

        const accessToken = getAccessToken();
        const response = await fetch(`http://localhost:8000/api/user/?${params.toString()}`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        });

        if (!response.ok) {
          throw new Error("Không thể tải danh sách người dùng.");
        }

        const result = (await response.json()) as UserListResponse;

        if (!ignore) {
          setUsers(Array.isArray(result.data) ? result.data : []);
          setTotal(result.total ?? 0);
          setTotalPages(Math.max(1, result.total_pages ?? 1));
        }
      } catch {
        if (!ignore) {
          setError("Lỗi kết nối đến máy chủ. Vui lòng thử lại sau.");
          setUsers([]);
          setTotal(0);
          setTotalPages(1);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchUsers();

    return () => {
      ignore = true;
    };
  }, [debouncedSearch, page]);

  return (
    <ProtectedPage
      active="/"
      title="Quản lý người dùng"
      description="Tìm kiếm và quản lý người dùng trong hệ thống."
    >
      <div className="rounded-3xl border border-slate-200/10 bg-slate-900/95 p-6 shadow-xl shadow-slate-950/10">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm kiếm theo tên..."
          className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
        />

        {error ? <p className="mt-4 text-sm text-rose-400">{error}</p> : null}

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700/70 text-slate-400">
                <th className="px-4 py-3 font-medium">Tên</th>
                <th className="px-4 py-3 font-medium">Tên đăng nhập</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Số điện thoại</th>
                <th className="px-4 py-3 font-medium">Vai trò</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    Đang tải...
                  </td>
                </tr>
              ) : (users ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    Không tìm thấy người dùng nào.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-800/70 text-slate-200">
                    <td className="px-4 py-3 font-medium text-white">{user.name}</td>
                    <td className="px-4 py-3">{user.username}</td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">{user.phone}</td>
                    <td className="px-4 py-3 capitalize">{user.role}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-400">
          <p>
            Trang {page}/{totalPages} · Tổng {total} người dùng
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
    </ProtectedPage>
  );
}
