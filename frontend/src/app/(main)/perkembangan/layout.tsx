// src/app/dashboard/layout.tsx (Versi yang sudah diperbarui)
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
// Import component Providers yang baru
import { Providers } from '@/app/providers';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Membungkus seluruh layout dengan Providers (Client Component)
    <Providers> 
      <div className="bg-gray-100 min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="mb-6">
            <Link href="/dashboard">
              <Button variant="outline" className="cursor-pointer">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali ke Dashboard Utama
              </Button>
            </Link>
          </div>
          {/* Children kini berada di dalam AuthProvider */}
          <main>{children}</main> 
        </div>
      </div>
    </Providers>
  );
}