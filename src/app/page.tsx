"use client";

import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  TrendingUp
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface DashboardStats {
  totalRevenue: number;
  totalSales: number;
  totalProducts: number;
  lowStockAlerts: number;
  salesHistory: {
    date: string;
    revenue: number;
  }[];
}

interface ApiResponse {
  success: boolean;
  data: DashboardStats;
}

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery<ApiResponse>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) throw new Error("Gagal mengambil data dashboard");
      return res.json();
    },
  });

  if (error) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-rose-500 font-medium text-lg">Terjadi kesalahan</p>
          <p className="text-slate-500 text-sm">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  const stats = data?.data;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8 bg-slate-50/30 min-h-screen">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm">Ringkasan performa penjualan dan inventaris sistem kasir.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Pendapatan"
          value={isLoading ? "..." : formatCurrency(stats?.totalRevenue || 0)}
          icon={<DollarSign className="w-5 h-5" />}
          color="indigo"
        />
        <MetricCard
          title="Transaksi Selesai"
          value={isLoading ? "..." : (stats?.totalSales || 0).toLocaleString("id-ID")}
          icon={<ShoppingCart className="w-5 h-5" />}
          color="emerald"
        />
        <MetricCard
          title="Total Produk"
          value={isLoading ? "..." : (stats?.totalProducts || 0).toLocaleString("id-ID")}
          icon={<Package className="w-5 h-5" />}
          color="blue"
        />
        <MetricCard
          title="Stok Menipis"
          value={isLoading ? "..." : (stats?.lowStockAlerts || 0).toLocaleString("id-ID")}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="rose"
          alert={stats?.lowStockAlerts ? stats.lowStockAlerts > 0 : false}
        />
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h2 className="font-semibold text-slate-900">Tren Penjualan (7 Hari Terakhir)</h2>
        </div>

        <div className="h-[350px] w-full">
          {isLoading ? (
            <div className="w-full h-full bg-slate-50 animate-pulse rounded-lg flex items-center justify-center text-slate-400 text-sm">
              Memuat data grafik...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.salesHistory || []}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={10}
                  tickFormatter={(date) => {
                    const d = new Date(date);
                    return d.toLocaleDateString('id-ID', { weekday: 'short' });
                  }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(value) => `Rp ${value / 1000}k`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [formatCurrency(Number(value) || 0), "Pendapatan"]}
                  labelFormatter={(label) => {
                    if (!label) return '';
                    return new Date(label as string).toLocaleDateString('id-ID', { dateStyle: 'long' });
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#6366f1"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, color, alert }: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'indigo' | 'emerald' | 'rose' | 'blue';
  alert?: boolean;
}) {
  const colorMap = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    blue: "bg-blue-50 text-blue-600",
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
      <div className="space-y-1">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
        <p className={`text-xl font-bold ${alert ? 'text-rose-600' : 'text-slate-900'}`}>{value}</p>
      </div>
      <div className={`p-3 rounded-xl ${colorMap[color]}`}>
        {icon}
      </div>
    </div>
  );
}
