"use client";

import ProtectedPage from "@/app/components/ProtectedPage";
import { loans } from "@/app/lib/mockData";

export default function LoansPage() {
  return (
    <ProtectedPage
      active="/loans"
      title="Quản lý mượn/trả"
      description="Danh sách mượn trả và trạng thái hiện tại của sách." 
    >
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {loans.map((loan) => (
          <div key={loan.id} className="rounded-3xl border border-slate-700/70 bg-slate-900/90 p-6">
            <h3 className="text-xl font-semibold text-white">{loan.book}</h3>
            <p className="mt-3 text-sm text-slate-300">Người mượn: {loan.user}</p>
            <p className="mt-1 text-sm text-slate-300">Trạng thái: {loan.status}</p>
            <p className="mt-1 text-sm text-slate-400">Hạn trả: {loan.dueDate}</p>
          </div>
        ))}
      </div>
    </ProtectedPage>
  );
}
