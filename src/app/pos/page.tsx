'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  CreditCard,
  Banknote,
  QrCode,
  Receipt,
  CheckCircle2,
  X,
  RefreshCw,
  Tag,
  FileText,
  Printer,
  AlertCircle
} from 'lucide-react';
import { useCartStore, CartProduct } from '@/store/useCartStore';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ProductData {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  image: string | null;
  isActive: boolean;
  categoryId: string;
  category: Category;
}

interface TransactionResponseData {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  discountAmount: number;
  taxAmount: number;
  finalAmount: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'QRIS' | 'DEBIT_CARD';
  createdAt: string;
  notes?: string | null;
  items: {
    id: string;
    productName: string;
    productSku: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
}

export default function POSPage() {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');

  // Checkout modal states
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'QRIS' | 'DEBIT_CARD'>('CASH');
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Completed transaction / Receipt modal
  const [completedTransaction, setCompletedTransaction] = useState<TransactionResponseData | null>(null);

  // Zustand store actions & state
  const {
    items,
    discount,
    notes,
    addItem,
    removeItem,
    updateQuantity,
    setDiscount,
    setNotes,
    clearCart,
    getSubtotal,
    getTotal
  } = useCartStore();

  // Fetch Products & Categories
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch('/api/products?isActive=true'),
        fetch('/api/categories')
      ]);

      if (!productsRes.ok || !categoriesRes.ok) {
        throw new Error('Gagal mengambil data produk atau kategori');
      }

      const productsJson = await productsRes.json();
      const categoriesJson = await categoriesRes.json();

      if (productsJson.success) {
        setProducts(productsJson.data || []);
      }
      if (categoriesJson.success) {
        setCategories(categoriesJson.data || []);
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memuat data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = selectedCategoryId === 'ALL' || product.categoryId === selectedCategoryId;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        product.name.toLowerCase().includes(q) ||
        product.sku.toLowerCase().includes(q) ||
        (product.barcode && product.barcode.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategoryId, searchQuery]);

  // Helper to format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Cart summary calculations
  const subtotal = getSubtotal();
  const finalTotal = getTotal();
  const paidAmountNumber = parseFloat(paidAmountInput) || 0;
  const changeAmount = Math.max(0, paidAmountNumber - finalTotal);

  // Add product to cart handler
  const handleAddToCart = (product: ProductData) => {
    if (product.stock <= 0) return;

    const cartItem = items.find((item) => item.product.id === product.id);
    const currentQty = cartItem ? cartItem.quantity : 0;

    if (currentQty >= product.stock) {
      alert(`Stok ${product.name} telah mencapai batas maksimum (${product.stock})`);
      return;
    }

    const cartProd: CartProduct = {
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: Number(product.price),
      stock: product.stock,
      image: product.image,
      categoryName: product.category?.name
    };

    addItem(cartProd, 1);
  };

  // Open checkout dialog
  const handleOpenCheckout = () => {
    if (items.length === 0) return;
    setCheckoutError(null);
    setPaidAmountInput(finalTotal.toString());
    setIsCheckoutOpen(true);
  };

  // Fast amount buttons
  const handleFastPay = (amount: number) => {
    setPaidAmountInput(amount.toString());
  };

  // Execute transaction POST
  const handleProcessCheckout = async () => {
    setCheckoutError(null);

    if (paidAmountNumber < finalTotal) {
      setCheckoutError(`Pembayaran kurang ${formatCurrency(finalTotal - paidAmountNumber)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.product.price
        })),
        discountAmount: discount,
        taxAmount: 0,
        paidAmount: paidAmountNumber,
        paymentMethod,
        notes: notes || null
      };

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Transaksi gagal diproses');
      }

      // Success transaction
      setCompletedTransaction(json.data);
      setIsCheckoutOpen(false);
      clearCart();
      // Refresh products to sync current stock
      fetchData();
    } catch (err: any) {
      setCheckoutError(err.message || 'Terjadi kesalahan sistem saat checkout');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Print receipt helper
  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* LEFT COLUMN: Catalog & Selection */}
      <div className="flex-1 flex flex-col p-4 lg:p-6 space-y-4 overflow-y-auto lg:h-screen">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-7 h-7 text-indigo-600" /> Kasir POS
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih produk dan kelola transaksi penjualan dengan cepat
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Sync Data
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama produk, SKU, atau barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400 shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategoryId('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shadow-xs ${'ALL' === selectedCategoryId
              ? 'bg-indigo-600 text-white shadow-indigo-100'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
          >
            Semua Produk
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shadow-xs ${cat.id === selectedCategoryId
                ? 'bg-indigo-600 text-white shadow-indigo-100'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Main Product Catalog Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 flex-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 border border-slate-200 animate-pulse space-y-3">
                <div className="w-full h-24 bg-slate-100 rounded-lg"></div>
                <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                <div className="h-4 bg-slate-100 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex-1 bg-white p-8 rounded-xl border border-red-200 text-center flex flex-col items-center justify-center space-y-3">
            <AlertCircle className="w-10 h-10 text-red-500" />
            <p className="text-sm text-red-600 font-medium">{error}</p>
            <button
              onClick={fetchData}
              className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-xs"
            >
              Coba Lagi
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex-1 bg-white p-8 rounded-xl border border-slate-200 text-center flex flex-col items-center justify-center space-y-2">
            <ShoppingBag className="w-12 h-12 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">Produk tidak ditemukan</p>
            <p className="text-xs text-slate-400">
              Coba ubah kata kunci pencarian atau pilih kategori lain.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 flex-1 content-start overflow-y-auto pr-1">
            {filteredProducts.map((product) => {
              const isOutOfStock = product.stock <= 0;
              const cartItem = items.find((i) => i.product.id === product.id);
              const inCartQty = cartItem ? cartItem.quantity : 0;

              return (
                <button
                  key={product.id}
                  disabled={isOutOfStock}
                  onClick={() => handleAddToCart(product)}
                  className={`group relative text-left bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all flex flex-col justify-between ${isOutOfStock ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer active:scale-98'
                    }`}
                >
                  {/* In Cart Badge */}
                  {inCartQty > 0 && (
                    <div className="absolute -top-2 -right-2 bg-indigo-600 text-white font-bold text-xs w-6 h-6 rounded-full flex items-center justify-center shadow-md ring-2 ring-white">
                      {inCartQty}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase truncate">
                        {product.category?.name || 'Umum'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        SKU: {product.sku}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-tight mb-2">
                      {product.name}
                    </h3>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between w-full">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-indigo-600">
                        {formatCurrency(Number(product.price))}
                      </span>
                      <span className={`text-[11px] font-medium ${isOutOfStock ? 'text-red-500' : product.stock <= product.minStock ? 'text-amber-500' : 'text-slate-500'}`}>
                        Stok: {product.stock}
                      </span>
                    </div>
                    <div className={`p-1.5 rounded-lg transition-colors ${isOutOfStock ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                      <Plus className="w-4 h-4" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Cart & Order Summary */}
      <div className="w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col h-auto lg:h-screen shadow-lg">
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Keranjang Belanja</h2>
            <span className="bg-indigo-100 text-indigo-700 font-semibold text-xs px-2 py-0.5 rounded-full">
              {items.reduce((acc, i) => acc + i.quantity, 0)} item
            </span>
          </div>
          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs font-medium text-rose-600 hover:text-rose-700 flex items-center gap-1 hover:bg-rose-50 px-2 py-1 rounded-md transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Kosongkan
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-100">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3 my-auto">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600">Keranjang masih kosong</p>
                <p className="text-xs text-slate-400 mt-1">
                  Klik produk di sebelah kiri untuk menambah ke keranjang
                </p>
              </div>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.product.id} className="pt-3 first:pt-0 flex flex-col space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-slate-800 line-clamp-1">
                      {item.product.name}
                    </h4>
                    <p className="text-xs text-slate-400 font-mono">{formatCurrency(item.product.price)}</p>
                  </div>
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  {/* Quantity Controls */}
                  <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="p-1 text-slate-600 hover:bg-white rounded-l-lg transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center text-xs font-bold text-slate-800">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="p-1 text-slate-600 hover:bg-white rounded-r-lg transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Subtotal Item */}
                  <span className="text-sm font-bold text-slate-900">
                    {formatCurrency(item.product.price * item.quantity)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Bottom Summary & Checkout Button */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50 space-y-3">
          {/* Discount & Notes input expander */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1 font-medium">
                <Tag className="w-3.5 h-3.5 text-slate-400" /> Diskon (Rp)
              </span>
              <input
                type="number"
                min="0"
                value={discount || ''}
                onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="0"
                className="w-28 px-2 py-1 bg-white border border-slate-200 rounded text-right text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1 font-medium">
                <FileText className="w-3.5 h-3.5 text-slate-400" /> Catatan
              </span>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Opsional..."
                className="w-36 px-2 py-1 bg-white border border-slate-200 rounded text-right text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-2 space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-medium text-slate-800">{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Diskon</span>
                <span>- {formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-base font-extrabold text-slate-900 pt-1 border-t border-slate-200">
              <span>Total Tagihan</span>
              <span className="text-indigo-600 text-lg">{formatCurrency(finalTotal)}</span>
            </div>
          </div>

          <button
            onClick={handleOpenCheckout}
            disabled={items.length === 0}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md hover:shadow-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            <CreditCard className="w-5 h-5" /> Bayar Sekarang ({formatCurrency(finalTotal)})
          </button>
        </div>
      </div>

      {/* MODAL CHECKOUT / PAYMENT */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-600" /> Pembayaran
                </h3>
                <p className="text-xs text-slate-500">Pilih metode pembayaran dan masukkan nominal bayar</p>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total Display Box */}
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl text-center space-y-1">
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                Total Harus Dibayar
              </span>
              <div className="text-3xl font-extrabold text-indigo-900">
                {formatCurrency(finalTotal)}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Metode Pembayaran
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all ${paymentMethod === 'CASH'
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                >
                  <Banknote className="w-5 h-5 mb-1" /> Tunai
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('QRIS')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all ${paymentMethod === 'QRIS'
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                >
                  <QrCode className="w-5 h-5 mb-1" /> QRIS
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('DEBIT_CARD')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all ${paymentMethod === 'DEBIT_CARD'
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                >
                  <CreditCard className="w-5 h-5 mb-1" /> Debit Card
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('BANK_TRANSFER')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all ${paymentMethod === 'BANK_TRANSFER'
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                >
                  <Receipt className="w-5 h-5 mb-1" /> Transfer
                </button>
              </div>
            </div>

            {/* Paid Amount Input & Quick Buttons */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Jumlah Diterima (Rp)
                </label>
                <button
                  type="button"
                  onClick={() => handleFastPay(finalTotal)}
                  className="text-xs text-indigo-600 hover:underline font-semibold"
                >
                  Uang Pas ({formatCurrency(finalTotal)})
                </button>
              </div>
              <input
                type="number"
                min="0"
                value={paidAmountInput}
                onChange={(e) => setPaidAmountInput(e.target.value)}
                placeholder="Masukkan nominal uang..."
                className="w-full px-4 py-3 text-lg font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none transition-all shadow-xs text-slate-900"
              />

              {/* Fast amount buttons for Cash */}
              {paymentMethod === 'CASH' && (
                <div className="flex flex-wrap gap-1.5">
                  {[10000, 20000, 50000, 100000, 200000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleFastPay(amt)}
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded-lg transition-colors border border-slate-200"
                    >
                      {formatCurrency(amt)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Change Amount Box */}
            <div className="flex justify-between items-center p-3 bg-slate-100 rounded-xl text-sm font-semibold">
              <span className="text-slate-600">Kembalian:</span>
              <span className={`text-base font-extrabold ${paidAmountNumber < finalTotal ? 'text-slate-400' : 'text-emerald-600'}`}>
                {formatCurrency(changeAmount)}
              </span>
            </div>

            {/* Checkout Error Message */}
            {checkoutError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{checkoutError}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleProcessCheckout}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Memproses...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Selesaikan Transaksi
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RECEIPT / SUCCESS TRANSACTION */}
      {completedTransaction && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 my-8">
            {/* Header Success */}
            <div className="text-center space-y-2 border-b border-slate-100 pb-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Transaksi Berhasil</h3>
              <p className="text-xs font-mono text-slate-500">
                No. Faktur: {completedTransaction.invoiceNumber}
              </p>
              <p className="text-[11px] text-slate-400">
                {new Date(completedTransaction.createdAt).toLocaleString('id-ID')}
              </p>
            </div>

            {/* Receipt Items Breakdown */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs border-b border-slate-100 pb-3">
              {completedTransaction.items.map((item) => (
                <div key={item.id} className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-slate-800">{item.productName}</span>
                    <div className="text-slate-400 font-mono">
                      {item.quantity} x {formatCurrency(item.unitPrice)}
                    </div>
                  </div>
                  <span className="font-semibold text-slate-800">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            {/* Calculation Totals */}
            <div className="space-y-1 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium">{formatCurrency(completedTransaction.totalAmount)}</span>
              </div>
              {completedTransaction.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Diskon</span>
                  <span>- {formatCurrency(completedTransaction.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-200">
                <span>Total</span>
                <span className="text-indigo-600">{formatCurrency(completedTransaction.finalAmount)}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span>Bayar ({completedTransaction.paymentMethod})</span>
                <span className="font-medium">{formatCurrency(completedTransaction.paidAmount)}</span>
              </div>
              <div className="flex justify-between font-semibold text-emerald-600">
                <span>Kembalian</span>
                <span>{formatCurrency(completedTransaction.changeAmount)}</span>
              </div>
            </div>

            {/* Receipt Actions */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Cetak Struk
              </button>
              <button
                type="button"
                onClick={() => setCompletedTransaction(null)}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                Selesai & Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
