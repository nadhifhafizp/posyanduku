// src/app/(main)/master-imunisasi/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation'; // <-- 1. Import useRouter
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext'; // <-- 2. Import useAuth
import { useFetchWithAuth } from '@/lib/utils'; // <-- 3. Import useFetchWithAuth

// --- Interface & Tipe Data ---
interface MasterImunisasi {
  id: number;
  nama_imunisasi: string;
  usia_ideal_bulan: number;
  deskripsi: string | null;
  created_at: string;
  updated_at: string | null;
}

// Tipe untuk form tambah data
type TambahImunisasiFormData = {
  nama_imunisasi: string;
  usia_ideal_bulan: string;
  deskripsi: string;
}

// Tipe untuk form edit data (di modal)
type EditImunisasiFormData = {
  nama_imunisasi: string;
  usia_ideal_bulan: string;
  deskripsi: string;
}

// --- Fungsi Debounce ---
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => { timeout = null; func(...args); };
    if (timeout) { clearTimeout(timeout); }
    timeout = setTimeout(later, wait);
  };
}

export default function MasterImunisasiPage() {
  const router = useRouter(); // <-- 4. Inisialisasi router
  const { isLoggedIn, authToken } = useAuth(); // <-- 5. Gunakan useAuth
  const fetchWithAuth = useFetchWithAuth(); // <-- 6. Dapatkan fungsi fetch terautentikasi

  // --- State ---
  const [daftarImunisasi, setDaftarImunisasi] = useState<MasterImunisasi[]>([]);
  const [tambahFormData, setTambahFormData] = useState<TambahImunisasiFormData>({
    nama_imunisasi: '',
    usia_ideal_bulan: '',
    deskripsi: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // State untuk Modal Edit
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingImunisasi, setEditingImunisasi] = useState<MasterImunisasi | null>(null);
  const [editFormData, setEditFormData] = useState<EditImunisasiFormData>({
    nama_imunisasi: '',
    usia_ideal_bulan: '',
    deskripsi: '',
  });

  // API URL
  const API_URL = 'http://localhost:8080/api/master-imunisasi';

  // --- Fungsi Fetch Imunisasi ---
  const fetchImunisasi = useCallback(async (query: string = '') => {
    setIsFetching(true);
    setError(''); // Clear error on fetch
    let url = API_URL;
    if (query) {
      url += `?search=${encodeURIComponent(query)}`;
    }
    try {
      // Gunakan fetchWithAuth jika GET perlu login
      const response = await fetchWithAuth(url);
      if (!response.ok) {
        let errorMsg = 'Gagal mengambil data imunisasi';
        try { const errorData = await response.json(); errorMsg = errorData.error || errorMsg; }
        catch (jsonError) { errorMsg = await response.text() || errorMsg; }
        throw new Error(errorMsg);
      }
      const data: MasterImunisasi[] | null = await response.json();
      setDaftarImunisasi(data || []);
    } catch (err: any) {
      console.error("Fetch imunisasi failed:", err);
       if (err.message !== 'Anda belum login.' && err.message !== 'Sesi Anda tidak valid atau telah berakhir. Silakan login kembali.') {
            setError('Tidak dapat memuat data master imunisasi.');
       }
      setDaftarImunisasi([]);
    } finally {
      setIsFetching(false);
    }
  }, [fetchWithAuth]); // <-- Tambah dependensi

  const debouncedFetch = useCallback(debounce(fetchImunisasi, 500), [fetchImunisasi]);

   // --- useEffect untuk fetch data awal dan redirect ---
   useEffect(() => {
    if (isLoggedIn) {
      fetchImunisasi();
    } else {
       const checkAuthAndRedirect = async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
            if (!localStorage.getItem('authToken')) {
                console.log("Belum login (master imunisasi), mengarahkan ke /login...");
                router.push('/login');
            }
       };
       if (!isFetching) { // Cek setelah fetch awal selesai
             checkAuthAndRedirect();
       }
    }
  }, [isLoggedIn, isFetching, fetchImunisasi, router]); // Tambahkan dependensi


  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setError('');
    setSuccess('');
    debouncedFetch(query);
  };

  // --- Fungsi Tambah Data ---
  const handleTambahFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setTambahFormData(prevState => ({ ...prevState, [id]: value }));
  };

  const handleTambahSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    const usiaIdeal = parseInt(tambahFormData.usia_ideal_bulan, 10);
    if (isNaN(usiaIdeal) || usiaIdeal < 0) {
        setError("Usia Ideal (Bulan) harus berupa angka positif.");
        setIsLoading(false);
        return;
    }

    const payload = {
      nama_imunisasi: tambahFormData.nama_imunisasi,
      usia_ideal_bulan: usiaIdeal,
      deskripsi: tambahFormData.deskripsi || null
    };

    try {
      // Gunakan fetchWithAuth untuk POST
      const response = await fetchWithAuth(API_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal menambah data imunisasi.');
      setSuccess('Master imunisasi baru berhasil ditambahkan!');
      setTambahFormData({ nama_imunisasi: '', usia_ideal_bulan: '', deskripsi: '' });
      fetchImunisasi(searchQuery);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Fungsi Update Data ---
  const handleOpenEditModal = (imunisasi: MasterImunisasi) => {
    setEditingImunisasi(imunisasi);
    setEditFormData({
      nama_imunisasi: imunisasi.nama_imunisasi || '',
      usia_ideal_bulan: String(imunisasi.usia_ideal_bulan ?? '0'),
      deskripsi: imunisasi.deskripsi || '',
    });
    setIsEditModalOpen(true);
    setError('');
    setSuccess('');
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setEditFormData(prevState => ({ ...prevState, [id]: value }));
  };

  const handleUpdateSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingImunisasi) return;
    setIsLoading(true);
    setError('');

    const usiaIdeal = parseInt(editFormData.usia_ideal_bulan, 10);
     if (isNaN(usiaIdeal) || usiaIdeal < 0) {
        setError("Usia Ideal (Bulan) harus berupa angka positif.");
        setIsLoading(false);
        return;
    }

    const payload = {
      nama_imunisasi: editFormData.nama_imunisasi,
      usia_ideal_bulan: usiaIdeal,
      deskripsi: editFormData.deskripsi || null
    };

    try {
      // Gunakan fetchWithAuth untuk PUT
      const response = await fetchWithAuth(`${API_URL}/${editingImunisasi.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal memperbarui data.');
      setSuccess('Data imunisasi berhasil diperbarui!');
      setIsEditModalOpen(false);
      fetchImunisasi(searchQuery);
    } catch (err: any) {
      setError(err.message); // Tampilkan error DI DALAM modal
    } finally {
      setIsLoading(false);
    }
  };

  // --- Fungsi Delete Data ---
  const handleDelete = async (id: number, nama: string) => {
    if (!confirm(`Anda yakin ingin menghapus data imunisasi "${nama}"?`)) { return; }
    setError('');
    setSuccess('');
    try {
      // Gunakan fetchWithAuth untuk DELETE
      const response = await fetchWithAuth(`${API_URL}/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal menghapus data.');
      setSuccess(`Data "${nama}" berhasil dihapus!`);
      fetchImunisasi(searchQuery);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // --- Fungsi Format Tanggal ---
  const formatTanggal = (tanggalString: string | null) => {
    if (!tanggalString) return 'N/A';
     try {
        return new Date(tanggalString).toLocaleString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
     } catch(e) { return 'Invalid Date'; }
  };

  // Render loading atau pesan jika belum login
   if (isFetching && !daftarImunisasi.length) {
     return <div className="text-center p-8">Memuat data...</div>;
   }
   if (!isLoggedIn && !isFetching) {
     return <div className="text-center p-8">Anda harus login untuk mengakses halaman ini. Mengarahkan...</div>;
   }


  return (
    <>
      {/* --- Header --- */}
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Master Data Imunisasi
        </h1>
        <p className="text-gray-600 mt-1">
          Kelola daftar imunisasi yang tersedia di Posyandu.
        </p>
      </header>

      {/* --- Form Tambah Data --- */}
      <div className="mb-8">
        <div className="bg-white rounded-xl shadow-md p-6 sm:p-8">
          <form onSubmit={handleTambahSubmit} className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Tambah Master Imunisasi</h2>

            <div>
              <Label htmlFor="nama_imunisasi">Nama Imunisasi *</Label>
              <Input
                type="text"
                id="nama_imunisasi"
                value={tambahFormData.nama_imunisasi}
                onChange={handleTambahFormChange}
                required
                placeholder="Contoh: Polio 1"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="usia_ideal_bulan">Usia Ideal (Bulan) *</Label>
              <Input
                type="number"
                id="usia_ideal_bulan"
                value={tambahFormData.usia_ideal_bulan}
                onChange={handleTambahFormChange}
                required
                placeholder="Contoh: 1"
                className="mt-1"
                min="0"
              />
            </div>

            <div>
              <Label htmlFor="deskripsi">Deskripsi</Label>
              <Textarea
                id="deskripsi"
                value={tambahFormData.deskripsi}
                onChange={handleTambahFormChange}
                placeholder="Keterangan tambahan (Opsional)"
                className="mt-1"
                rows={3}
              />
            </div>

            {/* Pesan Error/Success untuk form tambah */}
            {error && !isEditModalOpen && <p className="text-red-500 text-center font-medium pt-2">{error}</p>}
            {success && !isEditModalOpen && <p className="text-green-600 text-center font-medium pt-2">{success}</p>}

            <div className="pt-4">
              <Button type="submit" disabled={isLoading || !isLoggedIn} className="w-full py-3 bg-cyan-800 hover:bg-cyan-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                {isLoading ? 'Menyimpan...' : 'Simpan Data Imunisasi'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* --- Tabel Data Imunisasi --- */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {/* Header Tabel */}
        <div className="p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl font-bold text-gray-800">Data Imunisasi Tersedia</h2>
          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Cari Nama Imunisasi..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-10 pr-4 py-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>
        {/* Tabel Wrapper */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 uppercase">
              <tr>
                <th className="px-6 py-3">Nama Imunisasi</th>
                <th className="px-6 py-3">Usia Ideal (Bln)</th>
                <th className="px-6 py-3">Deskripsi</th>
                <th className="px-6 py-3">Dibuat</th>
                <th className="px-6 py-3">Diperbarui</th>
                <th className="px-6 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
               {isFetching && daftarImunisasi.length === 0 ? ( // Perbaiki kondisi loading
                <tr><td colSpan={6} className="text-center p-8 text-gray-500">Memuat data imunisasi...</td></tr>
              ) : daftarImunisasi.length > 0 ? (
                daftarImunisasi.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{item.nama_imunisasi}</td>
                    <td className="px-6 py-4">{item.usia_ideal_bulan} Bln</td>
                    <td className="px-6 py-4 max-w-xs truncate" title={item.deskripsi || ''}>{item.deskripsi || '-'}</td>
                    <td className="px-6 py-4">{formatTanggal(item.created_at)}</td>
                    <td className="px-6 py-4">{formatTanggal(item.updated_at)}</td>
                    <td className="px-6 py-4 flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(item)} className="cursor-pointer">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id, item.nama_imunisasi)} className="cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="text-center p-8 text-gray-500">
                  {searchQuery ? `Tidak ada data ditemukan untuk "${searchQuery}".` : "Belum ada data master imunisasi."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Modal Update Imunisasi --- */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Data Imunisasi</DialogTitle>
            <DialogDescription>
              Perbarui data imunisasi di bawah ini.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSubmit} className="space-y-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="nama_imunisasi_edit">Nama Imunisasi *</Label> {/* ID unik */}
              <Input
                id="nama_imunisasi" // Tetap nama_imunisasi sesuai state
                value={editFormData.nama_imunisasi}
                onChange={handleEditFormChange}
                required
                className="mt-1"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="usia_ideal_bulan_edit">Usia Ideal (Bulan) *</Label> {/* ID unik */}
              <Input
                id="usia_ideal_bulan" // Tetap usia_ideal_bulan sesuai state
                type="number"
                value={editFormData.usia_ideal_bulan}
                onChange={handleEditFormChange}
                required
                min="0"
                className="mt-1"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="deskripsi_edit">Deskripsi</Label> {/* ID unik */}
              <Textarea
                id="deskripsi" // Tetap deskripsi sesuai state
                value={editFormData.deskripsi}
                onChange={handleEditFormChange}
                placeholder="(Opsional)"
                rows={3}
                className="mt-1"
              />
            </div>

            {/* Error di modal */}
            {error && isEditModalOpen && <p className="text-red-500 text-center pt-2">{error}</p>}

            <DialogFooter className="pt-4 sm:justify-between">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="cursor-pointer">Batal</Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading} className="cursor-pointer bg-cyan-800 hover:bg-cyan-700">
                {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}