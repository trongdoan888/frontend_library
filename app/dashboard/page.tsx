"use client";

import { useEffect, useState } from "react";
import ProtectedPage from "@/app/components/ProtectedPage";
import { getAccessToken } from "@/app/lib/auth";
import { API_BASE_URL } from "@/app/lib/api";

type DashboardStats = {
  total_books: number;
  total_book_quantity: number;
  total_users: number;
  total_borrowed: number;
  total_overdue: number;
};

const RING_SIZE = 152;
const RING_STROKE = 14;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type StatRingProps = {
  label: string;
  value: number;
  color: string;
  trackColor: string;
};

function StatRing({ label, value, color, trackColor }: StatRingProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
      <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
        <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} fill="none" stroke={trackColor} strokeWidth={RING_STROKE} />
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={0}
          transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
        />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-900 text-2xl font-semibold">
          {value.toLocaleString("vi-VN")}
        </text>
      </svg>
      <p className="text-sm font-medium text-slate-600">{label}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function fetchStats() {
      setLoading(true);
      setError("");

      try {
        const accessToken = getAccessToken();
        const response = await fetch(`${API_BASE_URL}/api/dashboard/`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        });

        if (response.status === 403) {
          throw new Error("Trang này chỉ dành cho Admin.");
        }
        if (!response.ok) {
          throw new Error("Không thể tải dữ liệu thống kê.");
        }

        const result = (await response.json()) as DashboardStats;
        if (!ignore) setStats(result);
      } catch (err) {
        if (!ignore) setError(err instanceof Error ? err.message : "Không thể tải dữ liệu thống kê.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    fetchStats();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <ProtectedPage active="/dashboard" title="Dashboard" description="Thống kê tổng quan về thư viện.">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? (
          <p className="text-sm text-slate-500">Đang tải...</p>
        ) : error ? (
          <p className="text-sm text-rose-600">{error}</p>
        ) : stats ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatRing label="Số đầu sách" value={stats.total_books} color="#2a78d6" trackColor="rgba(42,120,214,0.12)" />
            <StatRing
              label="Tổng số lượng sách"
              value={stats.total_book_quantity}
              color="#2a78d6"
              trackColor="rgba(42,120,214,0.12)"
            />
            <StatRing
              label="Sách đang được mượn"
              value={stats.total_borrowed}
              color="#eb6834"
              trackColor="rgba(235,104,52,0.12)"
            />
            <StatRing label="Người dùng" value={stats.total_users} color="#1baf7a" trackColor="rgba(27,175,122,0.12)" />
          </div>
        ) : null}
      </div>
    </ProtectedPage>
  );
}
