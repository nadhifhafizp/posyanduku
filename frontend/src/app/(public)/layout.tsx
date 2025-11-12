// src/app/(public)/layout.tsx
import React from 'react';
import Image from 'next/image';
import logoPosyandu from '@/img/posyanduku.png';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-50 min-h-screen font-poppins text-gray-800">
      {/* Header Sederhana */}
      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center">
          <div className="flex items-center gap-3">
            <Image 
              src={logoPosyandu} 
              alt="Logo Posyandu" 
              width={48} 
              height={48} 
              className="object-contain" 
            />
            <span className="text-xl font-semibold text-cyan-900">
              E-POSYANDU
            </span>
          </div>
        </nav>
      </header>
      
      {/* Konten Halaman */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 mt-4">
        {children}
      </main>
    </div>
  );
}