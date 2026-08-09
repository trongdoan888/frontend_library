"use client";

import BorrowListPage from "@/app/loans/BorrowListPage";

export default function OverdueLoansPage() {
  return (
    <BorrowListPage
      active="/loans/overdue"
      title="Phiếu mượn quá hạn"
      description="Các phiếu mượn quá hạn và số tiền phạt phải trả."
      statuses={["overdue"]}
      showFineAmount={true}
      itemLabel="phiếu quá hạn"
      emptyMessage="Không có phiếu mượn quá hạn nào."
    />
  );
}
