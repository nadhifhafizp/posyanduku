// src/app/dashboard/layout.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function DashboardLayout({
  children, // Ini adalah konten dari page.tsx yang aktif
}: {
  children: React.ReactNode;
}) {
  return (
    // Struktur luar halaman dashboard
    <div className="bg-gray-100 min-h-screen p-4 sm:p-6 lg:p-8 font-poppins">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Tombol Kembali ke Halaman Utama Dashboard */}
        <div className="mb-6">
          <Link href="/dashboard"> {/* Sesuaikan href jika perlu */}
            <Button variant="outline" className="cursor-pointer">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali ke Dashboard Utama
            </Button>
          </Link>
        </div>

        {/* Tempat konten dari page.tsx akan dirender */}
        <main>{children}</main>

      </div>
    </div>
  );
}