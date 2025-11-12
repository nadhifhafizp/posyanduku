// src/app/(main)/layout.tsx
'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard, UserPlus, Baby, PackagePlus, Syringe,
  PlusSquare, UserRoundPlus, FileText, LogOut, Menu, X
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

// Menu navigasi sidebar
const sidebarNavItems = [
  { title: "Beranda", href: "/dashboard", icon: LayoutDashboard },
  { title: "Registrasi Wali", href: "/registrasi-wali", icon: UserPlus },
  { title: "Registrasi Kader", href: "/registrasi-kader", icon: UserRoundPlus },
  { title: "Registrasi Anak", href: "/registrasi-anak", icon: Baby },
  { title: "Tambah Perkembangan", href: "/perkembangan", icon: PlusSquare },
  { title: "Master Imunisasi", href: "/master-imunisasi", icon: PackagePlus },
  { title: "Registrasi Imunisasi", href: "/imunisasi-anak", icon: Syringe },
  { title: "Laporan", href: "/laporan", icon: FileText },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { logout, isLoggedIn, isLoadingAuth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- PROTEKSI HALAMAN ---
  useEffect(() => {
    if (!isLoadingAuth && !isLoggedIn) {
      router.push('/login'); // Redirect ke login jika belum masuk
    }
  }, [isLoadingAuth, isLoggedIn, router]);

  if (isLoadingAuth || !isLoggedIn) {
    return <div className="flex justify-center items-center min-h-screen bg-gray-100">Memuat sesi...</div>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50 font-poppins">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r shadow-sm transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:shadow-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center justify-between px-6 border-b">
          <Link href="/dashboard" className="text-xl font-bold text-cyan-900">
            E-POSYANDU
          </Link>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {sidebarNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-cyan-50 text-cyan-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-cyan-700' : 'text-gray-400'}`} />
                {item.title}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <button
            onClick={() => {
              if (confirm('Anda yakin ingin keluar?')) {
                logout();
                router.push('/login');
              }
            }}
            className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Konten Utama */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 flex items-center px-4 bg-white border-b shadow-sm sticky top-0 z-30">
          <button onClick={() => setIsSidebarOpen(true)} className="text-gray-500 hover:text-gray-700">
            <Menu className="w-6 h-6" />
          </button>
          <span className="ml-4 font-semibold text-gray-800">Menu</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}