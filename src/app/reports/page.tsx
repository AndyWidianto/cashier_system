'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  CreditCard,
  Download,
  Calendar,
  RefreshCw,
  FileText,
  PieChart as PieChartIcon,
  BarChart3,
  Percent,
  Layers,
  ArrowUpRight,
  AlertCircle
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

interface ReportSummary {
  totalTransactions: number;
  totalRevenue: number;
  totalGrossSales: number;
  totalDiscount: number;
  totalTax: number;
  averageTransactionValue: number;
}

interface ReportFinancials {
  totalRevenue: number;
  totalCostOfGoods: number;
  grossProfit: number;
  profitMarginPercent: number;
}

interface PaymentMethodStat {
  method: string;
  count: number;
  amount: number;
}

interface TopProductStat {
  productId: string;
  productName: string;
  productSku: string;
  totalQuantity: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
}

interface CategoryStat {
  categoryId: string;
  categoryName: string;
  totalQuantity: number;
  totalRevenue: number;
}

interface ReportData {
  summary: ReportSummary;
  financials: ReportFinancials;
  paymentMethods: PaymentMethodStat[];
  topProducts: TopProductStat[];
  categoryPerformance: CategoryStat[];
}

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Tunai',
  BANK_TRANSFER: 'Transfer Bank',
  QRIS: 'QRIS',
  DEBIT_CARD: 'Kartu Debit',
};

export default function ReportsPage() {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<ReportData>({
    queryKey: ['reports', { startDate, endDate }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/reports?${params.toString()}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Gagal mengambil data laporan');
      }
      const json = await res.json();
      return json.data;
    },
  });

  const setPresetDate = (type: 'today' | '7days' | '30days' | 'thisMonth' | 'all') => {
    const now = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    if (type === 'today') {
      const todayStr = formatDate(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (type === '7days') {
      const past = new Date();
      past.setDate(now.getDate() - 7);
      setStartDate(formatDate(past));
      setEndDate(formatDate(now));
    } else if (type === '30days') {
      const past = new Date();
      past.setDate(now.getDate() - 30);
      setStartDate(formatDate(past));
      setEndDate(formatDate(now));
    } else if (type === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(formatDate(firstDay));
      setEndDate(formatDate(now));
    } else if (type === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleExportCSV = () => {
    if (!data) return;

    const lines: string[] = [];
    lines.push('LAPORAN PENJUALAN DAN KEUANGAN');
    lines.push(`Periode: ${startDate || 'Awal'} s/d ${endDate || 'Sekarang'}`);
    lines.push(`Tanggal Ekspor: ${new Date().toLocaleString('id-ID')}`);
    lines.push('');

    lines.push('--- RINGKASAN KEUANGAN ---');
    lines.push('Metrik,Nilai');
    lines.push(`Total Pendapatan Bersih (Nett),${data.financials.totalRevenue}`);
    lines.push(`Total Penjualan Kotor,${data.summary.totalGrossSales}`);
    lines.push(`Total Diskon,${data.summary.totalDiscount}`);
    lines.push(`Total Pajak,${data.summary.totalTax}`);
    lines.push(`Harga Pokok Penjualan (HPP),${data.financials.totalCostOfGoods}`);
    lines.push(`Laba Kotor,${data.financials.grossProfit}`);
    lines.push(`Margin Laba (%),${data.financials.profitMarginPercent.toFixed(2)}%`);
    lines.push(`Total Transaksi,${data.summary.totalTransactions}`);
    lines.push(`Rata-rata Transaksi,${Math.round(data.summary.averageTransactionValue)}`);
    lines.push('');

    lines.push('--- PERFORMANSA PRODUK ---');
    lines.push('Nama Produk,SKU,Jumlah Terjual,Total Omset,Total HPP,Total Laba');
    data.topProducts.forEach((p) => {
      lines.push(
        `"${p.productName.replace(/"/g, '""')}","${p.productSku}",${p.totalQuantity},${p.totalRevenue},${p.totalCost},${p.totalProfit}`
      );
    });
    lines.push('');

    lines.push('--- PERFORMANSA KATEGORI ---');
    lines.push('Nama Kategori,Jumlah Terjual,Total Pendapatan');
    data.categoryPerformance.forEach((c) => {
      lines.push(`"${c.categoryName.replace(/"/g, '""')}",${c.totalQuantity},${c.totalRevenue}`);
    });
    lines.push('');

    lines.push('--- METODE PEMBAYARAN ---');
    lines.push('Metode Pembayaran,Jumlah Transaksi,Total Nominal');
    data.paymentMethods.forEach((pm) => {
      const label = PAYMENT_METHOD_LABELS[pm.method] || pm.method;
      lines.push(`"${label}",${pm.count},${pm.amount}`);
    });

    const csvString = lines.join('\n');
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Laporan_Penjualan_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const paymentChartData = data?.paymentMethods.map((pm) => ({
    name: PAYMENT_METHOD_LABELS[pm.method] || pm.method,
    value: pm.amount,
    count: pm.count,
  })) || [];

  const categoryChartData = data?.categoryPerformance.map((c) => ({
    name: c.categoryName,
    revenue: c.totalRevenue,
    qty: c.totalQuantity,
  })) || [];

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="size-7 text-indigo-600 dark:text-indigo-400" />
            Laporan & Analitik Penjualan
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pantau performa penjualan, margin keuangan, dan statistik produk secara real-time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5"
          >
            <RefreshCw className={`size-4 ${isFetching ? 'animate-spin' : ''}`} />
            Segarkan
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleExportCSV}
            disabled={!data || isLoading}
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Download className="size-4" />
            Ekspor CSV
          </Button>
        </div>
      </div>

      {/* Date Filter & Presets */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Calendar className="size-4 text-indigo-500" />
          Filter Rentang Tanggal
        </div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground font-medium">Dari:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground font-medium">Sampai:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setPresetDate('all')}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                Reset Filter
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-medium mr-1">Preset:</span>
            <Button variant="outline" size="xs" onClick={() => setPresetDate('today')}>
              Hari Ini
            </Button>
            <Button variant="outline" size="xs" onClick={() => setPresetDate('7days')}>
              7 Hari
            </Button>
            <Button variant="outline" size="xs" onClick={() => setPresetDate('30days')}>
              30 Hari
            </Button>
            <Button variant="outline" size="xs" onClick={() => setPresetDate('thisMonth')}>
              Bulan Ini
            </Button>
            <Button variant="outline" size="xs" onClick={() => setPresetDate('all')}>
              Semua
            </Button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex items-center justify-between text-destructive text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-5 shrink-0" />
            <span>{error?.message || 'Gagal memuat data laporan.'}</span>
          </div>
          <Button variant="outline" size="xs" onClick={() => refetch()}>
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-muted/60" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-72 rounded-xl bg-muted/60" />
            <div className="h-72 rounded-xl bg-muted/60" />
          </div>
        </div>
      )}

      {/* Content when data is loaded */}
      {!isLoading && data && (
        <>
          {/* Key Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Revenue */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs transition-all hover:border-indigo-200 dark:hover:border-indigo-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total Pendapatan
                </span>
                <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/60 p-2 text-indigo-600 dark:text-indigo-400">
                  <DollarSign className="size-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(data.financials.totalRevenue)}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>Kotor: {formatCurrency(data.summary.totalGrossSales)}</span>
                </div>
              </div>
            </div>

            {/* Gross Profit & Margin */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs transition-all hover:border-emerald-200 dark:hover:border-emerald-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Laba Kotor
                </span>
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/60 p-2 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="size-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(data.financials.grossProfit)}
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <Percent className="size-3.5" />
                  <span>{data.financials.profitMarginPercent.toFixed(1)}% Margin Profit</span>
                </div>
              </div>
            </div>

            {/* Total Transactions */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs transition-all hover:border-amber-200 dark:hover:border-amber-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total Transaksi
                </span>
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/60 p-2 text-amber-600 dark:text-amber-400">
                  <ShoppingBag className="size-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-foreground">
                  {data.summary.totalTransactions.toLocaleString('id-ID')}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Rata-rata: {formatCurrency(data.summary.averageTransactionValue)}
                </div>
              </div>
            </div>

            {/* HPP (Cost of Goods) */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs transition-all hover:border-rose-200 dark:hover:border-rose-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total HPP (Modal)
                </span>
                <div className="rounded-lg bg-rose-50 dark:bg-rose-950/60 p-2 text-rose-600 dark:text-rose-400">
                  <CreditCard className="size-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(data.financials.totalCostOfGoods)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Diskon: {formatCurrency(data.summary.totalDiscount)}
                </div>
              </div>
            </div>
          </div>

          {/* Visual Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Performance Chart */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Layers className="size-4 text-indigo-500" />
                    Omset Berdasarkan Kategori
                  </h2>
                  <p className="text-xs text-muted-foreground">Total nilai penjualan per kategori produk</p>
                </div>
              </div>
              <div className="h-72 w-full mt-2">
                {categoryChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => `Rp${(v / 1000).toLocaleString('id-ID')}k`}
                      />
                      <Tooltip
                        formatter={(val: any) => [formatCurrency(Number(val) || 0), 'Omset']}
                        contentStyle={{
                          backgroundColor: 'var(--color-card, #ffffff)',
                          borderColor: 'var(--color-border, #e2e8f0)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} name="Omset" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                    Belum ada data penjualan pada periode ini.
                  </div>
                )}
              </div>
            </div>

            {/* Payment Method Chart */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <PieChartIcon className="size-4 text-emerald-500" />
                    Distribusi Metode Pembayaran
                  </h2>
                  <p className="text-xs text-muted-foreground">Proporsi nominal transaksi per metode</p>
                </div>
              </div>
              <div className="h-72 w-full mt-2 flex items-center justify-center">
                {paymentChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        innerRadius={45}
                        paddingAngle={4}
                        label={({ name, percent }: any) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                      >
                        {paymentChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => [formatCurrency(Number(val) || 0), 'Total']}
                        contentStyle={{
                          backgroundColor: 'var(--color-card, #ffffff)',
                          borderColor: 'var(--color-border, #e2e8f0)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Belum ada data transaksi pada periode ini.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <FileText className="size-4 text-indigo-600 dark:text-indigo-400" />
                Rincian Laporan Keuangan
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                  <tr>
                    <th className="py-3 px-4">Komponen Keuangan</th>
                    <th className="py-3 px-4 text-right">Jumlah (Rp)</th>
                    <th className="py-3 px-4 text-right">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  <tr className="hover:bg-muted/20">
                    <td className="py-3 px-4 font-medium">Penjualan Kotor (Gross Sales)</td>
                    <td className="py-3 px-4 text-right font-mono">{formatCurrency(data.summary.totalGrossSales)}</td>
                    <td className="py-3 px-4 text-right text-xs text-muted-foreground">Total sebelum diskon & pajak</td>
                  </tr>
                  <tr className="hover:bg-muted/20">
                    <td className="py-3 px-4 font-medium text-rose-600 dark:text-rose-400">- Total Diskon</td>
                    <td className="py-3 px-4 text-right font-mono text-rose-600 dark:text-rose-400">
                      -{formatCurrency(data.summary.totalDiscount)}
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-muted-foreground">Potongan harga produk/transaksi</td>
                  </tr>
                  <tr className="hover:bg-muted/20">
                    <td className="py-3 px-4 font-medium text-amber-600 dark:text-amber-400">+ Total Pajak</td>
                    <td className="py-3 px-4 text-right font-mono text-amber-600 dark:text-amber-400">
                      +{formatCurrency(data.summary.totalTax)}
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-muted-foreground">Pajak yang dikumpulkan</td>
                  </tr>
                  <tr className="bg-indigo-50/50 dark:bg-indigo-950/20 font-semibold">
                    <td className="py-3.5 px-4 text-indigo-900 dark:text-indigo-200">= Pendapatan Bersih (Net Revenue)</td>
                    <td className="py-3.5 px-4 text-right font-mono text-indigo-900 dark:text-indigo-200">
                      {formatCurrency(data.financials.totalRevenue)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-xs text-indigo-700 dark:text-indigo-300">Total penerimaan bersih</td>
                  </tr>
                  <tr className="hover:bg-muted/20">
                    <td className="py-3 px-4 font-medium text-rose-600 dark:text-rose-400">- HPP (Harga Pokok Penjualan)</td>
                    <td className="py-3 px-4 text-right font-mono text-rose-600 dark:text-rose-400">
                      -{formatCurrency(data.financials.totalCostOfGoods)}
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-muted-foreground">Total biaya modal produk terjual</td>
                  </tr>
                  <tr className="bg-emerald-50/50 dark:bg-emerald-950/20 font-bold text-emerald-950 dark:text-emerald-100">
                    <td className="py-3.5 px-4 flex items-center gap-1.5">
                      <ArrowUpRight className="size-4 text-emerald-600 dark:text-emerald-400" />
                      = Laba Kotor (Gross Profit)
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono">
                      {formatCurrency(data.financials.grossProfit)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-xs font-normal text-emerald-700 dark:text-emerald-300">
                      Margin Profit: {data.financials.profitMarginPercent.toFixed(2)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Selling Products Breakdown */}
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Performa Produk Terlaris</h2>
                <p className="text-xs text-muted-foreground">Urutan produk berdasarkan kuantitas terjual</p>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {data.topProducts.length} Produk Terjual
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                  <tr>
                    <th className="py-3 px-4">Produk</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4 text-center">Terjual</th>
                    <th className="py-3 px-4 text-right">Total Omset</th>
                    <th className="py-3 px-4 text-right">Total HPP</th>
                    <th className="py-3 px-4 text-right">Laba bersih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {data.topProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-xs text-muted-foreground">
                        Tidak ada data produk pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    data.topProducts.map((p, idx) => (
                      <tr key={p.productId || idx} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 font-medium text-foreground">{p.productName}</td>
                        <td className="py-3 px-4 text-xs font-mono text-muted-foreground">{p.productSku || '-'}</td>
                        <td className="py-3 px-4 text-center font-semibold text-indigo-600 dark:text-indigo-400">
                          {p.totalQuantity}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">{formatCurrency(p.totalRevenue)}</td>
                        <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                          {formatCurrency(p.totalCost)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(p.totalProfit)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Category & Payment Breakdown Grids */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category breakdown */}
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
              <div className="p-4 border-b border-border bg-muted/30">
                <h2 className="text-base font-semibold text-foreground">Rincian Penjualan Kategori</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-3 px-4">Kategori</th>
                      <th className="py-3 px-4 text-center">Terjual</th>
                      <th className="py-3 px-4 text-right">Total Omset</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-foreground">
                    {data.categoryPerformance.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-xs text-muted-foreground">
                          Belum ada data kategori.
                        </td>
                      </tr>
                    ) : (
                      data.categoryPerformance.map((c) => (
                        <tr key={c.categoryId} className="hover:bg-muted/20">
                          <td className="py-3 px-4 font-medium">{c.categoryName}</td>
                          <td className="py-3 px-4 text-center text-muted-foreground">{c.totalQuantity} item</td>
                          <td className="py-3 px-4 text-right font-mono font-medium">
                            {formatCurrency(c.totalRevenue)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment method breakdown */}
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
              <div className="p-4 border-b border-border bg-muted/30">
                <h2 className="text-base font-semibold text-foreground">Rincian Metode Pembayaran</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-3 px-4">Metode</th>
                      <th className="py-3 px-4 text-center">Jumlah Transaksi</th>
                      <th className="py-3 px-4 text-right">Total Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-foreground">
                    {data.paymentMethods.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-xs text-muted-foreground">
                          Belum ada data pembayaran.
                        </td>
                      </tr>
                    ) : (
                      data.paymentMethods.map((pm) => (
                        <tr key={pm.method} className="hover:bg-muted/20">
                          <td className="py-3 px-4 font-medium">
                            {PAYMENT_METHOD_LABELS[pm.method] || pm.method}
                          </td>
                          <td className="py-3 px-4 text-center text-muted-foreground">{pm.count}x</td>
                          <td className="py-3 px-4 text-right font-mono font-medium">
                            {formatCurrency(pm.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
