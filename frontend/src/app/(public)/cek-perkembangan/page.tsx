// src/app/(public)/cek-perkembangan/page.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, User, FileText, Calendar, Hash } from 'lucide-react';

// Interface untuk hasil pencarian anak
interface AnakSearchResult {
  id: number;
  nama_anak: string;
  nik_anak: string | null;
  tanggal_lahir: string;
  nama_ibu: string | null;
}

// Helper format tanggal
const formatDisplayTanggal = (tanggalString: string | null) => {
  if (!tanggalString) return '-';
  try {
    const date = new Date(tanggalString.includes('T') ? tanggalString : tanggalString + 'T00:00:00Z');
    if (isNaN(date.getTime())) return tanggalString;
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
  } catch (e) {
    console.error("Error formatting display date:", tanggalString, e);
    return tanggalString;
  }
};

export default function CekPerkembanganPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AnakSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setError('Silakan masukkan NIK atau Nama untuk mencari.');
      return;
    }
    setIsLoading(true);
    setError('');
    setHasSearched(true);
    setResults([]);

    try {
      // Panggil API publik (tanpa auth)
      const response = await fetch(`http://localhost:8080/api/anak?search=${encodeURIComponent(query)}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Gagal mencari data');
      }
      const data: AnakSearchResult[] = await response.json();
      setResults(data || []);
    } catch (err: unknown) {
      let message = 'Terjadi kesalahan saat mencari.';
      if (err instanceof Error) { message = err.message; }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center -mt-8 pt-12">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg p-8 sm:p-12">
        
        {/* --- Tampilan Awal / Pencarian (Mirip image_feeb06.png) --- */}
        {!hasSearched ? (
          <div className="max-w-xl mx-auto text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Cek Data Perkembangan Anak</h1>
            <p className="text-gray-600 mb-8">
              Masukkan Nama Anak, NIK Anak, atau NIK Wali untuk melihat riwayat tumbuh kembang anak Anda.
            </p>
            <form onSubmit={handleSearch} className="space-y-4">
              <Input
                type="text"
                placeholder="Ketik di sini..."
                className="text-base h-12 px-5"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button type="submit" size="lg" className="w-full h-12 text-base bg-cyan-800 hover:bg-cyan-700" disabled={isLoading}>
                {isLoading ? 'Mencari...' : <><Search className="w-5 h-5 mr-2" /> Cari Data</>}
              </Button>
            </form>
            <p className="text-sm text-gray-500 mt-8">
              Apakah Anda seorang kader?{' '}
              <Link href="/login" className="font-medium text-cyan-700 hover:underline">
                Masuk di sini
              </Link>
            </p>
          </div>
        ) : (
          // --- Tampilan Hasil Pencarian (Mirip image_feeb3e.png) ---
          <div>
            <Button variant="outline" onClick={() => setHasSearched(false)} className="mb-6 cursor-pointer">
              &larr; Kembali ke Pencarian
            </Button>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Hasil Pencarian untuk &quot;{query}&quot;
            </h2>
            <p className="text-gray-600 mb-8">
              Ditemukan {results.length} data yang cocok. Pilih anak yang benar untuk melihat detail perkembangannya.
            </p>

            {isLoading && <p className="text-center p-8">Memuat hasil...</p>}
            {error && <p className="text-center p-8 text-red-500">{error}</p>}

            {!isLoading && !error && results.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.map((anak) => (
                  <Card key={anak.id} className="bg-gray-50 shadow-md border-gray-200">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-xl text-cyan-900">{anak.nama_anak}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-center gap-3">
                        <Hash className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700">NIK Anak: {anak.nik_anak || '-'}</span>
                      </div>
                       <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700">Tanggal Lahir: {formatDisplayTanggal(anak.tanggal_lahir)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700">Nama Wali: {anak.nama_ibu || '-'}</span>
                      </div>
                      <Button 
                        className="w-full mt-4 bg-cyan-800 hover:bg-cyan-700 cursor-pointer"
                        onClick={() => router.push(`/cek-perkembangan/${anak.id}`)}
                      >
                        Lihat Detail
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {!isLoading && !error && results.length === 0 && (
              <p className="text-center p-12 bg-gray-50 rounded-lg">
                Data tidak ditemukan. Pastikan NIK atau Nama sudah benar.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}