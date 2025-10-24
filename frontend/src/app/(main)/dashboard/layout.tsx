// src/app/(main)/dashboard/layout.tsx
'use client'; // Sudah benar

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';
import { useEffect } from 'react';
import {
  LayoutDashboard, UserPlus, Baby, PackagePlus, Syringe,
  PlusSquare, UserRoundPlus, FileText,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

// ... (sidebarNavItems tetap sama)
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { logout, isLoggedIn, isLoadingAuth } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    if (confirm('Anda yakin ingin keluar?')) {
      logout();
      router.push('/login');
    }
  };

  // Ini bagian penting untuk proteksi halaman
  useEffect(() => {
    if (!isLoadingAuth && !isLoggedIn) {
        console.log("DashboardLayout: Belum login, redirecting...");
        router.push('/login'); // Redirect jika tidak login
    }
  }, [isLoadingAuth, isLoggedIn, router]); // Dependensi sudah benar

  // Tampilkan loading jika auth belum siap atau jika belum login (redirect sedang diproses)
  if (isLoadingAuth || !isLoggedIn) {
     return <div className="flex justify-center items-center min-h-screen">Memuat...</div>;
  }

  // Jika sudah login, tampilkan layout dashboard
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r bg-white flex flex-col">
        {/* ... (konten sidebar) ... */}
         <div className="h-16 flex items-center px-6 border-b">
          <Link href="/dashboard" className="text-xl font-bold text-primary">
            E-POSYANDU
          </Link>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {sidebarNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100"
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.title}
            </Link>
          ))}
        </nav>
        <div className="px-4 py-4 border-t">
           <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 text-left"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 bg-gray-50">
        <header className="h-16 flex items-center px-8 border-b bg-white">
          {/* ... (konten header) ... */}
           <div>
            <h1 className="text-xl font-semibold">Dasbor Kader Posyandu</h1>
            <p className="text-sm text-gray-500">Selamat datang kembali!</p>
          </div>
        </header>
        <main className="p-8">
          {children} {/* Konten halaman spesifik (misal: /dashboard, /registrasi-wali, dll.) */}
        </main>
      </div>
    </div>
  );
}