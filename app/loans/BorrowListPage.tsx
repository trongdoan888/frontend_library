"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import ProtectedPage from "@/app/components/ProtectedPage";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { ChevronLeftIcon, ChevronRightIcon, InboxIcon, PencilIcon, PlusIcon, SearchIcon, TrashIcon } from "@/app/components/icons";
import { getAccessToken } from "@/app/lib/auth";
import { useAccount } from "@/app/lib/account";

type BookQuantity = {
  name: string;
  book_quantity: number;
};

type Loan = {
  id: string;
  user?: string;
  user_name?: string;
  book_quantities: BookQuantity[];
  borrow_date: string;
  due_date: string;
  payment_date?: string;
  borrow_status: string;
  fine_amount?: string;
};

type LoanListResponse = {
  data: Loan[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

const PAGE_SIZE = 10;
const OPTION_PAGE_SIZE = 200;
const SEARCH_DEBOUNCE_MS = 300;

type UserOption = {
  id: string;
  username: string;
  name: string;
};

type BookOption = {
  id: string;
  name: string;
};

type BookEntry = {
  book: BookOption;
  quantity: string;
};

type LoanFormState = {
  user: UserOption | null;
  books: BookEntry[];
  dueDate: string;
};

const EMPTY_LOAN_FORM: LoanFormState = { user: null, books: [], dueDate: "" };

type LoanEditFormState = {
  dueDate: string;
  borrowStatus: string;
  paymentDate: string
};

const BORROW_STATUS_OPTIONS = [
  { value: "borrowed", label: "Đang mượn" },
  { value: "returned", label: "Đã trả" },
  { value: "overdue", label: "Quá hạn" },
];

const BORROW_STATUS_BADGES: Record<string, { label: string; className: string }> = {
  borrowed: { label: "Đang mượn", className: "bg-blue-50 text-blue-700" },
  returned: { label: "Đã trả", className: "bg-emerald-50 text-emerald-700" },
  overdue: { label: "Quá hạn", className: "bg-rose-50 text-rose-700" },
};

function BorrowStatusBadge({ status }: { status: string }) {
  const badge = BORROW_STATUS_BADGES[status] ?? { label: status, className: "bg-slate-100 text-slate-600" };
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>{badge.label}</span>;
}

type UserAutocompleteProps = {
  options: UserOption[];
  selected: UserOption | null;
  onSelect: (user: UserOption | null) => void;
};

function UserAutocomplete({ options, selected, onSelect }: UserAutocompleteProps) {
  const [query, setQuery] = useState("");

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return options.filter((option) => option.username.toLowerCase().includes(q)).slice(0, 8);
  }, [query, options]);

  function choose(option: UserOption) {
    onSelect(option);
    setQuery("");
  }

  function clear() {
    onSelect(null);
    setQuery("");
  }

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">Người mượn (username) *</label>
      {selected ? (
        <div className="mb-2 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900">
          <span className="flex-1">{selected.name}</span>
          <button type="button" onClick={clear} className="text-slate-400 hover:text-slate-700">
            ×
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nhập username để tìm..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
          />
          {suggestions.length > 0 ? (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
              {suggestions.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => choose(option)}
                    className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    {option.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  );
}

type BookQuantityPickerProps = {
  options: BookOption[];
  entries: BookEntry[];
  onChange: (entries: BookEntry[]) => void;
};

function BookQuantityPicker({ options, entries, onChange }: BookQuantityPickerProps) {
  const [query, setQuery] = useState("");

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return options
      .filter((option) => option.name.toLowerCase().includes(q))
      .filter((option) => !entries.some((entry) => entry.book.id === option.id))
      .slice(0, 8);
  }, [query, options, entries]);

  function addBook(book: BookOption) {
    onChange([...entries, { book, quantity: "1" }]);
    setQuery("");
  }

  function removeBook(id: string) {
    onChange(entries.filter((entry) => entry.book.id !== id));
  }

  function updateQuantity(id: string, quantity: string) {
    onChange(entries.map((entry) => (entry.book.id === id ? { ...entry, quantity } : entry)));
  }

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">Sách và số lượng *</label>
      {entries.length > 0 ? (
        <div className="mb-2 space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.book.id}
              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2"
            >
              <span className="flex-1 text-sm text-slate-700">{entry.book.name}</span>
              <input
                type="number"
                min={1}
                value={entry.quantity}
                onChange={(event) => updateQuantity(entry.book.id, event.target.value)}
                className="w-20 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => removeBook(entry.book.id)}
                className="text-rose-500 hover:text-rose-700"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nhập tên sách để tìm..."
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
        />
        {suggestions.length > 0 ? (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
            {suggestions.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => addBook(option)}
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

type BorrowListPageProps = {
  active: string;
  title: string;
  description: string;
  statuses: string[];
  showFineAmount: boolean;
  itemLabel: string;
  emptyMessage: string;
  showAddButton?: boolean;
};

export default function BorrowListPage({
  active,
  title,
  description,
  statuses,
  showFineAmount,
  itemLabel,
  emptyMessage,
  showAddButton = false,
}: BorrowListPageProps) {
  const account = useAccount();
  const isFullAccess = account?.role === "admin" || account?.role === "libby";

  const [page, setPage] = useState(1);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [nameSearch, setNameSearch] = useState("");
  const [debouncedNameSearch, setDebouncedNameSearch] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [bookOptions, setBookOptions] = useState<BookOption[]>([]);
  const [form, setForm] = useState<LoanFormState>(EMPTY_LOAN_FORM);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [editForm, setEditForm] = useState<LoanEditFormState>({
    dueDate: "",
    borrowStatus: "borrowed",
    paymentDate: ""
  });
  const [editError, setEditError] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Loan | null>(null);
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

    async function fetchLoans() {
      setLoading(true);
      setError("");

      try {
        const query = debouncedNameSearch.toLowerCase();

        // The backend has no name filter, so a search fetches the full list and filters by borrower name client-side.
        const params = new URLSearchParams(
          query
            ? { page: "1", page_size: String(OPTION_PAGE_SIZE) }
            : { page: String(page), page_size: String(PAGE_SIZE) }
        );

        const accessToken = getAccessToken();
        const response = await fetch(`http://localhost:8000/api/borrow/?${params.toString()}`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        });

        if (!response.ok) {
          throw new Error("Không thể tải danh sách mượn/trả.");
        }

        const result = (await response.json()) as LoanListResponse;

        if (!ignore) {
          const wantedStatuses = statuses.map((status) => status.toLowerCase());
          const filtered = (Array.isArray(result.data) ? result.data : [])
            .filter((loan) => wantedStatuses.includes((loan.borrow_status ?? "").toLowerCase()))
            .filter((loan) => isFullAccess || !account || loan.user === account.id)
            .filter((loan) => !query || (loan.user_name ?? "").toLowerCase().includes(query));

          if (!query) {
            setLoans(filtered);
            setTotalPages(Math.max(1, result.total_pages ?? 1));
          } else {
            const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
            const safePage = Math.min(page, pageCount);
            setLoans(filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE));
            setTotalPages(pageCount);
            if (safePage !== page) setPage(safePage);
          }
        }
      } catch {
        if (!ignore) {
          setError("Lỗi kết nối đến máy chủ. Vui lòng thử lại sau.");
          setLoans([]);
          setTotalPages(1);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchLoans();

    return () => {
      ignore = true;
    };
    // statuses is a stable constant passed in from each page, so only page/account need to be tracked
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, account?.id, isFullAccess, reloadKey, debouncedNameSearch]);

  useEffect(() => {
    if (!showAddForm) return;
    let ignore = false;

    async function fetchOptions() {
      const accessToken = getAccessToken();
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;

      try {
        const [userRes, bookRes] = await Promise.all([
          fetch(`http://localhost:8000/api/user/?page=1&page_size=${OPTION_PAGE_SIZE}`, { headers }),
          fetch(`http://localhost:8000/api/book/?page=1&page_size=${OPTION_PAGE_SIZE}`, { headers }),
        ]);

        if (!ignore && userRes.ok) {
          const userData = (await userRes.json()) as { data: UserOption[] };
          setUserOptions(Array.isArray(userData.data) ? userData.data : []);
        }
        if (!ignore && bookRes.ok) {
          const bookData = (await bookRes.json()) as { data: BookOption[] };
          setBookOptions(Array.isArray(bookData.data) ? bookData.data : []);
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
    setForm(EMPTY_LOAN_FORM);
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

    if (!form.user) {
      setFormError("Vui lòng chọn người mượn.");
      return;
    }
    if (form.books.length === 0) {
      setFormError("Vui lòng chọn ít nhất một cuốn sách.");
      return;
    }
    if (
      form.books.some(
        (entry) => entry.quantity.trim() === "" || Number.isNaN(Number(entry.quantity)) || Number(entry.quantity) <= 0
      )
    ) {
      setFormError("Vui lòng nhập số lượng hợp lệ cho mỗi cuốn sách.");
      return;
    }
    if (!form.dueDate) {
      setFormError("Vui lòng chọn ngày trả.");
      return;
    }

    setSubmitting(true);

    try {
      const accessToken = getAccessToken();
      const response = await fetch("http://localhost:8000/api/borrow/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          user: form.user.id,
          books: form.books.map((entry) => ({ book: entry.book.id, book_quantity: Number(entry.quantity) })),
          due_date: form.dueDate,
          borrow_status: "borrowed",
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setFormError(result?.message || "Không thể tạo phiếu mượn. Vui lòng kiểm tra lại thông tin.");
        return;
      }

      setShowAddForm(false);
      setForm(EMPTY_LOAN_FORM);
      setPage(1);
      setReloadKey((key) => key + 1);
    } catch {
      setFormError("Lỗi kết nối đến máy chủ. Vui lòng thử lại sau.");
    } finally {
      setSubmitting(false);
    }
  }

  function openEditForm(loan: Loan) {
    setEditingLoan(loan);
    setEditForm({
      dueDate: loan.due_date ?? "",
      borrowStatus: loan.borrow_status ?? "borrowed",
      paymentDate: loan.payment_date ?? ""
    });
    setEditError("");
  }

  function closeEditForm() {
    setEditingLoan(null);
    setEditError("");
  }

  async function handleEditSubmit(event: FormEvent) {
    event.preventDefault();
    setEditError("");

    if (!editingLoan) return;

    if (!editForm.dueDate) {
      setEditError("Vui lòng chọn hạn trả.");
      return;
    }

    setEditSubmitting(true);

    try {
      const accessToken = getAccessToken();
      const response = await fetch("http://localhost:8000/api/borrow/", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          id: editingLoan.id,
          due_date: editForm.dueDate,
          borrow_status: editForm.borrowStatus,
          payment_date: editForm.paymentDate || null
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setEditError(result?.message || "Không thể cập nhật phiếu mượn. Vui lòng kiểm tra lại thông tin.");
        return;
      }

      setEditingLoan(null);
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
      const response = await fetch("http://localhost:8000/api/borrow/", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ id: deleteTarget.id }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message || result?.error || "Không thể xóa phiếu mượn.");
      }

      setDeleteTarget(null);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa phiếu mượn.");
    } finally {
      setDeleting(false);
    }
  }

  const columnCount = (isFullAccess ? 2 : 0) + (showFineAmount ? 1 : 0) + 5;

  return (
    <ProtectedPage active={active} title={title} description={description}>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {error ? <p className="text-sm text-rose-600">{error}</p> : <span />}
          {showAddButton && isFullAccess ? (
            <button
              type="button"
              onClick={openAddForm}
              className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-500"
            >
              <PlusIcon className="h-4 w-4" />
              Thêm phiếu mượn
            </button>
          ) : null}
        </div>

        {isFullAccess ? (
          <div className="relative mt-4 w-full max-w-md">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={nameSearch}
              onChange={(event) => setNameSearch(event.target.value)}
              placeholder="Tìm theo tên người mượn..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
        ) : null}

        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                {isFullAccess ? <th className="px-4 py-3 font-medium">Người mượn</th> : null}
                <th className="px-4 py-3 font-medium">Sách</th>
                <th className="px-4 py-3 font-medium">Ngày mượn</th>
                <th className="px-4 py-3 font-medium">Hạn trả</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium">Ngày trả</th>
                {showFineAmount ? <th className="px-4 py-3 font-medium">Tiền phạt</th> : null}
                {isFullAccess ? <th className="px-4 py-3 font-medium">Hành động</th> : null}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columnCount} className="px-4 py-6 text-center text-slate-500">
                    Đang tải...
                  </td>
                </tr>
              ) : loans.length === 0 ? (
                <tr>
                  <td colSpan={columnCount} className="px-4 py-10 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <InboxIcon className="h-8 w-8 text-slate-300" />
                      {emptyMessage}
                    </div>
                  </td>
                </tr>
              ) : (
                loans.map((loan) => (
                  <tr key={loan.id} className="border-b border-slate-100 text-slate-700 transition hover:bg-slate-50">
                    {isFullAccess ? <td className="px-4 py-3">{loan.user_name || "-"}</td> : null}
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {(loan.book_quantities ?? [])
                        .map((item) => `${item.name} x${item.book_quantity}`)
                        .join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3">{loan.borrow_date}</td>
                    <td className="px-4 py-3">{loan.due_date}</td>
                    <td className="px-4 py-3">
                      <BorrowStatusBadge status={loan.borrow_status} />
                    </td>
                    <td className="px-4 py-3">{loan.payment_date || "-"}</td>
                    {showFineAmount ? <td className="px-4 py-3">{loan.fine_amount || "-"}</td> : null}
                    {isFullAccess ? (
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEditForm(loan)}
                            className="flex items-center gap-1 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100"
                          >
                            <PencilIcon className="h-3.5 w-3.5" />
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(loan)}
                            className="flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                            Xóa
                          </button>
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
            Trang {page}/{totalPages} · {loans.length} {itemLabel} trên trang này
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
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-slate-900">Thêm phiếu mượn</h2>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <UserAutocomplete
                options={userOptions}
                selected={form.user}
                onSelect={(user) => setForm((prev) => ({ ...prev, user }))}
              />

              <BookQuantityPicker
                options={bookOptions}
                entries={form.books}
                onChange={(books) => setForm((prev) => ({ ...prev, books }))}
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Ngày trả *</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
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
                  {submitting ? "Đang lưu..." : "Lưu phiếu mượn"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editingLoan ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-slate-900">Chỉnh sửa phiếu mượn</h2>
            <p className="mt-1 text-sm text-slate-500">
              {editingLoan.user_name || "-"} ·{" "}
              {(editingLoan.book_quantities ?? []).map((item) => `${item.name} x${item.book_quantity}`).join(", ") ||
                "—"}
            </p>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Hạn trả *</label>
                <input
                  type="date"
                  value={editForm.dueDate}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Trạng thái *</label>
                <select
                  value={editForm.borrowStatus}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, borrowStatus: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                >
                  {BORROW_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Ngày trả</label>
                <input
                  type="date"
                  value={editForm.paymentDate}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, paymentDate: event.target.value }))}
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
        title="Xóa phiếu mượn"
        message={`Bạn có chắc chắn muốn xóa phiếu mượn của "${deleteTarget?.user_name || "-"}"? Hành động này không thể hoàn tác.`}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </ProtectedPage>
  );
}
