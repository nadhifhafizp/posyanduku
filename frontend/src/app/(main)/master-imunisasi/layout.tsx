// src/app/(main)/master-imunisasi/layout.tsx
import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

// Metadata untuk judul tab browser (tetap spesifik)
export const metadata: Metadata = {
  title: 'Master Imunisasi',
};

export default function MasterImunisasiLayout({
  children, // Ini adalah konten dari page.tsx yang aktif
}: {
  children: React.ReactNode;
}) {
  return (
    // Struktur luar disamakan dengan DashboardLayout
    <div className="bg-gray-100 min-h-screen p-4 sm:p-6 lg:p-8 font-poppins">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Tombol Kembali ke Halaman Utama Dashboard (sama seperti di DashboardLayout) */}
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