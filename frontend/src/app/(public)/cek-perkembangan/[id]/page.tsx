// src/app/(public)/cek-perkembangan/[id]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// --- Interface Data ---
interface AnakDetail {
  id: number;
  nama_anak: string;
  nik_anak: string | null;
  tanggal_lahir: string;
  jenis_kelamin: string;
  nama_ibu: string | null;
  nik_ibu: string | null;
}

interface RiwayatVaksin {
  id: number;
  tanggal_imunisasi: string;
  nama_imunisasi: string;
  catatan: string | null;
}

interface RiwayatPerkembangan {
  id: number;
  tanggal_pemeriksaan: string;
  bb_kg: number | null;
  tb_cm: number | null;
  lk_cm: number | null;
  ll_cm: number | null;
}

// --- Tipe Data Gabungan ---
interface ChartData {
  tanggal: string;
  berat?: number;
  tinggi?: number;
}

// --- Helper Format Tanggal ---
const formatDisplayTanggal = (tanggalString: string | null, style: 'short' | 'long' = 'long') => {
  if (!tanggalString) return '-';
  try {
    const date = new Date(tanggalString.includes('T') ? tanggalString : tanggalString + 'T00:00:00Z');
    if (isNaN(date.getTime())) return tanggalString;
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: style === 'long' ? 'long' : 'short',
      year: 'numeric',
      timeZone: 'Asia/Jakarta'
    });
  } catch (e) {
    return tanggalString;
  }
};

// --- Helper Hitung Usia ---
const hitungUsia = (tanggalLahir: string): string => {
  if (!tanggalLahir) return '-';
  try {
    const lahir = new Date(tanggalLahir);
    const today = new Date();
    let years = today.getFullYear() - lahir.getFullYear();
    let months = today.getMonth() - lahir.getMonth();
    
    if (months < 0) {
      years--;
      months += 12;
    }
    return `${years} tahun ${months} bulan`;
  } catch {
    return 'Invalid Date';
  }
};

export default function DetailPerkembanganPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [anak, setAnak] = useState<AnakDetail | null>(null);
  const [vaksin, setVaksin] = useState<RiwayatVaksin[]>([]);
  const [perkembangan, setPerkembangan] = useState<RiwayatPerkembangan[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        // 1. Fetch Biodata Anak
        const resAnak = await fetch(`http://localhost:8080/api/anak/${id}`);
        if (!resAnak.ok) throw new Error('Gagal memuat biodata anak.');
        const dataAnak: AnakDetail = await resAnak.json();
        setAnak(dataAnak);

        // 2. Fetch Riwayat Vaksin
        const resVaksin = await fetch(`http://localhost:8080/api/riwayat-imunisasi?id_anak=${id}`);
        if (!resVaksin.ok) throw new Error('Gagal memuat riwayat vaksin.');
        const dataVaksin: RiwayatVaksin[] = await resVaksin.json();
        setVaksin(dataVaksin || []);

        // 3. Fetch Riwayat Perkembangan
        const resPerkembangan = await fetch(`http://localhost:8080/api/perkembangan?id_anak=${id}`);
        if (!resPerkembangan.ok) throw new Error('Gagal memuat riwayat perkembangan.');
        const dataPerkembangan: RiwayatPerkembangan[] = await resPerkembangan.json();
        
        // Urutkan dari terlama ke terbaru untuk grafik
        const sortedPerkembangan = (dataPerkembangan || []).sort((a, b) => 
          new Date(a.tanggal_pemeriksaan).getTime() - new Date(b.tanggal_pemeriksaan).getTime()
        );
        setPerkembangan(sortedPerkembangan.slice().reverse()); // Tampilkan tabel terbaru dulu

        // 4. Siapkan data untuk Chart
        const formattedChartData = sortedPerkembangan.map(p => ({
          tanggal: formatDisplayTanggal(p.tanggal_pemeriksaan, 'short'),
          berat: p.bb_kg ?? undefined,
          tinggi: p.tb_cm ?? undefined,
        }));
        setChartData(formattedChartData);

      } catch (err: unknown) {
        let message = 'Terjadi kesalahan';
        if (err instanceof Error) { message = err.message; }
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return <div className="text-center p-12">Memuat data perkembangan anak...</div>;
  }

  if (error) {
    return <div className="text-center p-12 text-red-500">{error}</div>;
  }

  if (!anak) {
    return <div className="text-center p-12">Data anak tidak ditemukan.</div>;
  }

  return (
    <div className="space-y-8">
      {/* Tombol Kembali */}
      <div className="mb-6">
        <Link href="/cek-perkembangan">
          <Button variant="outline" className="cursor-pointer">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Hasil Pencarian
          </Button>
        </Link>
      </div>

      {/* Judul Halaman */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Detail Perkembangan - {anak.nama_anak}
        </h1>
        <p className="text-lg text-gray-600 mt-1">
          Menampilkan riwayat dan statistik tumbuh kembang anak.
        </p>
      </div>

      {/* Biodata Anak */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Biodata Anak</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-base">
            <div><dt className="font-medium text-gray-500">Nama Lengkap:</dt><dd className="text-gray-800 font-semibold">{anak.nama_anak}</dd></div>
            <div><dt className="font-medium text-gray-500">NIK Anak:</dt><dd className="text-gray-800">{anak.nik_anak || '-'}</dd></div>
            <div><dt className="font-medium text-gray-500">Tanggal Lahir:</dt><dd className="text-gray-800">{formatDisplayTanggal(anak.tanggal_lahir)} (Usia: {hitungUsia(anak.tanggal_lahir)})</dd></div>
            <div><dt className="font-medium text-gray-500">Jenis Kelamin:</dt><dd className="text-gray-800">{anak.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</dd></div>
            <div><dt className="font-medium text-gray-500">Nama Wali:</dt><dd className="text-gray-800">{anak.nama_ibu || '-'}</dd></div>
            <div><dt className="font-medium text-gray-500">NIK Wali:</dt><dd className="text-gray-800">{anak.nik_ibu || '-'}</dd></div>
          </dl>
        </CardContent>
      </Card>

      {/* Riwayat Vaksin */}
      <Card className="shadow-lg">
        <CardHeader><CardTitle className="text-xl">Riwayat Vaksin</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b"><tr className="text-gray-600"><th className="py-3 pr-4 font-medium">Tanggal</th><th className="py-3 px-4 font-medium">Nama Vaksin</th><th className="py-3 pl-4 font-medium">Catatan</th></tr></thead>
            <tbody>
              {vaksin.length > 0 ? vaksin.map(v => (
                <tr key={v.id} className="border-b"><td className="py-3 pr-4 whitespace-nowrap">{formatDisplayTanggal(v.tanggal_imunisasi)}</td><td className="py-3 px-4 font-semibold">{v.nama_imunisasi}</td><td className="py-3 pl-4">{v.catatan || '-'}</td></tr>
              )) : (
                <tr><td colSpan={3} className="text-center py-6 text-gray-500">Belum ada data riwayat vaksin.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Riwayat Pemeriksaan */}
      <Card className="shadow-lg">
        <CardHeader><CardTitle className="text-xl">Riwayat Pemeriksaan</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b"><tr className="text-gray-600"><th className="py-3 pr-4 font-medium">Tanggal</th><th className="py-3 px-4 font-medium">Berat (kg)</th><th className="py-3 px-4 font-medium">Tinggi (cm)</th><th className="py-3 px-4 font-medium">LK (cm)</th><th className="py-3 pl-4 font-medium">LL (cm)</th></tr></thead>
            <tbody>
              {perkembangan.length > 0 ? perkembangan.map(p => (
                <tr key={p.id} className="border-b"><td className="py-3 pr-4 whitespace-nowrap">{formatDisplayTanggal(p.tanggal_pemeriksaan)}</td><td className="py-3 px-4 font-semibold">{p.bb_kg ?? '-'}</td><td className="py-3 px-4 font-semibold">{p.tb_cm ?? '-'}</td><td className="py-3 px-4">{p.lk_cm ?? '-'}</td><td className="py-3 pl-4">{p.ll_cm ?? '-'}</td></tr>
              )) : (
                <tr><td colSpan={5} className="text-center py-6 text-gray-500">Belum ada data riwayat pemeriksaan.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Statistik Pertumbuhan */}
      <Card className="shadow-lg">
        <CardHeader><CardTitle className="text-xl">Statistik Pertumbuhan</CardTitle></CardHeader>
        <CardContent className="space-y-10">
          {/* Grafik Berat Badan */}
          <div>
            <h3 className="text-base font-semibold mb-4">Grafik Berat Badan (kg)</h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="tanggal" fontSize={12} />
                  <YAxis domain={['auto', 'auto']} fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="berat" stroke="#3b82f6" strokeWidth={2} activeDot={{ r: 8 }} name="Berat (kg)" />
                </LineChart>
              </ResponsiveContainer>
            ) : ( <p className="text-center text-gray-500">Data tidak cukup untuk menampilkan grafik.</p> )}
          </div>
          {/* Grafik Tinggi Badan */}
          <div>
            <h3 className="text-base font-semibold mb-4">Grafik Tinggi Badan (cm)</h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="tanggal" fontSize={12} />
                  <YAxis domain={['auto', 'auto']} fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="tinggi" stroke="#ef4444" strokeWidth={2} activeDot={{ r: 8 }} name="Tinggi (cm)" />
                </LineChart>
              </ResponsiveContainer>
            ) : ( <p className="text-center text-gray-500">Data tidak cukup untuk menampilkan grafik.</p> )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}