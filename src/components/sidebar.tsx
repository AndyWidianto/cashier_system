"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tags,
  Warehouse,
  Receipt,
  BarChart3,
  Store,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pos", label: "POS Kasir", icon: ShoppingCart },
  { href: "/products", label: "Produk", icon: Package },
  { href: "/categories", label: "Kategori", icon: Tags },
  { href: "/inventory", label: "Inventori", icon: Warehouse },
  { href: "/transactions", label: "Transaksi", icon: Receipt },
  { href: "/reports", label: "Laporan", icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  if (pathname === "/login") {
    return null;
  }

  const toggleSidebar = () => setIsOpen((prev) => !prev);
  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Top Header */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-sm">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-slate-900 text-base leading-none block">Kasir POS</span>
            <span className="text-[11px] text-slate-500 font-medium">Sistem Kasir Digital</span>
          </div>
        </div>

        <button
          onClick={toggleSidebar}
          aria-label="Toggle navigation menu"
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar Component */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col h-screen shrink-0 transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-100">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-lg leading-tight block">Kasir POS</span>
              <span className="text-xs text-slate-500 font-medium">Point of Sale System</span>
            </div>
          </div>

          <button
            onClick={closeSidebar}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 p-4 space-y-6 overflow-y-auto">
          <div>
            <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Menu Utama
            </p>
            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeSidebar}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                      }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                    <span className="flex-1">{item.label}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Footer Status */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-700 truncate">Sistem Aktif</p>
              <p className="text-[10px] text-slate-400">v1.0 • Online</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
