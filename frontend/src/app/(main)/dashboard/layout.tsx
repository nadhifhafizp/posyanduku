// src/app/admin/(dashboard)/layout.tsx
import Link from 'next/link';
import {
  LayoutDashboard,
  UserPlus,
  Baby,
  PackagePlus,
  Syringe,
  PlusSquare,
  UserRoundPlus,
  LogOut,
} from 'lucide-react';

// Data untuk menu sidebar
const sidebarNavItems = [
  { title: "Beranda", href: "/dashboard", icon: LayoutDashboard },
  { title: "Registrasi Wali", href: "registrasi-wali", icon: UserPlus },
  { title: "Registrasi Kader", href: "registrasi-kader", icon: UserRoundPlus },
  { title: "Registrasi Anak", href: "registrasi-anak", icon: Baby },
  { title: "Tambah Perkembangan", href: "perkembangan", icon: PlusSquare },
  { title: "Master Imunisasi", href: "master-imunisasi", icon: PackagePlus },
  { title: "Registrasi Imunisasi", href: "imunisasi-anak", icon: Syringe },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r bg-white flex flex-col">
        <div className="h-16 flex items-center px-6 border-b">
          <Link href="/admin" className="text-xl font-bold text-primary">
            E-POSYANDU
          </Link>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-2">
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
           <Link
              href="/login" // Nanti ini akan diubah menjadi fungsi logout
              className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 bg-gray-50">
        <header className="h-16 flex items-center px-8 border-b bg-white">
          <div>
            <h1 className="text-xl font-semibold">Dasbor Admin Posyandu</h1>
            <p className="text-sm text-gray-500">Selamat datang kembali, Kader!</p>
          </div>
        </header>
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}