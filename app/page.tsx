"use client";

import { useCallback, useEffect, useState } from "react";
import ProtectedPage from "@/app/components/ProtectedPage";
import { getAccessToken } from "@/app/lib/auth";
import { useAccount } from "@/app/lib/account";

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
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^0\d{9,10}$/;

const EMPTY_FORM = {
  username: "",
  password: "",
  email: "",
  phone: "",
  role: "user",
  name: "",
};

export default function Home() {
  const account = useAccount();
  const isFullAccess = account?.role === "admin" || account?.role === "libby";
  const canChooseRole = account?.role === "admin";

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = useCallback(async () => {
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

      setUsers(Array.isArray(result.data) ? result.data : []);
      setTotal(result.total ?? 0);
      setTotalPages(Math.max(1, result.total_pages ?? 1));
    } catch {
      setError("Lỗi kết nối đến máy chủ. Vui lòng thử lại sau.");
      setUsers([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  function openCreateModal() {
    setForm(EMPTY_FORM);
    setCreateError("");
    setShowCreateModal(true);
  }

  function closeCreateModal() {
    if (creating) return;
    setShowCreateModal(false);
  }

  function updateForm<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateForm(): string {
    const { username, password, email, phone, role, name } = form;

    if (!username.trim() || !password.trim() || !email.trim() || !phone.trim() || !role.trim() || !name.trim()) {
      return "Vui lòng nhập đầy đủ tất cả các trường.";
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      return "Email không đúng định dạng.";
    }

    if (!PHONE_REGEX.test(phone.trim())) {
      return "Số điện thoại không đúng định dạng.";
    }

    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    if (users.some((user) => user.username.trim().toLowerCase() === normalizedUsername)) {
      return "Tên đăng nhập đã tồn tại.";
    }

    if (users.some((user) => user.email.trim().toLowerCase() === normalizedEmail)) {
      return "Email đã tồn tại.";
    }

    return "";
  }

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationMessage = validateForm();
    if (validationMessage) {
      setCreateError(validationMessage);
      return;
    }

    setCreating(true);
    setCreateError("");

    try {
      const accessToken = getAccessToken();
      const response = await fetch("http://localhost:8000/api/user/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          username: form.username.trim(),
          password: form.password,
          email: form.email.trim(),
          phone: form.phone.trim(),
          role: canChooseRole ? form.role : "user",
          name: form.name.trim(),
        }),
      });

      const result = (await response.json()) as { message?: string; user?: User };

      if (!response.ok) {
        throw new Error(result.message || "Không thể thêm người dùng.");
      }

      setShowCreateModal(false);
      setForm(EMPTY_FORM);
      if (page === 1) {
        await fetchUsers();
      } else {
        setPage(1);
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Không thể thêm người dùng.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <ProtectedPage
      active="/"
      title="Quản lý người dùng"
      description="Tìm kiếm và quản lý người dùng trong hệ thống."
    >
      <div className="rounded-3xl border border-slate-200/10 bg-slate-900/95 p-6 shadow-xl shadow-slate-950/10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm kiếm theo tên..."
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
          />

          {isFullAccess ? (
            <button
              type="button"
              onClick={openCreateModal}
              className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Thêm người dùng
            </button>
          ) : null}
        </div>

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

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-8">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900/95 p-8 shadow-2xl shadow-slate-950/30">
            <h2 className="text-xl font-semibold text-white">Thêm người dùng</h2>
            <p className="mt-1 text-sm text-slate-400">Nhập thông tin tài khoản mới.</p>

            <form className="mt-6 space-y-5" onSubmit={handleCreateUser}>
              <div>
                <label className="text-sm font-medium text-slate-300" htmlFor="new-name">
                  Họ tên
                </label>
                <input
                  id="new-name"
                  type="text"
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                  placeholder="Nhập họ tên"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300" htmlFor="new-username">
                  Tên đăng nhập
                </label>
                <input
                  id="new-username"
                  type="text"
                  value={form.username}
                  onChange={(event) => updateForm("username", event.target.value)}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                  placeholder="Nhập tên đăng nhập"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300" htmlFor="new-password">
                  Mật khẩu
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={form.password}
                  onChange={(event) => updateForm("password", event.target.value)}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                  placeholder="Nhập mật khẩu"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300" htmlFor="new-email">
                  Email
                </label>
                <input
                  id="new-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => updateForm("email", event.target.value)}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                  placeholder="Nhập email"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300" htmlFor="new-phone">
                  Số điện thoại
                </label>
                <input
                  id="new-phone"
                  type="text"
                  value={form.phone}
                  onChange={(event) => updateForm("phone", event.target.value)}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                  placeholder="Ví dụ: 0912345678"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300" htmlFor="new-role">
                  Vai trò
                </label>
                {canChooseRole ? (
                  <select
                    id="new-role"
                    value={form.role}
                    onChange={(event) => updateForm("role", event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="admin">Admin</option>
                    <option value="libby">Libby</option>
                    <option value="user">User</option>
                  </select>
                ) : (
                  <input
                    id="new-role"
                    type="text"
                    value="User"
                    disabled
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-slate-400 outline-none"
                  />
                )}
              </div>

              {createError ? <p className="text-sm text-rose-400">{createError}</p> : null}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={creating}
                  className="rounded-2xl bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-600"
                >
                  {creating ? "Đang thêm..." : "Thêm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </ProtectedPage>
  );
}
