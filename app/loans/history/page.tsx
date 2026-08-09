"use client";

import BorrowListPage from "@/app/loans/BorrowListPage";

export default function LoanHistoryPage() {
  return (
    <BorrowListPage
      active="/loans/history"
      title="Lịch sử mượn"
      description="Các phiếu mượn đã được trả."
      statuses={["returned"]}
      showFineAmount={true}
      itemLabel="phiếu đã trả"
      emptyMessage="Không tìm thấy phiếu mượn đã trả nào."
    />
  );
}
