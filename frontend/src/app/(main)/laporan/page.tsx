// src/app/(main)/laporan/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button"; // Pastikan path benar
import { Input } from "@/components/ui/input"; // Pastikan path benar
import { Label } from "@/components/ui/label"; // Pastikan path benar
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Pastikan path benar
import { Download, Filter } from 'lucide-react';
import { useAuth } from '@/context/AuthContext'; // Pastikan path benar
import { useFetchWithAuth } from '@/lib/utils'; // Pastikan path ke hook fetch benar
import * as XLSX from 'xlsx';

// Tipe data (bisa impor dari file lain atau definisikan ulang)
interface Ibu { id: number; nama_lengkap: string | null; nik: string | null; no_telepon: string | null; alamat: string | null; created_at: string; updated_at: string | null; }
interface Anak { id: number; nama_anak: string; nama_ibu: string | null; nik_anak: string | null; tanggal_lahir: string; jenis_kelamin: string; anak_ke: number | null; berat_lahir_kg: number | null; tinggi_lahir_cm: number | null; created_at: string; updated_at: string | null; }
interface Perkembangan { id: number; nama_anak: string; nik_anak: string | null; nama_ibu: string | null; nik_ibu: string | null; tanggal_pemeriksaan: string; bb_kg: number | null; tb_cm: number | null; lk_cm: number | null; ll_cm: number | null; status_gizi: string | null; saran: string | null; nama_kader: string | null; created_at: string; updated_at: string | null;}
interface RiwayatImunisasi { id: number; nama_anak: string; nama_imunisasi: string; tanggal_imunisasi: string; catatan: string | null; nama_kader: string | null; nama_kader_updater: string | null; created_at: string; updated_at: string | null;}

type LaporanData = Ibu[] | Anak[] | Perkembangan[] | RiwayatImunisasi[];

// Helper format tanggal
const formatTanggal = (tanggalString: string | null, includeTime = false) => {
    if (!tanggalString) return 'N/A';
    try {
        // Coba parsing dengan atau tanpa Z (UTC identifier)
        const date = new Date(tanggalString.endsWith('Z') ? tanggalString : tanggalString + 'Z');
        if (isNaN(date.getTime())) return 'Invalid Date';

        const options: Intl.DateTimeFormatOptions = {
            day: '2-digit', month: 'short', year: 'numeric',
            timeZone: 'Asia/Jakarta' // Set timezone ke WIB
         };
         if (includeTime) {
             options.hour = '2-digit';
             options.minute = '2-digit';
             options.hour12 = false; // Gunakan format 24 jam jika perlu
         }
        return date.toLocaleString('id-ID', options);
    } catch(e) {
        console.error("Error formatting date:", tanggalString, e);
        return 'Invalid Date';
    }
};
// Format hanya tanggal (DD MMM YYYY)
const formatDisplayTanggal = (tanggalString: string | null) => {
     if (!tanggalString) return '-';
      try {
        // Asumsi input YYYY-MM-DD atau ISO string
        const date = new Date(tanggalString.includes('T') ? tanggalString : tanggalString + 'T00:00:00Z');
        if (isNaN(date.getTime())) return tanggalString;
        return date.toLocaleDateString('id-ID', {
            day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta'
        });
      } catch (e) {
          console.error("Error formatting display date:", tanggalString, e);
          return tanggalString;
       }
};

export default function LaporanPage() {
  const router = useRouter();
  const { isLoggedIn, isLoadingAuth } = useAuth(); // Ambil isLoadingAuth juga
  const fetchWithAuth = useFetchWithAuth();

  const [tipeLaporan, setTipeLaporan] = useState<string>('perkembangan');
  const [tanggalMulai, setTanggalMulai] = useState<string>('');
  const [tanggalAkhir, setTanggalAkhir] = useState<string>('');
  const [dataLaporan, setDataLaporan] = useState<LaporanData>([]);
  const [isLoading, setIsLoading] = useState(false); // Loading data laporan
  const [isExporting, setIsExporting] = useState(false); // Loading ekspor
  const [error, setError] = useState('');

  const fetchLaporan = useCallback(async () => {
    // Jangan fetch jika belum login atau tipe belum dipilih, atau sedang loading auth
    if (!isLoggedIn || !tipeLaporan || isLoadingAuth) return;

    setIsLoading(true);
    setError('');
    setDataLaporan([]);

    let url = `http://localhost:8080/api/laporan/${tipeLaporan}`;
    const params = new URLSearchParams();
    if (tanggalMulai) params.append('start', tanggalMulai);
    if (tanggalAkhir) params.append('end', tanggalAkhir);
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    console.log("Fetching report from:", url); // Debug URL

    try {
      const response = await fetchWithAuth(url);
      if (!response.ok) {
        let errorMsg = `Gagal mengambil laporan ${tipeLaporan}`;
        try {
            const errData = await response.json();
            errorMsg = errData.error || errorMsg;
        } catch (jsonError) {
             errorMsg = await response.text() || errorMsg; // Fallback jika response bukan JSON
        }
        throw new Error(errorMsg);
      }
      const data = await response.json();
      console.log("Data received:", data); // Debug data
      setDataLaporan(data || []);
    } catch (err: any) {
      console.error("Fetch laporan error:", err);
       if (err.message !== 'Anda belum login.' && err.message !== 'Sesi Anda tidak valid atau telah berakhir. Silakan login kembali.') {
          setError(err.message);
       }
       setDataLaporan([]); // Pastikan data kosong jika error
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, isLoadingAuth, tipeLaporan, tanggalMulai, tanggalAkhir, fetchWithAuth]);

   // Redirect jika belum login setelah auth selesai loading
   useEffect(() => {
    if (!isLoadingAuth && !isLoggedIn) {
        console.log("Not logged in, redirecting...");
        router.push('/login');
    }
   }, [isLoadingAuth, isLoggedIn, router]);

  // Handler untuk tombol filter
  const handleFilterSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      fetchLaporan(); // Panggil fetch saat tombol ditekan
  };

  // Handler untuk tombol ekspor
  const handleExport = () => {
     if (dataLaporan.length === 0) {
        alert("Tidak ada data untuk diekspor.");
        return;
    }
    setIsExporting(true);
    setError('');

    try {
        let dataToExport: any[] = [];
        // let headers: string[] = []; // Header otomatis dari key objek
        let sheetName: string = "Laporan";
        let fileName: string = "Laporan_Posyandu";
        let columnWidths: XLSX.ColInfo[] = []; // Gunakan tipe ColInfo

        const timestamp = new Date().toISOString().slice(0, 10);
        fileName += `_${tipeLaporan}_${timestamp}.xlsx`; // Nama file lebih spesifik

        switch (tipeLaporan) {
            case 'wali':
                sheetName = "Data Wali";
                dataToExport = (dataLaporan as Ibu[]).map(d => ({
                    "Nama Lengkap": d.nama_lengkap || '-', "NIK": d.nik || '-', "No Telepon": d.no_telepon || '-',
                    "Alamat": d.alamat || '-', "Tgl Daftar": formatTanggal(d.created_at), // Hanya tanggal
                    "Terakhir Update": formatTanggal(d.updated_at)
                }));
                 columnWidths = [{ wch: 25 }, { wch: 20 }, { wch: 18 }, { wch: 40 }, { wch: 18 }, { wch: 18 }];
                break;
            case 'anak':
                sheetName = "Data Anak";
                 dataToExport = (dataLaporan as Anak[]).map(d => ({
                    "Nama Anak": d.nama_anak || '-', "Nama Ibu": d.nama_ibu || '-', "NIK Anak": d.nik_anak || '-',
                    "Tgl Lahir": formatDisplayTanggal(d.tanggal_lahir),
                    "JK": d.jenis_kelamin === 'L' ? 'Laki-laki' : (d.jenis_kelamin === 'P' ? 'Perempuan' : '-'),
                    "Anak Ke": d.anak_ke ?? '-', "BB Lahir (kg)": d.berat_lahir_kg ?? '-', "TB Lahir (cm)": d.tinggi_lahir_cm ?? '-',
                    "Tgl Daftar": formatTanggal(d.created_at),
                }));
                 columnWidths = [{ wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 18 }, { wch: 12 }, { wch: 8 }, { wch: 15 }, { wch: 15 }, { wch: 18 }];
                break;
            case 'perkembangan':
                 sheetName = "Data Perkembangan";
                 dataToExport = (dataLaporan as Perkembangan[]).map(d => ({
                    "Nama Anak": d.nama_anak || '-',
                    "NIK Anak": d.nik_anak || '-', // Kolom NIK Anak
                    "Nama Ibu": d.nama_ibu || '-', // Kolom Nama Ibu
                    "NIK Ibu": d.nik_ibu || '-', // Kolom NIK Ibu
                    "Tgl Periksa": formatDisplayTanggal(d.tanggal_pemeriksaan),
                    "BB (kg)": d.bb_kg ?? '-', "TB (cm)": d.tb_cm ?? '-', "LK (cm)": d.lk_cm ?? '-', "LL (cm)": d.ll_cm ?? '-',
                    "Status Gizi": d.status_gizi || '-', "Saran": d.saran || '-', "Kader Pencatat": d.nama_kader || '-'
                }));
                 columnWidths = [{ wch: 25 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 30 }, { wch: 20 }];
                break;
            case 'imunisasi':
                 sheetName = "Data Imunisasi";
                 dataToExport = (dataLaporan as RiwayatImunisasi[]).map(d => ({
                    "Nama Anak": d.nama_anak || '-', "Nama Imunisasi": d.nama_imunisasi || '-',
                    "Tgl Diberikan": formatDisplayTanggal(d.tanggal_imunisasi), // Sesuaikan field
                    "Catatan": d.catatan || '-', "Kader Pencatat": d.nama_kader || '-', "Kader Update": d.nama_kader_updater || '-'
                }));
                 columnWidths = [{ wch: 25 }, { wch: 20 }, { wch: 18 }, { wch: 30 }, { wch: 20 }, { wch: 20 }];
                break;
            default:
                 throw new Error("Tipe laporan tidak dikenal");
        }

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        worksheet['!cols'] = columnWidths; // Terapkan lebar kolom
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        XLSX.writeFile(workbook, fileName);

    } catch (err: any) {
        console.error("Export failed:", err);
        setError("Gagal mengekspor data: " + err.message);
    } finally {
        setIsExporting(false);
    }
  };

  // Fungsi untuk render tabel berdasarkan tipe laporan
  // Fungsi untuk render tabel berdasarkan tipe laporan
    const renderTable = () => {
      if (isLoading) {
        return <div className="text-center p-8 text-gray-500">Memuat data laporan...</div>;
      }
      // Tampilkan error HANYA jika tidak sedang loading
      if (error && !isLoading) {
        return <div className="text-center p-8 text-red-500">{error}</div>;
      }
      // Tampilkan pesan jika tidak loading, tidak error, tapi data kosong
      if (!isLoading && !error && dataLaporan.length === 0) {
        return <div className="text-center p-8 text-gray-500">Tidak ada data ditemukan untuk filter yang dipilih.</div>;
      }

      switch (tipeLaporan) {
        case 'wali':
          return (
            <table className="w-full text-sm text-left">
              {/* PERUBAHAN: Tambah kolom Tgl Daftar */}
              <thead className="bg-gray-50 text-gray-600 uppercase whitespace-nowrap"><tr><th className="px-6 py-3">Nama</th><th className="px-6 py-3">NIK</th><th className="px-6 py-3">Telepon</th><th className="px-6 py-3">Alamat</th><th className="px-6 py-3">Tgl Daftar</th></tr></thead>
              <tbody className="text-gray-700">
                {(dataLaporan as Ibu[]).map(d => (
                  <tr key={d.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{d.nama_lengkap || '-'}</td>
                    <td className="px-6 py-4">{d.nik || '-'}</td>
                    <td className="px-6 py-4">{d.no_telepon || '-'}</td>
                    <td className="px-6 py-4 truncate max-w-xs">{d.alamat || '-'}</td>
                    {/* PERUBAHAN: Gunakan formatDisplayTanggal */}
                    <td className="px-6 py-4 whitespace-nowrap">{formatDisplayTanggal(d.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          );
        case 'anak':
          return (
            <table className="w-full text-sm text-left">
              {/* PERUBAHAN: Tambah kolom Tgl Daftar */}
              <thead className="bg-gray-50 text-gray-600 uppercase whitespace-nowrap"><tr><th className="px-6 py-3">Nama Anak</th><th className="px-6 py-3">Nama Ibu</th><th className="px-6 py-3">NIK Anak</th><th className="px-6 py-3">Tgl Lahir</th><th className="px-6 py-3">JK</th><th className="px-6 py-3">Anak Ke</th><th className="px-6 py-3">BB Lahir</th><th className="px-6 py-3">TB Lahir</th><th className="px-6 py-3">Tgl Daftar</th></tr></thead>
              <tbody className="text-gray-700">
                {(dataLaporan as Anak[]).map(d => (
                  <tr key={d.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{d.nama_anak || '-'}</td>
                    <td className="px-6 py-4">{d.nama_ibu || '-'}</td>
                    <td className="px-6 py-4">{d.nik_anak || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{formatDisplayTanggal(d.tanggal_lahir)}</td>
                    <td className="px-6 py-4">{d.jenis_kelamin}</td>
                    <td className="px-6 py-4 text-center">{d.anak_ke ?? '-'}</td>
                    <td className="px-6 py-4 text-center">{d.berat_lahir_kg ?? '-'}</td>
                    <td className="px-6 py-4 text-center">{d.tinggi_lahir_cm ?? '-'}</td>
                    {/* PERUBAHAN: Tambah kolom Tgl Daftar */}
                    <td className="px-6 py-4 whitespace-nowrap">{formatDisplayTanggal(d.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          );
        case 'perkembangan':
         return (
          <table className="w-full text-sm text-left">
             {/* PERUBAHAN: Tambahkan header NIK Anak, Nama Ibu, NIK Ibu */}
             <thead className="bg-gray-50 text-gray-600 uppercase whitespace-nowrap">
               <tr>
                 <th className="px-6 py-3">Nama Anak</th>
                 <th className="px-6 py-3">NIK Anak</th> 
                 <th className="px-6 py-3">Nama Ibu</th> 
                 <th className="px-6 py-3">NIK Ibu</th> 
                 <th className="px-6 py-3">Tgl Periksa</th>
                 <th className="px-6 py-3">BB(kg)</th>
                 <th className="px-6 py-3">TB(cm)</th>
                 <th className="px-6 py-3">LK(cm)</th>
                 <th className="px-6 py-3">LL(cm)</th>
                 <th className="px-6 py-3">Status Gizi</th>
                 <th className="px-6 py-3">Saran</th>
                 <th className="px-6 py-3">Kader</th>
               </tr>
             </thead>
             <tbody className="text-gray-700">
                {(dataLaporan as Perkembangan[]).map(d => (
                 <tr key={d.id} className="border-b hover:bg-gray-50">
                   <td className="px-6 py-4 font-medium">{d.nama_anak || '-'}</td>
                   <td className="px-6 py-4">{d.nik_anak || '-'}</td>
                   <td className="px-6 py-4">{d.nama_ibu || '-'}</td>
                   <td className="px-6 py-4">{d.nik_ibu || '-'}</td> 
                   <td className="px-6 py-4 whitespace-nowrap">{formatDisplayTanggal(d.tanggal_pemeriksaan)}</td>
                   <td className="px-6 py-4 text-center">{d.bb_kg ?? '-'}</td>
                   <td className="px-6 py-4 text-center">{d.tb_cm ?? '-'}</td>
                   <td className="px-6 py-4 text-center">{d.lk_cm ?? '-'}</td>
                   <td className="px-6 py-4 text-center">{d.ll_cm ?? '-'}</td>
                   <td className="px-6 py-4">{d.status_gizi || '-'}</td>
                   <td className="px-6 py-4 truncate max-w-xs">{d.saran || '-'}</td>
                   <td className="px-6 py-4">{d.nama_kader || '-'}</td>
                 </tr>
               ))}
            </tbody>
           </table>
        );
        case 'imunisasi':
            // Tidak ada perubahan di sini, sudah benar
            return (
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 uppercase whitespace-nowrap"><tr><th className="px-6 py-3">Nama Anak</th><th className="px-6 py-3">Imunisasi</th><th className="px-6 py-3">Tgl Diberikan</th><th className="px-6 py-3">Catatan</th><th className="px-6 py-3">Kader</th></tr></thead>
                <tbody className="text-gray-700">
                  {(dataLaporan as RiwayatImunisasi[]).map(d => (
                  <tr key={d.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{d.nama_anak || '-'}</td><td className="px-6 py-4">{d.nama_imunisasi || '-'}</td><td className="px-6 py-4 whitespace-nowrap">{formatDisplayTanggal(d.tanggal_imunisasi)}</td><td className="px-6 py-4 truncate max-w-xs">{d.catatan || '-'}</td><td className="px-6 py-4">{d.nama_kader || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          );
        default:
          // Jangan tampilkan pesan "Pilih tipe laporan" jika sedang loading
          return !isLoading ? <div className="text-center p-8 text-gray-500">Pilih tipe laporan dan terapkan filter untuk melihat data.</div> : null;
      }
    };

   // Render loading auth atau null jika belum login (redirect sedang proses)
   if (isLoadingAuth) {
        return <div className="text-center p-8">Memverifikasi sesi...</div>;
   }
   if (!isLoggedIn) {
        return null; // atau <div className="text-center p-8">Mengarahkan ke halaman login...</div>;
   }


  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Laporan Data Posyandu</h1>
        <p className="text-gray-600 mt-1">Filter dan ekspor data posyandu berdasarkan periode.</p>
      </header>

      {/* --- Filter --- */}
      <div className="bg-white rounded-xl shadow-md p-6 sm:p-8 mb-8">
        <form onSubmit={handleFilterSubmit} className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Filter Laporan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <Label htmlFor="tipeLaporan">Tipe Laporan *</Label>
              <Select value={tipeLaporan} onValueChange={setTipeLaporan} required>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Pilih Tipe Laporan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wali">Data Wali (Berdasarkan Tgl Daftar)</SelectItem>
                  <SelectItem value="anak">Data Anak (Berdasarkan Tgl Daftar)</SelectItem>
                  <SelectItem value="perkembangan">Data Perkembangan (Berdasarkan Tgl Periksa)</SelectItem>
                  <SelectItem value="imunisasi">Data Imunisasi (Berdasarkan Tgl Pemberian)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="tanggalMulai">Dari Tanggal</Label>
              <Input type="date" id="tanggalMulai" value={tanggalMulai} onChange={(e) => setTanggalMulai(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="tanggalAkhir">Sampai Tanggal</Label>
              <Input type="date" id="tanggalAkhir" value={tanggalAkhir} onChange={(e) => setTanggalAkhir(e.target.value)} className="mt-1" />
            </div>
            <div className="flex gap-2 pt-5"> {/* Beri sedikit padding atas */}
                 <Button type="submit" disabled={isLoading || !tipeLaporan} className="w-full bg-cyan-800 hover:bg-cyan-700 cursor-pointer">
                    <Filter className="w-4 h-4 mr-2"/> Terapkan
                 </Button>
            </div>
          </div>
           {/* Tampilkan error filter jika ada dan tidak sedang loading */}
           {error && !isLoading && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </form>
      </div>

      {/* --- Hasil Laporan & Tombol Ekspor --- */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl font-bold text-gray-800">
            Hasil Laporan: {tipeLaporan ? (tipeLaporan.charAt(0).toUpperCase() + tipeLaporan.slice(1)) : '...'}
          </h2>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isExporting || isLoading || dataLaporan.length === 0}
            className="cursor-pointer"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Mengekspor...' : 'Ekspor Excel'}
          </Button>
        </div>
        <div className="overflow-x-auto">
          {renderTable()}
        </div>
      </div>
    </>
  );
}