// src/app/(main)/master-imunisasi/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFetchWithAuth } from '@/lib/utils';

// --- Interface & Tipe Data ---
interface MasterImunisasi {
  id: number;
  nama_imunisasi: string;
  usia_ideal_bulan: number;
  deskripsi: string | null;
  created_at: string;
  updated_at: string | null;
}

// Tipe untuk form create/edit
type MasterImunisasiFormData = {
  nama_imunisasi: string;
  usia_ideal_bulan: string; // Terima sebagai string dari input
  deskripsi: string;
}

// --- Fungsi Debounce ---
function debounce<Params extends unknown[]>(func: (...args: Params) => void, wait: number): (...args: Params) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function executedFunction(...args: Params) {
    const later = () => { timeout = null; func(...args); };
    if (timeout) { clearTimeout(timeout); }
    timeout = setTimeout(later, wait);
  };
}

// --- Helper Format Tanggal ---
const formatTanggalWaktu = (tanggalString: string | null) => {
    if (!tanggalString) return 'N/A';
    try {
        const date = new Date(tanggalString);
         if (isNaN(date.getTime())) return 'Invalid Date';
        // Tampilkan WIB
        return date.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
    } catch(e: unknown) {
        console.error("Error formatting date time:", tanggalString, e);
        return 'Invalid Date';
    }
   };


export default function MasterImunisasiPage() {
  const router = useRouter();
  const { isLoggedIn, isLoadingAuth } = useAuth();
  const fetchWithAuth = useFetchWithAuth();

  // --- State ---
  const [daftarMasterImunisasi, setDaftarMasterImunisasi] = useState<MasterImunisasi[]>([]);
  const [formData, setFormData] = useState<MasterImunisasiFormData>({ nama_imunisasi: '', usia_ideal_bulan: '', deskripsi: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Submit/Update/Delete loading
  const [isFetching, setIsFetching] = useState(true); // Table data loading
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMasterImunisasi, setEditingMasterImunisasi] = useState<MasterImunisasi | null>(null);
  const [editFormData, setEditFormData] = useState<MasterImunisasiFormData>({ nama_imunisasi: '', usia_ideal_bulan: '', deskripsi: '' });

  // URL API
  const API_URL_MASTER_IMUNISASI = 'http://localhost:8080/api/master-imunisasi';

  // --- Fetch Master Imunisasi ---
  const fetchMasterImunisasi = useCallback(async (query: string = '') => {
    setIsFetching(true);
    setError('');
    let url = API_URL_MASTER_IMUNISASI;
    if (query) { url += `?search=${encodeURIComponent(query)}`; }
    try {
      const response = await fetchWithAuth(url);
      if (!response.ok) {
        let errorMsg = 'Gagal mengambil data master imunisasi';
        try { const errorData = await response.json(); errorMsg = errorData.error || errorMsg; }
        catch { errorMsg = await response.text() || errorMsg; } // Hapus _error
        throw new Error(errorMsg);
      }
      const data: MasterImunisasi[] = await response.json();
      setDaftarMasterImunisasi(data || []);
    } catch (err: unknown) {
      let message = 'Tidak dapat memuat data master imunisasi.';
       if(err instanceof Error) { message = err.message; }
      console.error("Fetch master imunisasi failed:", message);
       if (message !== 'Anda belum login.' && message !== 'Sesi Anda tidak valid atau telah berakhir. Silakan login kembali.') {
         setError(message);
       }
      setDaftarMasterImunisasi([]);
    } finally {
      setIsFetching(false);
    }
  }, [fetchWithAuth]); // Dependency: fetchWithAuth

  // useCallback untuk debounce (tergantung fetchMasterImunisasi)
  const debouncedFetch = useCallback(debounce(fetchMasterImunisasi, 500), [fetchMasterImunisasi]); // Corrected dependency

  // --- useEffect Fetch Data Awal & Redirect ---
   useEffect(() => {
     if (!isLoadingAuth) {
       if (isLoggedIn) {
         fetchMasterImunisasi(); // Panggil fetch saat komponen dimuat
       } else {
         console.log("MasterImunisasiPage: Belum login, redirecting...");
         router.push('/login');
       }
     }
   }, [isLoadingAuth, isLoggedIn, fetchMasterImunisasi, router]); // Corrected dependency


  // --- Helper Konversi Payload ---
  const preparePayload = (data: MasterImunisasiFormData) => {
      const usiaIdeal = parseInt(data.usia_ideal_bulan, 10);
      if (isNaN(usiaIdeal) || usiaIdeal < 0) {
          throw new Error("Usia Ideal (bulan) harus angka positif atau 0.");
      }
      if (!data.nama_imunisasi.trim()) {
           throw new Error("Nama Imunisasi wajib diisi.");
      }

      const payload = {
          nama_imunisasi: data.nama_imunisasi.trim(),
          usia_ideal_bulan: usiaIdeal,
          deskripsi: data.deskripsi.trim() === '' ? null : data.deskripsi.trim(),
      };
      return payload;
  };

  // --- Handlers ---
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => { const query = e.target.value; setSearchQuery(query); debouncedFetch(query); };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const { id, value } = e.target; setFormData(prevState => ({ ...prevState, [id]: value })); };
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const { id, value } = e.target; setEditFormData(prevState => ({ ...prevState, [id as keyof MasterImunisasiFormData]: value })); };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setIsLoading(true); setError(''); setSuccess('');
    try {
      const payload = preparePayload(formData);
      const response = await fetchWithAuth(API_URL_MASTER_IMUNISASI, { method: 'POST', body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal menambahkan master imunisasi.');
      setSuccess('Master imunisasi berhasil ditambahkan!'); setFormData({ nama_imunisasi: '', usia_ideal_bulan: '', deskripsi: '' }); fetchMasterImunisasi(searchQuery);
    } catch (err: unknown) {
      let message = 'Gagal menambahkan data.';
      if(err instanceof Error) { message = err.message; }
      setError(message);
    } finally { setIsLoading(false); }
  };

  const handleOpenEditModal = (m: MasterImunisasi) => {
    setEditingMasterImunisasi(m);
    setEditFormData({
        nama_imunisasi: m.nama_imunisasi || '',
        usia_ideal_bulan: m.usia_ideal_bulan?.toString() ?? '0',
        deskripsi: m.deskripsi || '',
    });
    setIsModalOpen(true); setError(''); setSuccess('');
  };

  const handleUpdateSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); if (!editingMasterImunisasi) return; setIsLoading(true); setError('');
    try {
      const payload = preparePayload(editFormData);
      const response = await fetchWithAuth(`${API_URL_MASTER_IMUNISASI}/${editingMasterImunisasi.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal memperbarui master imunisasi.');
      setSuccess('Master imunisasi berhasil diperbarui!'); setIsModalOpen(false); fetchMasterImunisasi(searchQuery);
    } catch (err: unknown) {
      let message = 'Gagal memperbarui data.';
      if(err instanceof Error) { message = err.message; }
      setError(message);
    } finally { setIsLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Anda yakin ingin menghapus master imunisasi ini? Ini bisa mempengaruhi data riwayat.')) return; setError(''); setSuccess(''); setIsLoading(true);
    try {
      const response = await fetchWithAuth(`${API_URL_MASTER_IMUNISASI}/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal menghapus master imunisasi.');
      setSuccess('Master imunisasi berhasil dihapus!'); fetchMasterImunisasi(searchQuery);
    } catch (err: unknown) {
      let message = 'Gagal menghapus data.';
      if(err instanceof Error) { message = err.message; }
      setError(message);
    } finally { setIsLoading(false); }
  };


   // --- Render Loading/Redirect ---
   if (isLoadingAuth || (isFetching && daftarMasterImunisasi.length === 0)) {
       return <div className="text-center p-8">Memuat data...</div>;
   }
   if (!isLoadingAuth && !isLoggedIn) {
       return <div className="text-center p-8">Mengarahkan ke halaman login...</div>;
   }


  // --- JSX Return ---
  return (
    <>
      {/* --- Form Create Master Imunisasi --- */}
      <div className="bg-white rounded-xl shadow-md p-6 sm:p-8 mb-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Tambah Master Imunisasi Baru</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div><Label htmlFor="nama_imunisasi">Nama Imunisasi *</Label><Input type="text" id="nama_imunisasi" value={formData.nama_imunisasi} onChange={handleChange} required placeholder="Contoh: BCG" className="mt-1" /></div>
              <div><Label htmlFor="usia_ideal_bulan">Usia Ideal (bulan) *</Label><Input type="number" id="usia_ideal_bulan" value={formData.usia_ideal_bulan} onChange={handleChange} required placeholder="Contoh: 0" min="0" className="mt-1" /></div>
              <div className="md:col-span-2"><Label htmlFor="deskripsi">Deskripsi (Opsional)</Label><Textarea id="deskripsi" value={formData.deskripsi} onChange={handleChange} placeholder="Jelaskan tentang imunisasi ini..." className="mt-1 h-20 resize-none" /></div>
          </div>
          {error && !isModalOpen && <p className="text-red-500 text-center font-medium pt-2">{error}</p>}
          {success && !isModalOpen && <p className="text-green-600 text-center font-medium pt-2">{success}</p>}
          <div className="pt-4"><Button type="submit" disabled={isLoading || !isLoggedIn} className="w-full py-3 bg-cyan-800 hover:bg-cyan-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">{isLoading ? 'Menyimpan...' : 'Tambahkan Master Imunisasi'}</Button></div>
        </form>
      </div>

      {/* --- Tabel Data Master Imunisasi --- */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <h2 className="text-xl font-bold text-gray-800">Daftar Master Imunisasi</h2>
           <div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" /><Input type="text" placeholder="Cari Nama Imunisasi..." value={searchQuery} onChange={handleSearchChange} className="pl-10 pr-4 py-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" /></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
             <thead className="bg-gray-50 text-gray-600 uppercase whitespace-nowrap"><tr><th className="px-6 py-3">Nama Imunisasi</th><th className="px-6 py-3">Usia Ideal (Bulan)</th><th className="px-6 py-3">Deskripsi</th><th className="px-6 py-3">Dibuat</th><th className="px-6 py-3">Diperbarui</th><th className="px-6 py-3">Aksi</th></tr></thead>
             <tbody className="text-gray-700">
               {isFetching && daftarMasterImunisasi.length === 0 ? (<tr><td colSpan={6} className="text-center p-8 text-gray-500">Memuat data...</td></tr>) : !isFetching && daftarMasterImunisasi.length === 0 ? (<tr><td colSpan={6} className="text-center p-8 text-gray-500">{searchQuery ? `Tidak ada data ditemukan untuk "${searchQuery}".` : "Belum ada data master imunisasi."}</td></tr>) : (daftarMasterImunisasi.map((m) => (<tr key={m.id} className="border-b hover:bg-gray-50"><td className="px-6 py-4 font-medium">{m.nama_imunisasi}</td><td className="px-6 py-4 text-center">{m.usia_ideal_bulan}</td><td className="px-6 py-4 truncate max-w-sm" title={m.deskripsi || ''}>{m.deskripsi || '-'}</td><td className="px-6 py-4">{formatTanggalWaktu(m.created_at)}</td><td className="px-6 py-4">{formatTanggalWaktu(m.updated_at)}</td><td className="px-6 py-4 flex space-x-2"><Button variant="outline" size="sm" onClick={() => handleOpenEditModal(m)} className="cursor-pointer" disabled={isLoading}><Pencil className="w-4 h-4" /></Button><Button variant="destructive" size="sm" onClick={() => handleDelete(m.id)} className="cursor-pointer" disabled={isLoading}><Trash2 className="w-4 h-4" /></Button></td></tr>)))}
             </tbody>
          </table>
        </div>
      </div>

      {/* --- Modal Update Master Imunisasi --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
         <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Master Imunisasi</DialogTitle><DialogDescription>Perbarui detail master imunisasi.</DialogDescription></DialogHeader>
          <form onSubmit={handleUpdateSubmit} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
              <div><Label htmlFor="nama_imunisasi_edit">Nama Imunisasi *</Label><Input id="nama_imunisasi" value={editFormData.nama_imunisasi} onChange={handleEditFormChange} required className="mt-1" /></div>
              <div><Label htmlFor="usia_ideal_bulan_edit">Usia Ideal (bulan) *</Label><Input type="number" id="usia_ideal_bulan" value={editFormData.usia_ideal_bulan} onChange={handleEditFormChange} required min="0" className="mt-1" /></div>
              <div><Label htmlFor="deskripsi_edit">Deskripsi (Opsional)</Label><Textarea id="deskripsi" value={editFormData.deskripsi} onChange={handleEditFormChange} placeholder="(Opsional)" className="mt-1 h-20 resize-none" /></div>
            {error && isModalOpen && <p className="text-red-500 text-center pt-2">{error}</p>}
            <DialogFooter className="pt-4 sm:justify-between"><DialogClose asChild><Button type="button" variant="outline" className="cursor-pointer">Batal</Button></DialogClose><Button type="submit" disabled={isLoading} className="cursor-pointer">{isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}