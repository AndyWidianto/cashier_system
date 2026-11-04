'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Calendar,
  RefreshCw,
  Eye,
  Printer,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Banknote,
  QrCode,
  Receipt,
  X,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  ShoppingBag,
  User,
  DollarSign
} from 'lucide-react';

interface TransactionItemData {
  id: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number | string;
  costPrice: number | string;
  subtotal: number | string;
}

interface TransactionUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface TransactionCustomer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
}

interface TransactionData {
  id: string;
  invoiceNumber: string;
  userId: string;
  user?: TransactionUser;
  customerId?: string | null;
  customer?: TransactionCustomer | null;
  totalAmount: number | string;
  discountAmount: number | string;
  taxAmount: number | string;
  finalAmount: number | string;
  paidAmount: number | string;
  changeAmount: number | string;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'QRIS' | 'DEBIT_CARD';
  status: 'COMPLETED' | 'CANCELLED' | 'PENDING';
  notes?: string | null;
  createdAt: string;
  items: TransactionItemData[];
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [search, setSearch] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);

  // Selected transaction for details modal
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionData | null>(null);

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (paymentMethod) params.set('paymentMethod', paymentMethod);
      if (status) params.set('status', status);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      params.set('page', page.toString());
      params.set('limit', limit.toString());

      const res = await fetch(`/api/transactions?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Gagal mengambil data transaksi');
      }

      setTransactions(json.data || []);
      if (json.pagination) {
        setPagination(json.pagination);
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan jaringan');
    } finally {
      setIsLoading(false);
    }
  }, [search, paymentMethod, status, startDate, endDate, page, limit]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const formatCurrency = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num || 0);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setPaymentMethod('');
    setStatus('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const renderPaymentBadge = (method: TransactionData['paymentMethod']) => {
    switch (method) {
      case 'CASH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Banknote className="w-3.5 h-3.5" /> Tunai
          </span>
        );
      case 'QRIS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <QrCode className="w-3.5 h-3.5" /> QRIS
          </span>
        );
      case 'DEBIT_CARD':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <CreditCard className="w-3.5 h-3.5" /> Debit Card
          </span>
        );
      case 'BANK_TRANSFER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Receipt className="w-3.5 h-3.5" /> Transfer
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {method}
          </span>
        );
    }
  };

  const renderStatusBadge = (txStatus: TransactionData['status']) => {
    switch (txStatus) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Selesai
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
            <XCircle className="w-3.5 h-3.5 text-rose-600" /> Dibatalkan
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
            {txStatus}
          </span>
        );
    }
  };

  // Calculate stats for current loaded view
  const stats = useMemo(() => {
    const totalSales = transactions.reduce((acc, curr) => acc + Number(curr.finalAmount), 0);
    const completedCount = transactions.filter((t) => t.status === 'COMPLETED').length;
    return {
      count: pagination.total || transactions.length,
      totalSales,
      completedCount
    };
  }, [transactions, pagination.total]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/pos"
            className="p-2.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            title="Kembali ke Kasir POS"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-7 h-7 text-indigo-600" /> Riwayat Transaksi
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola dan pantau seluruh catatan transaksi penjualan kasir
            </p>
        </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchTransactions}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50 shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh Data
          </button>
          <Link
            href="/pos"
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-md shadow-indigo-100"
          >
            <ShoppingBag className="w-4 h-4" /> Buka POS Kasir
          </Link>
        </div>
      </div>

      {/* Metric Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Total Transaksi Found</p>
            <p className="text-xl font-extrabold text-slate-900 mt-1">{stats.count}</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Total Omset (Halaman Ini)</p>
            <p className="text-xl font-extrabold text-indigo-600 mt-1">
              {formatCurrency(stats.totalSales)}
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Transaksi Selesai</p>
            <p className="text-xl font-extrabold text-emerald-700 mt-1">{stats.completedCount}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
            <Filter className="w-4 h-4 text-indigo-600" /> Filter & Pencarian
          </div>
          {(search || paymentMethod || status || startDate || endDate) && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-medium text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Reset Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Search by Invoice / Customer */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari faktur / pelanggan..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Payment Method Filter */}
          <div>
            <select
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all text-slate-700 font-medium"
            >
              <option value="">Semua Metode Pembayaran</option>
              <option value="CASH">Tunai (CASH)</option>
              <option value="QRIS">QRIS</option>
              <option value="DEBIT_CARD">Debit Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all text-slate-700 font-medium"
            >
              <option value="">Semua Status</option>
              <option value="COMPLETED">Selesai (COMPLETED)</option>
              <option value="PENDING">Pending</option>
              <option value="CANCELLED">Dibatalkan</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="relative flex items-center">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full pl-8 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all text-slate-700 font-medium"
            />
          </div>

          {/* End Date */}
          <div className="relative flex items-center">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full pl-8 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all text-slate-700 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Transactions Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-500">Memuat data transaksi...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm font-semibold text-rose-600">{error}</p>
            <button
              onClick={fetchTransactions}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">Tidak Ada Transaksi</h3>
            <p className="text-xs text-slate-400">
              Tidak ada transaksi yang cocok dengan kata kunci atau filter saat ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">No. Faktur</th>
                  <th className="py-3.5 px-4">Waktu</th>
                  <th className="py-3.5 px-4">Kasir</th>
                  <th className="py-3.5 px-4">Pelanggan</th>
                  <th className="py-3.5 px-4">Metode</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Total Tagihan</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 whitespace-nowrap">
                      {tx.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {formatDate(tx.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {tx.user?.name || 'Kasir'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {tx.customer?.name ? (
                        <span className="font-semibold text-slate-800">{tx.customer.name}</span>
                      ) : (
                        <span className="text-slate-400 italic">Umum</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderPaymentBadge(tx.paymentMethod)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderStatusBadge(tx.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 whitespace-nowrap">
                      {formatCurrency(tx.finalAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => setSelectedTransaction(tx)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!isLoading && transactions.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>Baris per halaman:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(parseInt(e.target.value, 10));
                  setPage(1);
                }}
                className="px-2 py-1 bg-white border border-slate-200 rounded-md font-medium text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="text-slate-500 ml-2">
                Menampilkan {(pagination.page - 1) * pagination.limit + 1} -{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} dari{' '}
                {pagination.total} transaksi
              </span>
            </div>

            <div className="flex items-center gap-2 font-medium">
              <span>
                Halaman {pagination.page} dari {pagination.totalPages || 1}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:hover:bg-white transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:hover:bg-white transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 my-8">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-indigo-600" /> Detail Transaksi
                </h3>
                <p className="text-xs font-mono text-slate-500 mt-0.5">
                  {selectedTransaction.invoiceNumber}
                </p>
              </div>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Meta Info Grid */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl text-xs border border-slate-100">
              <div>
                <span className="text-slate-400 font-medium block">Waktu Transaksi</span>
                <span className="font-bold text-slate-800">{formatDate(selectedTransaction.createdAt)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Kasir</span>
                <span className="font-bold text-slate-800">{selectedTransaction.user?.name || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Pelanggan</span>
                <span className="font-bold text-slate-800">{selectedTransaction.customer?.name || 'Umum'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Status & Metode</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {renderStatusBadge(selectedTransaction.status)}
                  {renderPaymentBadge(selectedTransaction.paymentMethod)}
                </div>
              </div>
            </div>

            {/* Item Breakdown Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Item Pembelian ({selectedTransaction.items.length})
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="p-2.5">Produk</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Harga</th>
                      <th className="p-2.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {selectedTransaction.items.map((item) => (
                      <tr key={item.id}>
                        <td className="p-2.5">
                          <div className="font-bold text-slate-800">{item.productName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">SKU: {item.productSku}</div>
                        </td>
                        <td className="p-2.5 text-center font-bold text-slate-800">{item.quantity}</td>
                        <td className="p-2.5 text-right text-slate-600">{formatCurrency(item.unitPrice)}</td>
                        <td className="p-2.5 text-right font-bold text-slate-900">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Calculations & Notes */}
            <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium text-slate-800">{formatCurrency(selectedTransaction.totalAmount)}</span>
              </div>
              {Number(selectedTransaction.discountAmount) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Diskon</span>
                  <span>- {formatCurrency(selectedTransaction.discountAmount)}</span>
                </div>
              )}
              {Number(selectedTransaction.taxAmount) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Pajak</span>
                  <span>+ {formatCurrency(selectedTransaction.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-sm text-slate-900 pt-1.5 border-t border-slate-200">
                <span>Total Akhir</span>
                <span className="text-indigo-600">{formatCurrency(selectedTransaction.finalAmount)}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span>Jumlah Dibayar</span>
                <span className="font-medium text-slate-800">{formatCurrency(selectedTransaction.paidAmount)}</span>
              </div>
              <div className="flex justify-between font-semibold text-emerald-600">
                <span>Kembalian</span>
                <span>{formatCurrency(selectedTransaction.changeAmount)}</span>
              </div>
            </div>

            {selectedTransaction.notes && (
              <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl text-xs space-y-0.5">
                <span className="font-bold text-amber-800">Catatan:</span>
                <p className="text-amber-900">{selectedTransaction.notes}</p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" /> Cetak Struk
              </button>
              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer text-center"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
