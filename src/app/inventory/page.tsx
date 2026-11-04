'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Package,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  History,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  AlertCircle,
  Boxes,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Sliders,
  CheckCircle2,
  Layers
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  isActive: boolean;
  category?: Category;
}

interface StockMovement {
  id: string;
  productId: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'SALE' | 'RETURN';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string | null;
  referenceNumber?: string | null;
  createdAt: string;
  product: {
    id: string;
    name: string;
    sku: string;
    barcode?: string | null;
  };
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface ProductsApiResponse {
  success: boolean;
  data: Product[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface MovementsApiResponse {
  success: boolean;
  data: StockMovement[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function InventoryPage() {
  const queryClient = useQueryClient();

  // Active tab: 'stock' | 'movements'
  const [activeTab, setActiveTab] = useState<'stock' | 'movements'>('stock');

  // Stock Tab Filters
  const [stockSearch, setStockSearch] = useState('');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [stockPage, setStockPage] = useState(1);

  // Movements Tab Filters
  const [movementSearch, setMovementSearch] = useState('');
  const [movementTypeFilter, setMovementTypeFilter] = useState('');
  const [movementPage, setMovementPage] = useState(1);

  // Modal Adjustment State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [adjustType, setAdjustType] = useState<'IN' | 'OUT' | 'ADJUSTMENT'>('IN');
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustRef, setAdjustRef] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  // Fetch Products
  const { data: productsResponse, isLoading: isLoadingProducts } = useQuery<ProductsApiResponse>({
    queryKey: ['products', stockSearch, stockPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (stockSearch) params.set('search', stockSearch);
      params.set('page', stockPage.toString());
      params.set('limit', '10');
      const res = await fetch(`/api/products?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Gagal memuat produk');
      return json;
    },
  });

  // Fetch All Products for Adjustment Modal & Summary
  const { data: allProducts = [] } = useQuery<Product[]>({
    queryKey: ['all-products-for-inventory'],
    queryFn: async () => {
      const res = await fetch('/api/products?limit=1000');
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Gagal memuat daftar produk');
      return json.data;
    },
  });

  // Fetch Stock Movements
  const {
    data: movementsResponse,
    isLoading: isLoadingMovements,
    refetch: refetchMovements,
  } = useQuery<MovementsApiResponse>({
    queryKey: ['inventory-movements', movementSearch, movementTypeFilter, movementPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (movementSearch) params.set('search', movementSearch);
      if (movementTypeFilter) params.set('type', movementTypeFilter);
      params.set('page', movementPage.toString());
      params.set('limit', '10');
      const res = await fetch(`/api/inventory/movements?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Gagal memuat riwayat mutasi');
      return json;
    },
  });

  // Stock Adjustment Mutation
  const adjustMutation = useMutation({
    mutationFn: async (payload: {
      productId: string;
      type: 'IN' | 'OUT' | 'ADJUSTMENT';
      quantity: number;
      reason?: string;
      referenceNumber?: string;
    }) => {
      const res = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Gagal menyesuaikan stok');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['all-products-for-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      closeModal();
    },
    onError: (err: Error) => {
      setModalError(err.message);
    },
  });

  // Summary Computations
  const totalProductsCount = allProducts.length;
  const lowStockProducts = allProducts.filter((p) => p.stock <= p.minStock);
  const lowStockCount = lowStockProducts.length;
  const totalStockUnits = allProducts.reduce((acc, p) => acc + p.stock, 0);
  const totalStockCostValue = allProducts.reduce(
    (acc, p) => acc + p.stock * Number(p.costPrice),
    0
  );

  // Selected Product detail for modal
  const selectedProduct = allProducts.find((p) => p.id === selectedProductId);

  const openAdjustModal = (productId?: string) => {
    setSelectedProductId(productId || (allProducts[0]?.id ?? ''));
    setAdjustType('IN');
    setAdjustQuantity('');
    setAdjustReason('');
    setAdjustRef('');
    setModalError(null);
    setIsAdjustModalOpen(true);
  };

  const closeModal = () => {
    setIsAdjustModalOpen(false);
    setModalError(null);
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!selectedProductId) {
      setModalError('Silakan pilih produk terlebih dahulu');
      return;
    }

    const qtyNum = parseInt(adjustQuantity, 10);
    if (isNaN(qtyNum)) {
      setModalError('Jumlah stok harus berupa angka bulat');
      return;
    }

    if (adjustType === 'IN' && qtyNum <= 0) {
      setModalError('Jumlah stok masuk harus lebih dari 0');
      return;
    }

    if (adjustType === 'OUT' && qtyNum <= 0) {
      setModalError('Jumlah stok keluar harus lebih dari 0');
      return;
    }

    if (adjustType === 'ADJUSTMENT' && qtyNum < 0) {
      setModalError('Stok baru tidak boleh negatif');
      return;
    }

    adjustMutation.mutate({
      productId: selectedProductId,
      type: adjustType,
      quantity: qtyNum,
      reason: adjustReason.trim() || undefined,
      referenceNumber: adjustRef.trim() || undefined,
    });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  const displayedProducts = (productsResponse?.data || []).filter((p) => {
    if (onlyLowStock) return p.stock <= p.minStock;
    return true;
  });

  const movementsList = movementsResponse?.data || [];
  const movementPagination = movementsResponse?.pagination;

  // Calculate prospective stock for live modal calculation
  const calculateNewStockPreview = () => {
    if (!selectedProduct) return null;
    const current = selectedProduct.stock;
    const qty = parseInt(adjustQuantity, 10);
    if (isNaN(qty)) return current;
    if (adjustType === 'IN') return current + Math.abs(qty);
    if (adjustType === 'OUT') return Math.max(0, current - Math.abs(qty));
    if (adjustType === 'ADJUSTMENT') return Math.max(0, qty);
    return current;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Boxes className="w-7 h-7 text-indigo-600" /> Manajemen Stok & Inventaris
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Pantau sisa stok barang, peringatan stok menipis, dan riwayat mutasi stok
            </p>
          </div>
        </div>

        <button
          onClick={() => openAdjustModal()}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Penyesuaian Stok Manual
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Produk</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalProductsCount}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Item terdaftar di sistem</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div
          onClick={() => {
            setActiveTab('stock');
            setOnlyLowStock((prev) => !prev);
          }}
          className={`p-5 rounded-2xl border shadow-sm flex items-center justify-between cursor-pointer transition-all ${
            onlyLowStock
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Stok Menipis</p>
              {lowStockCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              )}
            </div>
            <h3 className="text-2xl font-bold text-amber-900 mt-1">{lowStockCount}</h3>
            <p className="text-[11px] text-amber-700 mt-1 font-medium">
              {onlyLowStock ? 'Filter aktif (klik untuk reset)' : 'Klik untuk melihat detail'}
            </p>
          </div>
          <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Unit Stok</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalStockUnits.toLocaleString('id-ID')}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Total fisik barang di gudang</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nilai Modal Stok</p>
            <h3 className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(totalStockCostValue)}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Aset persediaan modal</p>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
            <Sliders className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs & Navigation */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('stock')}
          className={`pb-3 px-4 font-bold text-sm transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'stock'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" /> Daftar Stok Produk
          {lowStockCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded-full font-extrabold">
              {lowStockCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('movements')}
          className={`pb-3 px-4 font-bold text-sm transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'movements'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" /> Riwayat Mutasi Stok
        </button>
      </div>

      {/* TAB 1: STOCK & ALERTS */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1 max-w-xl">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama atau SKU produk..."
                  value={stockSearch}
                  onChange={(e) => {
                    setStockSearch(e.target.value);
                    setStockPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                />
              </div>

              <button
                onClick={() => setOnlyLowStock(!onlyLowStock)}
                className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                  onlyLowStock
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Hanya Stok Menipis ({lowStockCount})
              </button>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {isLoadingProducts ? (
              <div className="p-16 text-center flex flex-col items-center gap-3">
                <Loader2 className="w-9 h-9 animate-spin text-indigo-600" />
                <p className="text-slate-500 text-sm font-medium">Memuat data produk & stok...</p>
              </div>
            ) : displayedProducts.length === 0 ? (
              <div className="p-16 text-center flex flex-col items-center gap-2">
                <Package className="w-12 h-12 text-slate-300" />
                <h3 className="text-slate-700 font-bold">Tidak ada produk ditemukan</h3>
                <p className="text-slate-400 text-xs">
                  {onlyLowStock
                    ? 'Tidak ada produk dengan stok menipis saat ini.'
                    : 'Tidak ada data produk yang cocok dengan kriteria.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-4 px-6">Produk & SKU</th>
                      <th className="py-4 px-6">Kategori</th>
                      <th className="py-4 px-6 text-right">Harga Modal</th>
                      <th className="py-4 px-6 text-center">Stok Fisik</th>
                      <th className="py-4 px-6 text-center">Batas Min. Stok</th>
                      <th className="py-4 px-6 text-center">Status Stok</th>
                      <th className="py-4 px-6 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedProducts.map((product) => {
                      const isOut = product.stock === 0;
                      const isLow = product.stock <= product.minStock;
                      return (
                        <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-6">
                            <div className="font-bold text-slate-900">{product.name}</div>
                            <div className="text-xs font-mono text-slate-500 mt-0.5">{product.sku}</div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold">
                              {product.category?.name || 'Tanpa Kategori'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right font-mono text-xs text-slate-600">
                            {formatCurrency(Number(product.costPrice))}
                          </td>
                          <td className="py-4 px-6 text-center font-mono font-bold text-sm text-slate-900">
                            {product.stock}
                          </td>
                          <td className="py-4 px-6 text-center font-mono text-xs text-slate-500">
                            {product.minStock}
                          </td>
                          <td className="py-4 px-6 text-center">
                            {isOut ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                                <AlertCircle className="w-3 h-3" /> Stok Habis
                              </span>
                            ) : isLow ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                <AlertTriangle className="w-3 h-3" /> Stok Menipis
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" /> Stok Aman
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => openAdjustModal(product.id)}
                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg transition-all border border-indigo-200 cursor-pointer"
                            >
                              Penyesuaian Stok
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: STOCK MOVEMENTS HISTORY */}
      {activeTab === 'movements' && (
        <div className="space-y-4">
          {/* Movement Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1 max-w-2xl">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari produk, alasan, atau no referensi..."
                  value={movementSearch}
                  onChange={(e) => {
                    setMovementSearch(e.target.value);
                    setMovementPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                />
              </div>

              <div className="relative w-full sm:w-52">
                <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  value={movementTypeFilter}
                  onChange={(e) => {
                    setMovementTypeFilter(e.target.value);
                    setMovementPage(1);
                  }}
                  className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all text-slate-700 font-medium cursor-pointer appearance-none"
                >
                  <option value="">Semua Tipe Mutasi</option>
                  <option value="IN">Stok Masuk (IN)</option>
                  <option value="OUT">Stok Keluar (OUT)</option>
                  <option value="ADJUSTMENT">Penyesuaian (ADJUSTMENT)</option>
                  <option value="SALE">Penjualan Kasir (SALE)</option>
                  <option value="RETURN">Retur (RETURN)</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => refetchMovements()}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold px-3 py-2 rounded-lg hover:bg-indigo-50 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Data
            </button>
          </div>

          {/* Movements Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {isLoadingMovements ? (
              <div className="p-16 text-center flex flex-col items-center gap-3">
                <Loader2 className="w-9 h-9 animate-spin text-indigo-600" />
                <p className="text-slate-500 text-sm font-medium">Memuat riwayat mutasi stok...</p>
              </div>
            ) : movementsList.length === 0 ? (
              <div className="p-16 text-center flex flex-col items-center gap-2">
                <History className="w-12 h-12 text-slate-300" />
                <h3 className="text-slate-700 font-bold">Belum ada riwayat mutasi</h3>
                <p className="text-slate-400 text-xs">
                  Semua pencatatan perubahan stok akan muncul secara detail di sini.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-4 px-6">Waktu & User</th>
                      <th className="py-4 px-6">Produk</th>
                      <th className="py-4 px-6 text-center">Tipe Mutasi</th>
                      <th className="py-4 px-6 text-center">Stok Awal</th>
                      <th className="py-4 px-6 text-center">Perubahan</th>
                      <th className="py-4 px-6 text-center">Stok Akhir</th>
                      <th className="py-4 px-6">Alasan & Referensi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {movementsList.map((m) => {
                      const isPositive = m.quantity > 0;
                      return (
                        <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-6">
                            <div className="text-xs font-bold text-slate-800">{formatDateTime(m.createdAt)}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">Oleh: {m.user.name}</div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-bold text-slate-900 text-sm">{m.product.name}</div>
                            <div className="text-xs font-mono text-slate-400">{m.product.sku}</div>
                          </td>
                          <td className="py-4 px-6 text-center">
                            {m.type === 'IN' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold">
                                <ArrowDownLeft className="w-3.5 h-3.5" /> Stok Masuk
                              </span>
                            )}
                            {m.type === 'OUT' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold">
                                <ArrowUpRight className="w-3.5 h-3.5" /> Stok Keluar
                              </span>
                            )}
                            {m.type === 'ADJUSTMENT' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold">
                                <Sliders className="w-3.5 h-3.5" /> Penyesuaian
                              </span>
                            )}
                            {m.type === 'SALE' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold">
                                Penjualan
                              </span>
                            )}
                            {m.type === 'RETURN' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold">
                                Retur
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-center font-mono text-xs text-slate-600">
                            {m.previousStock}
                          </td>
                          <td className="py-4 px-6 text-center font-mono font-bold text-xs">
                            <span className={isPositive ? 'text-emerald-600' : m.quantity < 0 ? 'text-rose-600' : 'text-slate-600'}>
                              {isPositive ? `+${m.quantity}` : m.quantity}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center font-mono font-bold text-sm text-slate-900">
                            {m.newStock}
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-600">
                            <div>{m.reason || '-'}</div>
                            {m.referenceNumber && (
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                Ref: {m.referenceNumber}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Footer */}
            {movementPagination && movementPagination.totalPages > 1 && (
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                <div>
                  Menampilkan Halaman <span className="font-bold text-slate-900">{movementPagination.page}</span> dari{' '}
                  <span className="font-bold text-slate-900">{movementPagination.totalPages}</span> ({movementPagination.total} total mutasi)
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMovementPage((p) => Math.max(1, p - 1))}
                    disabled={movementPagination.page <= 1}
                    className="p-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-all cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setMovementPage((p) => Math.min(movementPagination.totalPages, p + 1))}
                    disabled={movementPagination.page >= movementPagination.totalPages}
                    className="p-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-all cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: STOCK ADJUSTMENT */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-indigo-600" /> Penyesuaian Stok Manual
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tambah, kurangi, atau set ulang jumlah stok barang fisik
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleAdjustSubmit} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-600 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {modalError}
                </div>
              )}

              {/* Select Product */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Pilih Produk <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all text-slate-800 font-medium cursor-pointer"
                >
                  <option value="" disabled>
                    -- Pilih Produk --
                  </option>
                  {allProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) - Stok Saat Ini: {p.stock}
                    </option>
                  ))}
                </select>
              </div>

              {/* Adjustment Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Jenis Perubahan <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('IN')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      adjustType === 'IN'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" /> Stok Masuk
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('OUT')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      adjustType === 'OUT'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" /> Stok Keluar
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('ADJUSTMENT')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      adjustType === 'ADJUSTMENT'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" /> Set Ulang
                  </button>
                </div>
              </div>

              {/* Quantity Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {adjustType === 'IN'
                    ? 'Jumlah Stok Bertambah'
                    : adjustType === 'OUT'
                    ? 'Jumlah Stok Berkurang'
                    : 'Jumlah Stok Akhir Baru'}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                />
              </div>

              {/* Live Preview Box */}
              {selectedProduct && (
                <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Estimasi Hasil Stok:</span>
                  <div className="font-mono font-bold flex items-center gap-2">
                    <span className="text-slate-600">{selectedProduct.stock}</span>
                    <span className="text-slate-400">→</span>
                    <span className="text-indigo-700 text-sm">{calculateNewStockPreview()} unit</span>
                  </div>
                </div>
              )}

              {/* Reason */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Alasan Penyesuaian (Opsional)
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Contoh: Barang Rusak, Stock Opname, Restock Supplier"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                />
              </div>

              {/* Reference Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Nomor Referensi / Surat Jalan (Opsional)
                </label>
                <input
                  type="text"
                  value={adjustRef}
                  onChange={(e) => setAdjustRef(e.target.value)}
                  placeholder="Contoh: SJ-202310-001"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-mono"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 text-slate-700 font-bold text-sm bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={adjustMutation.isPending}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {adjustMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Simpan Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
