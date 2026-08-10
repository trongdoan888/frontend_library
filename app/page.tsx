"use client";

import { useCallback, useEffect, useState } from "react";
import ProtectedPage from "@/app/components/ProtectedPage";
import ConfirmDialog from "@/app/components/ConfirmDialog";
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

const ROLE_BADGE_STYLES: Record<string, string> = {
  admin: "bg-violet-50 text-violet-700",
  libby: "bg-blue-50 text-blue-700",
  user: "bg-slate-100 text-slate-600",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  libby: "Libby",
  user: "User",
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

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  function canDeleteUser(user: User): boolean {
    if (account?.role === "admin") return true;
    if (account?.role === "libby") return user.role !== "admin";
    return false;
  }

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

  function openEditModal(user: User) {
    setEditingUser(user);
    setEditForm({
      username: user.username,
      password: "",
      email: user.email,
      phone: user.phone,
      role: user.role,
      name: user.name,
    });
    setEditError("");
  }

  function closeEditModal() {
    if (editing) return;
    setEditingUser(null);
  }

  function updateEditForm<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateEditForm(): string {
    const { username, password, email, phone, name } = editForm;

    if (!username.trim() || !email.trim() || !phone.trim() || !name.trim()) {
      return "Vui lòng nhập đầy đủ tất cả các trường.";
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      return "Email không đúng định dạng.";
    }

    if (!PHONE_REGEX.test(phone.trim())) {
      return "Số điện thoại không đúng định dạng.";
    }

    if (password.trim() && password.trim().length < 6) {
      return "Mật khẩu mới phải có ít nhất 6 ký tự.";
    }

    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    if (
      users.some(
        (user) => user.id !== editingUser?.id && user.username.trim().toLowerCase() === normalizedUsername
      )
    ) {
      return "Tên đăng nhập đã tồn tại.";
    }

    if (
      users.some((user) => user.id !== editingUser?.id && user.email.trim().toLowerCase() === normalizedEmail)
    ) {
      return "Email đã tồn tại.";
    }

    return "";
  }

  async function handleEditUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingUser) return;

    const validationMessage = validateEditForm();
    if (validationMessage) {
      setEditError(validationMessage);
      return;
    }

    setEditing(true);
    setEditError("");

    try {
      const accessToken = getAccessToken();
      const body: Record<string, string> = {
        id: editingUser.id,
        username: editForm.username.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        name: editForm.name.trim(),
      };
      if (editForm.password.trim()) body.password = editForm.password.trim();
      if (canChooseRole) body.role = editForm.role;

      const response = await fetch("http://localhost:8000/api/user/", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(body),
      });

      const result = (await response.json()) as { message?: string; error?: string; user?: User };

      if (!response.ok) {
        throw new Error(result.error || result.message || "Không thể cập nhật người dùng.");
      }

      setEditingUser(null);
      await fetchUsers();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Không thể cập nhật người dùng.");
    } finally {
      setEditing(false);
    }
  }

  function cancelDeleteUser() {
    if (deleting) return;
    setDeleteTarget(null);
  }

  async function confirmDeleteUser() {
    if (!deleteTarget) return;

    setDeleting(true);
    setError("");

    try {
      const accessToken = getAccessToken();
      const response = await fetch("http://localhost:8000/api/user/", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ id: deleteTarget.id }),
      });

      const result = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;

      if (!response.ok) {
        throw new Error(result?.error || result?.message || "Không thể xóa người dùng.");
      }

      setDeleteTarget(null);
      if (users.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        await fetchUsers();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa người dùng.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ProtectedPage
      active="/"
      title="Quản lý người dùng"
      description="Tìm kiếm và quản lý người dùng trong hệ thống."
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm kiếm theo tên..."
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
          />

          {isFullAccess ? (
            <button
              type="button"
              onClick={openCreateModal}
              className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Thêm người dùng
            </button>
          ) : null}
        </div>

        {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="px-4 py-3 font-medium">Tên</th>
                <th className="px-4 py-3 font-medium">Tên đăng nhập</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Số điện thoại</th>
                <th className="px-4 py-3 font-medium">Vai trò</th>
                {isFullAccess ? <th className="px-4 py-3 font-medium">Hành động</th> : null}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isFullAccess ? 6 : 5} className="px-4 py-6 text-center text-slate-500">
                    Đang tải...
                  </td>
                </tr>
              ) : (users ?? []).length === 0 ? (
                <tr>
                  <td colSpan={isFullAccess ? 6 : 5} className="px-4 py-6 text-center text-slate-500">
                    Không tìm thấy người dùng nào.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 text-slate-700 transition hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{user.name}</td>
                    <td className="px-4 py-3">{user.username}</td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">{user.phone}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          ROLE_BADGE_STYLES[user.role] ?? ROLE_BADGE_STYLES.user
                        }`}
                      >
                        {ROLE_LABELS[user.role] ?? user.role}
                      </span>
                    </td>
                    {isFullAccess ? (
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(user)}
                            className="rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100"
                          >
                            Sửa
                          </button>
                          {canDeleteUser(user) ? (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(user)}
                              className="rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
                            >
                              Xóa
                            </button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-500">
          <p>
            Trang {page}/{totalPages} · Tổng {total} người dùng
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

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            <h2 className="text-xl font-semibold text-slate-900">Thêm người dùng</h2>
            <p className="mt-1 text-sm text-slate-500">Nhập thông tin tài khoản mới.</p>

            <form className="mt-6 space-y-5" onSubmit={handleCreateUser}>
              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="new-name">
                  Họ tên
                </label>
                <input
                  id="new-name"
                  type="text"
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                  placeholder="Nhập họ tên"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="new-username">
                  Tên đăng nhập
                </label>
                <input
                  id="new-username"
                  type="text"
                  value={form.username}
                  onChange={(event) => updateForm("username", event.target.value)}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                  placeholder="Nhập tên đăng nhập"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="new-password">
                  Mật khẩu
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={form.password}
                  onChange={(event) => updateForm("password", event.target.value)}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                  placeholder="Nhập mật khẩu"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="new-email">
                  Email
                </label>
                <input
                  id="new-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => updateForm("email", event.target.value)}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                  placeholder="Nhập email"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="new-phone">
                  Số điện thoại
                </label>
                <input
                  id="new-phone"
                  type="text"
                  value={form.phone}
                  onChange={(event) => updateForm("phone", event.target.value)}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                  placeholder="Ví dụ: 0912345678"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="new-role">
                  Vai trò
                </label>
                {canChooseRole ? (
                  <select
                    id="new-role"
                    value={form.role}
                    onChange={(event) => updateForm("role", event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
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
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500 outline-none"
                  />
                )}
              </div>

              {createError ? <p className="text-sm text-rose-600">{createError}</p> : null}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={creating}
                  className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {creating ? "Đang thêm..." : "Thêm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editingUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            <h2 className="text-xl font-semibold text-slate-900">Chỉnh sửa người dùng</h2>
            <p className="mt-1 text-sm text-slate-500">Cập nhật thông tin tài khoản.</p>

            <form className="mt-6 space-y-5" onSubmit={handleEditUser}>
              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="edit-name">
                  Họ tên
                </label>
                <input
                  id="edit-name"
                  type="text"
                  value={editForm.name}
                  onChange={(event) => updateEditForm("name", event.target.value)}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                  placeholder="Nhập họ tên"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="edit-username">
                  Tên đăng nhập
                </label>
                <input
                  id="edit-username"
                  type="text"
                  value={editForm.username}
                  onChange={(event) => updateEditForm("username", event.target.value)}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                  placeholder="Nhập tên đăng nhập"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="edit-password">
                  Mật khẩu mới
                </label>
                <input
                  id="edit-password"
                  type="password"
                  value={editForm.password}
                  onChange={(event) => updateEditForm("password", event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                  placeholder="Để trống nếu không đổi mật khẩu"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="edit-email">
                  Email
                </label>
                <input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(event) => updateEditForm("email", event.target.value)}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                  placeholder="Nhập email"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="edit-phone">
                  Số điện thoại
                </label>
                <input
                  id="edit-phone"
                  type="text"
                  value={editForm.phone}
                  onChange={(event) => updateEditForm("phone", event.target.value)}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                  placeholder="Ví dụ: 0912345678"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="edit-role">
                  Vai trò
                </label>
                {canChooseRole ? (
                  <select
                    id="edit-role"
                    value={editForm.role}
                    onChange={(event) => updateEditForm("role", event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                  >
                    <option value="admin">Admin</option>
                    <option value="libby">Libby</option>
                    <option value="user">User</option>
                  </select>
                ) : (
                  <input
                    id="edit-role"
                    type="text"
                    value={editForm.role}
                    disabled
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 capitalize text-slate-500 outline-none"
                  />
                )}
                {!canChooseRole ? (
                  <p className="mt-1 text-xs text-slate-400">Chỉ Admin mới có quyền sửa vai trò.</p>
                ) : null}
              </div>

              {editError ? <p className="text-sm text-rose-600">{editError}</p> : null}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={editing}
                  className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={editing}
                  className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {editing ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Xóa người dùng"
        message={`Bạn có chắc chắn muốn xóa người dùng "${deleteTarget?.name}"? Hành động này không thể hoàn tác.`}
        loading={deleting}
        onConfirm={confirmDeleteUser}
        onCancel={cancelDeleteUser}
      />
    </ProtectedPage>
  );
}
