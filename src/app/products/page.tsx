'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  ArrowLeft,
  RefreshCw,
  X,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Tag,
  Barcode,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

interface Product {
  id: string;
  categoryId: string;
  category?: Category;
  name: string;
  slug: string;
  sku: string;
  barcode?: string | null;
  description?: string | null;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  image?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProductFormData {
  categoryId: string;
  name: string;
  sku: string;
  barcode: string;
  description: string;
  price: string;
  costPrice: string;
  stock: string;
  minStock: string;
  isActive: boolean;
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
  message?: string;
}

const initialFormData: ProductFormData = {
  categoryId: '',
  name: '',
  sku: '',
  barcode: '',
  description: '',
  price: '',
  costPrice: '',
  stock: '0',
  minStock: '5',
  isActive: true,
};

export default function ProductsPage() {
  const queryClient = useQueryClient();

  // Filter and Pagination state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch Categories for Filter and Form
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories');
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Gagal memuat kategori');
      return json.data;
    },
  });

  // Fetch Products with Pagination and Filters
  const {
    data: productsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ProductsApiResponse>({
    queryKey: ['products', search, selectedCategory, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (selectedCategory) params.set('categoryId', selectedCategory);
      params.set('page', page.toString());
      params.set('limit', limit.toString());

      const res = await fetch(`/api/products?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Gagal memuat produk');
      return json;
    },
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Gagal membuat produk');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      closeModal();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Gagal memperbarui produk');
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      closeModal();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Gagal menghapus produk');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: Error) => alert(err.message),
  });

  // Modal Helpers
  const openCreateModal = () => {
    setModalMode('create');
    setEditingProduct(null);
    setFormData({
      ...initialFormData,
      categoryId: categories.length > 0 ? categories[0].id : '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setModalMode('edit');
    setEditingProduct(product);
    setFormData({
      categoryId: product.categoryId,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || '',
      description: product.description || '',
      price: product.price.toString(),
      costPrice: product.costPrice.toString(),
      stock: product.stock.toString(),
      minStock: product.minStock.toString(),
      isActive: product.isActive,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Nama produk wajib diisi');
      return;
    }
    if (!formData.sku.trim()) {
      setFormError('SKU wajib diisi');
      return;
    }
    if (!formData.categoryId) {
      setFormError('Kategori wajib dipilih');
      return;
    }
    if (formData.price === '' || Number(formData.price) < 0) {
      setFormError('Harga jual tidak boleh kosong atau kurang dari 0');
      return;
    }
    if (formData.costPrice === '' || Number(formData.costPrice) < 0) {
      setFormError('Harga modal tidak boleh kosong atau kurang dari 0');
      return;
    }
    if (formData.stock === '' || Number(formData.stock) < 0) {
      setFormError('Stok tidak boleh kosong atau negatif');
      return;
    }

    const payload = {
      categoryId: formData.categoryId,
      name: formData.name.trim(),
      sku: formData.sku.trim(),
      barcode: formData.barcode.trim() || null,
      description: formData.description.trim() || null,
      price: Number(formData.price),
      costPrice: Number(formData.costPrice),
      stock: Math.floor(Number(formData.stock)),
      minStock: Math.floor(Number(formData.minStock) || 5),
      isActive: formData.isActive,
    };

    if (modalMode === 'create') {
      createMutation.mutate(payload);
    } else if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, payload });
    }
  };

  const handleDelete = (product: Product) => {
    if (confirm(`Apakah Anda yakin ingin menghapus produk "${product.name}"?`)) {
      deleteMutation.mutate(product.id);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const products = productsData?.data || [];
  const pagination = productsData?.pagination;

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
              <Package className="w-7 h-7 text-indigo-600" /> Manajemen Produk
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola daftar produk, katalog harga, stok, dan kategori barang
            </p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Tambah Produk
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1 max-w-2xl">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, SKU, atau barcode..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
            />
          </div>

          {/* Category Dropdown Filter */}
          <div className="relative w-full sm:w-56">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all appearance-none text-slate-700 font-medium cursor-pointer"
            >
              <option value="">Semua Kategori</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Reset Filter Button */}
        {(search || selectedCategory) && (
          <button
            onClick={() => {
              setSearch('');
              setSelectedCategory('');
              setPage(1);
            }}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold px-3 py-2 rounded-lg hover:bg-indigo-50 transition-colors self-end md:self-auto"
          >
            Reset Filter
          </button>
        )}
      </div>

      {/* Content Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-20 text-center flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
            <p className="text-slate-500 font-medium">Memuat data produk...</p>
          </div>
        ) : isError ? (
          <div className="p-20 text-center flex flex-col items-center gap-3">
            <AlertCircle className="w-10 h-10 text-rose-500" />
            <p className="text-rose-600 font-bold">{(error as Error).message}</p>
            <button
              onClick={() => refetch()}
              className="text-sm text-indigo-600 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> Coba lagi
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center gap-2">
            <Package className="w-12 h-12 text-slate-300" />
            <h3 className="text-slate-700 font-bold">Tidak ada produk ditemukan</h3>
            <p className="text-slate-400 text-sm">
              {search || selectedCategory
                ? 'Coba ubah kata kunci pencarian atau filter kategori.'
                : 'Mulai dengan menambahkan produk baru menggunakan tombol di atas.'}
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
                  <th className="py-4 px-6 text-right">Harga Jual</th>
                  <th className="py-4 px-6 text-center">Stok</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((product) => {
                  const isLowStock = product.stock <= product.minStock;
                  return (
                    <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900">{product.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {product.sku}
                          </span>
                          {product.barcode && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Barcode className="w-3 h-3" /> {product.barcode}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold">
                          <Tag className="w-3 h-3" />
                          {product.category?.name || 'Tanpa Kategori'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-xs text-slate-500">
                        {formatCurrency(Number(product.costPrice))}
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-sm font-bold text-slate-900">
                        {formatCurrency(Number(product.price))}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                              product.stock === 0
                                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                : isLowStock
                                ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {isLowStock && <AlertTriangle className="w-3 h-3 shrink-0" />}
                            {product.stock} unit
                          </span>
                          <span className="text-[10px] text-slate-400">Min: {product.minStock}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {product.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                            <CheckCircle2 className="w-3 h-3" /> Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                            <XCircle className="w-3 h-3" /> Nonaktif
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(product)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                            title="Ubah Produk"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                            title="Hapus Produk"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination && pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Menampilkan <span className="font-bold text-slate-900">{(pagination.page - 1) * pagination.limit + 1}</span> -{' '}
              <span className="font-bold text-slate-900">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{' '}
              dari <span className="font-bold text-slate-900">{pagination.total}</span> produk
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="p-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg">
                Halaman {pagination.page} dari {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages}
                className="p-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL FORM (Create / Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {modalMode === 'create' ? 'Tambah Produk Baru' : 'Ubah Produk'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Isi informasi detail produk untuk disimpan dalam sistem
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body & Form */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-600 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* SKU */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    SKU / Kode Produk <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Contoh: PRD-001"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                  />
                </div>

                {/* Barcode */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Barcode (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="Contoh: 8991234567890"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Product Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Nama Produk <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Kopi Susu Aren 250ml"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Kategori <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all text-slate-700 font-medium cursor-pointer"
                >
                  <option value="" disabled>
                    Select Category...
                  </option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Prices */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Harga Modal (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                    placeholder="0"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Harga Jual (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-mono font-bold text-indigo-700"
                  />
                </div>
              </div>

              {/* Stock Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Stok Awal / Saat Ini <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    placeholder="0"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Minimal Stok (Peringatan)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                    placeholder="5"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-mono"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Deskripsi (Opsional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Catatan tambahan mengenai produk ini..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all resize-none"
                />
              </div>

              {/* Status Active Toggle */}
              <div className="pt-2 flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
                <span className="text-sm font-semibold text-slate-700">
                  Status Produk: {formData.isActive ? 'Aktif (Dapat Dijual)' : 'Nonaktif'}
                </span>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 text-slate-700 font-bold text-sm bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {modalMode === 'create' ? 'Simpan Produk' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
