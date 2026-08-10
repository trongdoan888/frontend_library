"use client";

import ProtectedPage from "@/app/components/ProtectedPage";
import { useAccount } from "@/app/lib/account";

const ROLE_LABELS: Record<string, string> = {
  admin: "Quản trị viên",
  libby: "Thủ thư",
  user: "Người dùng",
};

export default function ProfilePage() {
  const account = useAccount();

  return (
    <ProtectedPage
      active="/profile"
      title="Thông tin cá nhân"
      description="Thông tin tài khoản hiện tại của bạn."
    >
      <div className="max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {account ? (
          <dl className="space-y-4 text-sm">
            <div className="flex justify-between border-b border-slate-100 pb-3">
              <dt className="text-slate-500">Họ và tên</dt>
              <dd className="font-medium text-slate-900">{account.name}</dd>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-3">
              <dt className="text-slate-500">Tên đăng nhập</dt>
              <dd className="font-medium text-slate-900">{account.username}</dd>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-3">
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium text-slate-900">{account.email}</dd>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-3">
              <dt className="text-slate-500">Số điện thoại</dt>
              <dd className="font-medium text-slate-900">{account.phone || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Vai trò</dt>
              <dd className="font-medium text-slate-900">{ROLE_LABELS[account.role] ?? account.role}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-slate-500">Đang tải thông tin tài khoản...</p>
        )}
      </div>
    </ProtectedPage>
  );
}
