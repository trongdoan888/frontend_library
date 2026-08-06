"use client";

import ProtectedPage from "@/app/components/ProtectedPage";
import { genres } from "@/app/lib/mockData";

export default function GenresPage() {
  return (
    <ProtectedPage
      active="/genres"
      title="Quản lý thể loại"
      description="Các thể loại sách đang được lưu trữ trong thư viện." 
    >
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {genres.map((genre) => (
          <div key={genre.id} className="rounded-3xl border border-slate-700/70 bg-slate-900/90 p-6">
            <h3 className="text-xl font-semibold text-white">{genre.name}</h3>
          </div>
        ))}
      </div>
    </ProtectedPage>
  );
}
