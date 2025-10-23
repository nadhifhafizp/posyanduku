// src/app/(main)/laporan/layout.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button'; // Pastikan path benar
import { ArrowLeft } from 'lucide-react';
import React from 'react';

export default function LaporanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Struktur luar mirip dengan layout lain
    <div className="bg-gray-100 min-h-screen p-4 sm:p-6 lg:p-8 font-poppins">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Tombol Kembali */}
        <div className="mb-6">
          <Link href="/dashboard">
            <Button variant="outline" className="cursor-pointer">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali ke Dashboard Utama
            </Button>
          </Link>
        </div>
        {/* Konten Halaman Laporan */}
        <main>{children}</main>
      </div>
    </div>
  );
}