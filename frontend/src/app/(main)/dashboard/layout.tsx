// src/app/(main)/dashboard/layout.tsx
'use client'; // <-- Diperlukan karena ada hook dan event handler

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
// Hapus impor Button jika tidak digunakan langsung di sini
// import { Button } from '@/components/ui/button';

// Data untuk menu sidebar
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
  const { logout, isLoggedIn, isLoadingAuth } = useAuth(); // Ambil juga isLoggedIn dan isLoadingAuth
  const router = useRouter();

  const handleLogout = () => {
    if (confirm('Anda yakin ingin keluar?')) {
      logout();
      router.push('/login');
    }
  };

  // Tambahkan ini untuk handle redirect jika belum login
  useEffect(() => {
    // Tunggu loading auth selesai sebelum cek
    if (!isLoadingAuth && !isLoggedIn) {
        console.log("DashboardLayout: Belum login, redirecting...");
        router.push('/login');
    }
  }, [isLoadingAuth, isLoggedIn, router]);

  // Tampilkan loading atau null jika auth belum siap atau belum login
  if (isLoadingAuth || !isLoggedIn) {
     // Atau tampilkan skeleton loading yang lebih baik
     return <div className="flex justify-center items-center min-h-screen">Memuat...</div>;
  }


  // Pastikan hanya ada SATU <aside> dan SATU div 'Main Content'
  return (
    <div className="flex min-h-screen">
      {/* Sidebar (Hanya SATU kali) */}
      <aside className="w-64 flex-shrink-0 border-r bg-white flex flex-col">
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

      {/* Main Content (Hanya SATU kali) */}
      <div className="flex-1 bg-gray-50">
        <header className="h-16 flex items-center px-8 border-b bg-white">
          <div>
            <h1 className="text-xl font-semibold">Dasbor Kader Posyandu</h1>
            <p className="text-sm text-gray-500">Selamat datang kembali!</p>
          </div>
        </header>
        <main className="p-8">
          {/* Children (konten dari page atau layout di bawahnya) akan dirender di sini */}
          {children}
        </main>
      </div>
    </div>
  );
}