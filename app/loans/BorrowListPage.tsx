"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import ProtectedPage from "@/app/components/ProtectedPage";
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
      <label className="mb-2 block text-sm font-medium text-slate-300">Người mượn (username) *</label>
      {selected ? (
        <div className="mb-2 flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm text-slate-100">
          <span className="flex-1">{selected.name}</span>
          <button type="button" onClick={clear} className="text-slate-400 hover:text-white">
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
            className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
          />
          {suggestions.length > 0 ? (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-xl">
              {suggestions.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => choose(option)}
                    className="block w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
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
      <label className="mb-2 block text-sm font-medium text-slate-300">Sách và số lượng *</label>
      {entries.length > 0 ? (
        <div className="mb-2 space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.book.id}
              className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2"
            >
              <span className="flex-1 text-sm text-slate-200">{entry.book.name}</span>
              <input
                type="number"
                min={1}
                value={entry.quantity}
                onChange={(event) => updateQuantity(entry.book.id, event.target.value)}
                className="w-20 rounded-xl border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => removeBook(entry.book.id)}
                className="text-rose-400 hover:text-rose-300"
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
          className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
        />
        {suggestions.length > 0 ? (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-xl">
            {suggestions.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => addBook(option)}
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
        const params = new URLSearchParams({
          page: String(page),
          page_size: String(PAGE_SIZE),
        });
        if (debouncedNameSearch) params.set("name", debouncedNameSearch);

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
            .filter((loan) => isFullAccess || !account || loan.user === account.id);
          setLoans(filtered);
          setTotalPages(Math.max(1, result.total_pages ?? 1));
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

  const columnCount = (isFullAccess ? 1 : 0) + (showFineAmount ? 1 : 0) + 5;

  return (
    <ProtectedPage active={active} title={title} description={description}>
      <div className="rounded-3xl border border-slate-200/10 bg-slate-900/95 p-6 shadow-xl shadow-slate-950/10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {error ? <p className="text-sm text-rose-400">{error}</p> : <span />}
          {showAddButton && isFullAccess ? (
            <button
              type="button"
              onClick={openAddForm}
              className="rounded-2xl bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-500"
            >
              + Thêm phiếu mượn
            </button>
          ) : null}
        </div>

        {isFullAccess ? (
          <input
            type="text"
            value={nameSearch}
            onChange={(event) => setNameSearch(event.target.value)}
            placeholder="Tìm theo tên người mượn..."
            className="mt-4 w-full max-w-md rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
          />
        ) : null}

        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700/70 text-slate-400">
                {isFullAccess ? <th className="px-4 py-3 font-medium">Người mượn</th> : null}
                <th className="px-4 py-3 font-medium">Sách</th>
                <th className="px-4 py-3 font-medium">Ngày mượn</th>
                <th className="px-4 py-3 font-medium">Hạn trả</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium">Ngày trả</th>
                {showFineAmount ? <th className="px-4 py-3 font-medium">Tiền phạt</th> : null}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columnCount} className="px-4 py-6 text-center text-slate-400">
                    Đang tải...
                  </td>
                </tr>
              ) : loans.length === 0 ? (
                <tr>
                  <td colSpan={columnCount} className="px-4 py-6 text-center text-slate-400">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                loans.map((loan) => (
                  <tr key={loan.id} className="border-b border-slate-800/70 text-slate-200">
                    {isFullAccess ? <td className="px-4 py-3">{loan.user_name || "-"}</td> : null}
                    <td className="px-4 py-3 font-medium text-white">
                      {(loan.book_quantities ?? [])
                        .map((item) => `${item.name} x${item.book_quantity}`)
                        .join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3">{loan.borrow_date}</td>
                    <td className="px-4 py-3">{loan.due_date}</td>
                    <td className="px-4 py-3">{loan.borrow_status}</td>
                    <td className="px-4 py-3">{loan.payment_date || "-"}</td>
                    {showFineAmount ? <td className="px-4 py-3">{loan.fine_amount || "-"}</td> : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-400">
          <p>
            Trang {page}/{totalPages} · {loans.length} {itemLabel} trên trang này
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
            <h2 className="text-xl font-semibold text-white">Thêm phiếu mượn</h2>

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
                <label className="mb-2 block text-sm font-medium text-slate-300">Ngày trả *</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
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
                  {submitting ? "Đang lưu..." : "Lưu phiếu mượn"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </ProtectedPage>
  );
}
