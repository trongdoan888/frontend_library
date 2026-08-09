"use client";

import BorrowListPage from "@/app/loans/BorrowListPage";

export default function LoansPage() {
  return (
    <BorrowListPage
      active="/loans"
      title="Phiếu mượn"
      description="Các phiếu mượn đang trong thời hạn mượn."
      statuses={["borrowed"]}
      showFineAmount={false}
      itemLabel="phiếu mượn"
      emptyMessage="Không tìm thấy phiếu mượn nào."
      showAddButton={true}
    />
  );
}
