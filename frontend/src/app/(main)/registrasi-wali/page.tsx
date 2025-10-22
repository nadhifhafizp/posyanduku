// src/app/(main)/registrasi-wali/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation'; // <-- 1. Pastikan useRouter diimpor
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFetchWithAuth } from '@/lib/utils'; // <-- 2. Pastikan path benar

// --- Interface & Tipe Data ---
interface Ibu {
  id: number;
  nama_lengkap: string | null;
  nik: string | null;
  no_telepon: string | null;
  alamat: string | null;
  created_at: string;
  updated_at: string | null;
  // id_kader_pendaftar: number | null; // Tidak perlu jika diambil dari token
}

// Tipe untuk form edit data (di modal)
type EditFormData = {
  nama_lengkap: string;
  nik: string;
  no_telepon: string;
  alamat: string;
}

// --- Fungsi Debounce ---
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

export default function DataIbuPage() {
  // --- State ---
  const [daftarIbu, setDaftarIbu] = useState<Ibu[]>([]);
  const [formData, setFormData] = useState({
    nama_lengkap: '',
    nik: '',
    no_telepon: '',
    alamat: ''
  });

  const router = useRouter(); // Inisialisasi router
  const { isLoggedIn, kaderId, authToken } = useAuth(); // Gunakan useAuth (kaderId dari sini)
  const fetchWithAuth = useFetchWithAuth(); // Dapatkan fungsi fetch terautentikasi

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // State untuk Modal Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIbu, setEditingIbu] = useState<Ibu | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    nama_lengkap: '',
    nik: '',
    no_telepon: '',
    alamat: '',
  });

  // HAPUS state useState kaderId (sudah ada dari useAuth)

  // API URL
  const API_URL = 'http://localhost:8080/api/ibu';

  // --- Fungsi Fetch Ibu ---
  const fetchIbu = useCallback(async (query: string = '') => {
    setIsFetching(true);
    setError('');
    let url = API_URL;
    if (query) {
      url += `?search=${encodeURIComponent(query)}`;
    }
    try {
      // Ganti fetch biasa dengan fetchWithAuth jika endpoint GET dilindungi di backend
      const response = await fetchWithAuth(url); // GANTI KE fetchWithAuth JIKA PERLU
      if (!response.ok) {
        let errorMsg = 'Gagal mengambil data';
        try { const errorData = await response.json(); errorMsg = errorData.error || errorMsg; }
        catch (jsonError) { /* ignore json error */ errorMsg = await response.text() || errorMsg; }
        throw new Error(errorMsg);
      }
      const data: Ibu[] | null = await response.json();
      setDaftarIbu(data || []);
    }
    catch (err: any) {
      console.error("Fetch failed:", err);
      // Jangan set error jika error karena 401/belum login (sudah dihandle hook/redirect)
      if (err.message !== 'Anda belum login.' && err.message !== 'Sesi Anda tidak valid atau telah berakhir. Silakan login kembali.') {
         setError('Tidak dapat memuat data wali terdaftar.');
      }
      setDaftarIbu([]);
    } finally {
      setIsFetching(false);
    }
  }, [fetchWithAuth]); // <-- Tambahkan fetchWithAuth sbg dependensi

  const debouncedFetch = useCallback(debounce(fetchIbu, 500), [fetchIbu]);

  // --- useEffect untuk fetch data awal dan redirect ---
  useEffect(() => {
    if (isLoggedIn) {
      fetchIbu();
    } else {
       // Cek apakah sudah selesai loading awal sebelum redirect
       // Ini mencegah redirect saat halaman pertama kali load & auth state belum siap
       const checkAuthAndRedirect = async () => {
            // Tunggu sebentar untuk memastikan state auth sudah terupdate
            await new Promise(resolve => setTimeout(resolve, 0));
            if (!localStorage.getItem('authToken')) { // Cek langsung ke localStorage sebagai fallback
                console.log("Belum login, mengarahkan ke /login...");
                router.push('/login');
            } else if (!isLoggedIn){
                 // Jika ada token tapi isLoggedIn false, mungkin state belum sinkron
                 console.log("State isLoggedIn belum sinkron, menunggu...");
            }
       };
       checkAuthAndRedirect();
    }
  }, [isLoggedIn, fetchIbu, router]);

 // --- HAPUS useEffect yang mengambil dari localStorage manual ---

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedFetch(query);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prevState => ({ ...prevState, [id]: value }));
  };

  // --- Handler Submit form tambah ---
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    // Validasi ID Kader tidak diperlukan jika backend mengambil dari token
    // if (!kaderId) { ... } // Hapus ini

    try {
      // Gunakan fetchWithAuth untuk POST
      const response = await fetchWithAuth(API_URL, {
        method: 'POST',
        // Body TANPA id_kader_pendaftar jika backend mengambilnya dari token
        body: JSON.stringify({ ...formData }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal menambahkan data.');

      setSuccess('Data Wali berhasil ditambahkan!');
      setFormData({ nama_lengkap: '', nik: '', no_telepon: '', alamat: '' }); // Reset form
      fetchIbu(searchQuery); // Refresh tabel
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handler untuk Modal Edit ---
  const handleOpenEditModal = (ibu: Ibu) => {
    setEditingIbu(ibu);
    setEditFormData({
      nama_lengkap: ibu.nama_lengkap || '',
      nik: ibu.nik || '',
      no_telepon: ibu.no_telepon || '',
      alamat: ibu.alamat || '',
    });
    setIsModalOpen(true);
    setError('');
    setSuccess('');
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setEditFormData(prevState => ({ ...prevState, [id]: value }));
  };

  const handleUpdateSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingIbu) return;
    setIsLoading(true);
    setError('');

    try {
      // Gunakan fetchWithAuth untuk PUT
      const response = await fetchWithAuth(`${API_URL}/${editingIbu.id}`, {
        method: 'PUT',
        body: JSON.stringify(editFormData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal memperbarui data.');

      setSuccess('Data Wali berhasil diperbarui!');
      setIsModalOpen(false);
      fetchIbu(searchQuery);
    } catch (err: any) {
      setError(err.message); // Tampilkan error di modal
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handler Delete ---
  const handleDelete = async (id: number) => {
    if (!confirm('Anda yakin ingin menghapus data wali ini?')) { return; }
    setError('');
    setSuccess('');
    try {
      // Gunakan fetchWithAuth untuk DELETE
      const response = await fetchWithAuth(`${API_URL}/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal menghapus data.');

      setSuccess('Data Wali berhasil dihapus!');
      fetchIbu(searchQuery);
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
    } catch (e) { return 'Invalid Date'}
  };

   // Render loading atau pesan jika belum login
   if (isFetching && !daftarIbu.length) { // Tampilkan loading jika sedang fetch awal
     return <div className="text-center p-8">Memuat data...</div>;
   }
   if (!isLoggedIn && !isFetching) { // Tampilkan pesan jika sudah selesai fetch tapi belum login
     return <div className="text-center p-8">Anda harus login untuk mengakses halaman ini. Mengarahkan...</div>;
   }

  return (
    <div className="flex flex-col gap-9">
      {/* --- Form Create --- */}
      <div className="bg-white rounded-xl shadow-md p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Daftarkan Wali / Ibu Baru</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {/* Kolom Kiri */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="nama_lengkap">Nama Lengkap *</Label>
                <Input type="text" id="nama_lengkap" value={formData.nama_lengkap} onChange={handleChange} required placeholder="Masukkan nama lengkap" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="nik">Nomor Induk Kependudukan (NIK) *</Label>
                <Input type="text" id="nik" value={formData.nik} onChange={handleChange} required placeholder="Masukkan 16 digit NIK" className="mt-1" maxLength={16} />
              </div>
              <div>
                <Label htmlFor="no_telepon">Nomor Telepon *</Label>
                <Input type="text" id="no_telepon" value={formData.no_telepon} onChange={handleChange} required placeholder="Contoh: 081234567890" className="mt-1" />
              </div>
            </div>
            {/* Kolom Kanan */}
            <div className="space-y-1">
              <Label htmlFor="alamat">Alamat Lengkap *</Label>
              <Textarea id="alamat" value={formData.alamat} onChange={handleChange} required placeholder="Masukkan alamat lengkap" className="mt-1 h-full min-h-[170px] md:min-h-[220px] resize-none" />
            </div>
          </div>
          {/* Tampilkan error/success HANYA jika TIDAK di modal */}
          {error && !isModalOpen && <p className="text-red-500 text-center font-medium pt-2">{error}</p>}
          {success && !isModalOpen && <p className="text-green-600 text-center font-medium pt-2">{success}</p>}
          <div className="pt-4">
            <Button type="submit" disabled={isLoading || !isLoggedIn} className="w-full py-3 bg-cyan-800 hover:bg-cyan-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? 'Menyimpan...' : 'Daftarkan Wali'}
            </Button>
          </div>
        </form>
      </div>

      {/* --- Tabel Read --- */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <h2 className="text-xl font-bold text-gray-800">Data Wali Terdaftar</h2>
           <div className="relative w-full sm:w-64">
             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
             <Input
               type="text"
               placeholder="Cari Nama / NIK..."
               value={searchQuery}
               onChange={handleSearchChange}
               className="pl-10 pr-4 py-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
             />
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 uppercase">
              <tr>
                <th className="px-6 py-3">Nama Lengkap</th>
                <th className="px-6 py-3">NIK</th>
                <th className="px-6 py-3">No. Telepon</th>
                <th className='px-6 py-3'>Alamat</th>
                <th className="px-6 py-3">Dibuat</th>
                <th className="px-6 py-3">Diperbarui</th>
                <th className="px-6 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
             {/* Kondisi Loading diperbaiki */}
              {isFetching && daftarIbu.length === 0 ? (
                <tr><td colSpan={7} className="text-center p-8">Memuat data...</td></tr>
              ) : daftarIbu.length > 0 ? (
                daftarIbu.map((ibu) => (
                  <React.Fragment key={ibu.id}>
                    <tr className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{ibu.nama_lengkap || '-'}</td>
                      <td className="px-6 py-4">{ibu.nik || '-'}</td>
                      <td className="px-6 py-4">{ibu.no_telepon || '-'}</td>
                      <td className="px-6 py-4 truncate max-w-xs" title={ibu.alamat || ''}>{ibu.alamat || '-'}</td>
                      <td className="px-6 py-4">{formatTanggal(ibu.created_at)}</td>
                      <td className="px-6 py-4">{formatTanggal(ibu.updated_at)}</td>
                      <td className="px-6 py-4 flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(ibu)} className="cursor-pointer">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(ibu.id)} className="cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  </React.Fragment>
                ))
              ) : (
                <tr><td colSpan={7} className="text-center p-8">
                    {searchQuery ? `Tidak ada data ditemukan untuk "${searchQuery}".` : "Belum ada data wali yang terdaftar."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Modal Update --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Data Wali</DialogTitle>
            <DialogDescription>
              Perbarui data wali di bawah ini. Klik simpan jika sudah selesai.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSubmit} className="space-y-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="nama_lengkap_edit">Nama Lengkap *</Label>
              <Input id="nama_lengkap" value={editFormData.nama_lengkap} onChange={handleEditFormChange} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nik_edit">NIK *</Label>
              <Input id="nik" value={editFormData.nik} onChange={handleEditFormChange} required maxLength={16} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="no_telepon_edit">No. Telepon *</Label>
              <Input id="no_telepon" value={editFormData.no_telepon} onChange={handleEditFormChange} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="alamat_edit">Alamat *</Label>
              <Textarea id="alamat" value={editFormData.alamat} onChange={handleEditFormChange} required />
            </div>
            {/* Tampilkan error SPESIFIK modal */}
            {error && isModalOpen && <p className="text-red-500 text-center pt-2">{error}</p>}
            <DialogFooter className="pt-4 sm:justify-between">
              <DialogClose asChild>
                 <Button type="button" variant="outline" className="cursor-pointer">Batal</Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading} className="cursor-pointer">
                {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}