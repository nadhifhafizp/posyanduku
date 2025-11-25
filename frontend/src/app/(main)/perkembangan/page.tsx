// src/app/(main)/perkembangan/page.tsx
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFetchWithAuth } from '@/lib/utils'; // <-- 2. Import useFetchWithAuth

// Interface AnakSimple (minimal untuk dropdown)
interface AnakOption {
  id: number;
  nama_anak: string;
  nik_anak: string | null;
}

// Interface Perkembangan (sesuai struct Go + join fields)
interface Perkembangan {
  id: number;
  id_anak: number;
  tanggal_pemeriksaan: string; // Biarkan string YYYY-MM-DD
  bb_kg: number | null;
  tb_cm: number | null;
  lk_cm: number | null;
  ll_cm: number | null;
  status_gizi: string | null;
  saran: string | null;
  id_kader_pencatat: number; // Bisa dihapus jika backend selalu ambil dari token
  created_at: string;
  updated_at: string | null;
  nama_anak: string;
  nama_kader: string | null;
  nik_anak: string | null;
  nama_ibu: string | null;
}
// Tipe untuk form create/edit
type PerkembanganFormData = {
  id_anak: string;
  tanggal_pemeriksaan: string;
  bb_kg: string;
  tb_cm: string;
  lk_cm: string;
  ll_cm: string;
  status_gizi: string;
  saran: string;
}

// --- Fungsi Debounce ---
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
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


export default function DataPerkembanganPage() {
  const router = useRouter(); // <-- 3. Inisialisasi router
  const { isLoggedIn } = useAuth(); // <-- Gunakan useAuth
  const fetchWithAuth = useFetchWithAuth(); // <-- 4. Dapatkan fungsi fetch terautentikasi

  const [daftarPerkembangan, setDaftarPerkembangan] = useState<Perkembangan[]>([]);
  const [daftarAnakOptions, setDaftarAnakOptions] = useState<AnakOption[]>([]);
  const [formData, setFormData] = useState<PerkembanganFormData>({
    id_anak: '', tanggal_pemeriksaan: '', bb_kg: '', tb_cm: '', lk_cm: '', ll_cm: '', status_gizi: '', saran: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isFetchingAnak, setIsFetchingAnak] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPerkembangan, setEditingPerkembangan] = useState<Perkembangan | null>(null);
  const [editFormData, setEditFormData] = useState<PerkembanganFormData>({
      id_anak: '', tanggal_pemeriksaan: '', bb_kg: '', tb_cm: '', lk_cm: '', ll_cm: '', status_gizi: '', saran: ''
  });

  const API_URL_PERKEMBANGAN = 'http://localhost:8080/api/perkembangan';
  const API_URL_ANAK_SIMPLE = 'http://localhost:8080/api/anak/simple';

  // --- Fungsi Fetch Anak Simple (Dropdown) ---
  const fetchAnakOptions = useCallback(async () => {
    setIsFetchingAnak(true);
    try {
      // Gunakan fetchWithAuth
      const response = await fetchWithAuth(API_URL_ANAK_SIMPLE);
      if (!response.ok) throw new Error('Gagal mengambil daftar anak');
      const data: AnakOption[] = await response.json();
      setDaftarAnakOptions(data);
    } catch (err: unknown) { // Changed any to unknown
      let message = 'Tidak dapat memuat data anak.';
      if (err instanceof Error) {message = err.message;} // Type guard
      console.error("Fetch anak options failed:", message);
      if (message !== 'Anda belum login.' && message !== 'Sesi Anda tidak valid atau telah berakhir. Silakan login kembali.') {
        setError(message);
      }
    }finally {
      setIsFetchingAnak(false);
    }

  }, [fetchWithAuth]); // <-- Tambah dependensi

  // --- Fungsi Fetch Perkembangan ---
  const fetchPerkembangan = useCallback(async (query: string = '') => {
    setIsFetching(true);
    setError('');
    let url = API_URL_PERKEMBANGAN;
    if (query) {
      url += `?search=${encodeURIComponent(query)}`;
    }
    try {
      // Gunakan fetchWithAuth
      const response = await fetchWithAuth(url);
      if (!response.ok) {
        let errorMsg = 'Gagal mengambil data perkembangan';
        try { const errorData = await response.json(); errorMsg = errorData.error || errorMsg; }
        catch { errorMsg = await response.text() || errorMsg; }
        throw new Error(errorMsg);
      }
      const data: Perkembangan[] = await response.json();
      // Format tanggal sebelum disimpan
      const formattedData = data.map(p => ({
        ...p,
        tanggal_pemeriksaan: p.tanggal_pemeriksaan ? new Date(p.tanggal_pemeriksaan).toISOString().split('T')[0] : '',
      }));
      setDaftarPerkembangan(formattedData);
    } catch (err: unknown) { // Changed any to unknown
      let message = 'Tidak dapat memuat data perkembangan.';
      if (err instanceof Error) {message = err.message;} // Type guard
      console.error("Fetch perkembangan failed:", message);
      if (message !== 'Anda belum login.' && message !== 'Sesi Anda tidak valid atau telah berakhir. Silakan login kembali.') {
        setError(message);
      } setDaftarPerkembangan([]);
    }finally {
      setIsFetching(false)
    }
  }, [fetchWithAuth]); // <-- Tambah dependensi

  const debouncedFetch = useCallback(debounce(fetchPerkembangan, 500), [fetchPerkembangan]); // Corrected dependency

  // --- useEffect untuk fetch data awal dan redirect ---
   useEffect(() => {
    if (isLoggedIn) {
        fetchAnakOptions();
        fetchPerkembangan();
    } else {
        const checkAuthAndRedirect = async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
            if (!localStorage.getItem('authToken')) {
                 console.log("Belum login (perkembangan), mengarahkan ke /login...");
                 router.push('/login');
            }
       };
             checkAuthAndRedirect();
    }
  }, [isLoggedIn, fetchPerkembangan, fetchAnakOptions, router]);


  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedFetch(query);
  };

   // --- Fungsi Helper Konversi Payload ---
  const preparePayload = (data: PerkembanganFormData) => {
      // Make sure payload properties match expected backend structure if different
      const payload: { [key: string]: any } = { // Use a more specific type if possible
          id_anak: parseInt(data.id_anak, 10),
          tanggal_pemeriksaan: data.tanggal_pemeriksaan, // Sudah string YYYY-MM-DD
          bb_kg: data.bb_kg === '' ? null : parseFloat(data.bb_kg),
          tb_cm: data.tb_cm === '' ? null : parseFloat(data.tb_cm),
          lk_cm: data.lk_cm === '' ? null : parseFloat(data.lk_cm),
          ll_cm: data.ll_cm === '' ? null : parseFloat(data.ll_cm),
          status_gizi: data.status_gizi === '' ? null : data.status_gizi,
          saran: data.saran === '' ? null : data.saran,
      };
      if (isNaN(payload.id_anak)) payload.id_anak = 0;
      if (isNaN(payload.bb_kg)) payload.bb_kg = null;
      if (isNaN(payload.tb_cm)) payload.tb_cm = null;
      if (isNaN(payload.lk_cm)) payload.lk_cm = null;
      if (isNaN(payload.ll_cm)) payload.ll_cm = null;

       // Validasi tanggal
      if (!payload.tanggal_pemeriksaan || !/^\d{4}-\d{2}-\d{2}$/.test(payload.tanggal_pemeriksaan)) {
          throw new Error("Format Tanggal Pemeriksaan tidak valid. Gunakan YYYY-MM-DD.");
      }

      return payload;
  };

  // --- Fungsi Create Perkembangan ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prevState => ({ ...prevState, [id]: value }));
  };
  const handleSelectChange = (id: keyof PerkembanganFormData, value: string) => {
      setFormData(prevState => ({ ...prevState, [id]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(''); setSuccess(''); setIsLoading(true);

    try {
      const payload = preparePayload(formData); // Validasi format tanggal
      if (!payload.id_anak || payload.id_anak <= 0) {
          throw new Error("Silakan pilih Anak terlebih dahulu.");
      }

       // Gunakan fetchWithAuth untuk POST
      const response = await fetchWithAuth(API_URL_PERKEMBANGAN, {
        method: 'POST',
        body: JSON.stringify(payload), // Payload sudah disiapkan tanpa ID kader
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal menambahkan data perkembangan.');

      setSuccess('Data perkembangan berhasil ditambahkan!');
      setFormData({ id_anak: '', tanggal_pemeriksaan: '', bb_kg: '', tb_cm: '', lk_cm: '', ll_cm: '', status_gizi: '', saran: '' }); // Reset form
      fetchPerkembangan(searchQuery); // Refresh tabel
    }
      catch (err: unknown) { // Changed any to unknown
      let message = 'Gagal menambahkan data.';
      if(err instanceof Error) { message = err.message; } // Type guard
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Fungsi Update Perkembangan ---
  const handleOpenEditModal = (p: Perkembangan) => {
    setEditingPerkembangan(p);
    setEditFormData({
        id_anak: p.id_anak?.toString() ?? '',
        // Pastikan format YYYY-MM-DD
        tanggal_pemeriksaan: p.tanggal_pemeriksaan ? new Date(p.tanggal_pemeriksaan).toISOString().split('T')[0] : '',
        bb_kg: p.bb_kg?.toString() ?? '',
        tb_cm: p.tb_cm?.toString() ?? '',
        lk_cm: p.lk_cm?.toString() ?? '',
        ll_cm: p.ll_cm?.toString() ?? '',
        status_gizi: p.status_gizi || '',
        saran: p.saran || '',
    });
    setIsModalOpen(true);
    setError(''); setSuccess('');
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setEditFormData(prevState => ({ ...prevState, [id]: value }));
  };
   const handleEditSelectChange = (id: keyof PerkembanganFormData, value: string) => {
      setEditFormData(prevState => ({ ...prevState, [id]: value }));
  };

  const handleUpdateSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingPerkembangan) return;
    setIsLoading(true); setError('');

    try {
      const payload = preparePayload(editFormData); // Validasi format tanggal
      if (!payload.id_anak || payload.id_anak <= 0) {
          throw new Error("Silakan pilih Anak terlebih dahulu.");
      }

      // Gunakan fetchWithAuth untuk PUT
      const response = await fetchWithAuth(`${API_URL_PERKEMBANGAN}/${editingPerkembangan.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload), // Payload sudah disiapkan tanpa ID kader
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal memperbarui data perkembangan.');

      setSuccess('Data perkembangan berhasil diperbarui!');
      setIsModalOpen(false);
      fetchPerkembangan(searchQuery);
    } catch (err: unknown) { // Changed any to unknown
      let message = 'Gagal memperbarui data.';
      if(err instanceof Error) { message = err.message; } // Type guard
      setError(message); // Tampilkan di modal
    } finally {
      setIsLoading(false);
    }
  };

  // --- Fungsi Delete Perkembangan ---
  const handleDelete = async (id: number) => {
    if (!confirm('Anda yakin ingin menghapus data perkembangan ini?')) { return; }
    setError(''); setSuccess('');
    try {
      // Gunakan fetchWithAuth untuk DELETE
      const response = await fetchWithAuth(`${API_URL_PERKEMBANGAN}/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal menghapus data perkembangan.');
      setSuccess('Data perkembangan berhasil dihapus!');
      fetchPerkembangan(searchQuery);
    } catch (err: unknown) { // Changed any to unknown
      let message = 'Gagal menghapus data.';
      if(err instanceof Error) { message = err.message; } // Type guard
      setError(message);
    }
  };

   // Fungsi format tanggal HANYA untuk tampilan di tabel
   const formatDisplayTanggal = (tanggalString: string | null) => {
      if (!tanggalString) return '-';
      try {
        // Asumsi input YYYY-MM-DD
        const date = new Date(tanggalString + 'T00:00:00Z'); // Tambah Z agar dianggap UTC
        if (isNaN(date.getTime())) return tanggalString;
        return date.toLocaleDateString('id-ID', {
            day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' // Tentukan timezone
        });
      } catch (e: unknown) { // Changed any to unknown
        console.error("Error formatting display date:", tanggalString, e);
        return tanggalString;
       }
  };

   // Render loading atau pesan jika belum login
   if ((isFetching || isFetchingAnak) && !daftarPerkembangan.length && !daftarAnakOptions.length) {
     return <div className="text-center p-8">Memuat data...</div>;
   }
   if (!isLoggedIn && !isFetching && !isFetchingAnak) {
     return <div className="text-center p-8">Anda harus login untuk mengakses halaman ini. Mengarahkan...</div>;
   }


  return (
    <>
      {/* --- Form Create Perkembangan --- */}
      <div className="bg-white rounded-xl shadow-md p-6 sm:p-8 mb-8"> {/* Tambah mb-8 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Tambah Data Perkembangan Anak</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
              <div>
                <Label htmlFor="id_anak">Pilih Anak *</Label>
                <Select value={formData.id_anak} onValueChange={(value) => handleSelectChange('id_anak', value)} required disabled={isFetchingAnak}>
                    <SelectTrigger className="w-full mt-1">
                        <SelectValue placeholder={isFetchingAnak ? "Memuat..." : "Pilih Anak"} />
                    </SelectTrigger>
                    <SelectContent>
                        {daftarAnakOptions.length > 0 ? (
                            daftarAnakOptions.map((anak) => (
                                <SelectItem key={anak.id} value={anak.id.toString()}>
                                    {anak.nama_anak || `Anak ID: ${anak.id}`}
                                </SelectItem>
                            ))
                        ) : ( <SelectItem value="disabled" disabled>{isFetchingAnak ? "Memuat..." : "Tidak ada data anak"}</SelectItem> )}
                    </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tanggal_pemeriksaan">Tanggal Pemeriksaan *</Label>
                <Input type="date" id="tanggal_pemeriksaan" value={formData.tanggal_pemeriksaan} onChange={handleChange} required className="mt-1" />
              </div>
              <div>
                  <Label htmlFor="bb_kg">Berat Badan (kg)</Label>
                  <Input type="number" step="0.01" id="bb_kg" value={formData.bb_kg} onChange={handleChange} placeholder="Contoh: 8.5" min="0" className="mt-1" />
              </div>
               <div>
                  <Label htmlFor="tb_cm">Tinggi Badan (cm)</Label>
                  <Input type="number" step="0.1" id="tb_cm" value={formData.tb_cm} onChange={handleChange} placeholder="Contoh: 70.2" min="0" className="mt-1" />
              </div>
               <div>
                  <Label htmlFor="lk_cm">Lingkar Kepala (cm)</Label>
                  <Input type="number" step="0.1" id="lk_cm" value={formData.lk_cm} onChange={handleChange} placeholder="Contoh: 45.1" min="0" className="mt-1" />
              </div>
               <div>
                  <Label htmlFor="ll_cm">Lingkar Lengan (cm)</Label>
                  <Input type="number" step="0.1" id="ll_cm" value={formData.ll_cm} onChange={handleChange} placeholder="Contoh: 15.3" min="0" className="mt-1" />
              </div>
               <div>
                  <Label htmlFor="status_gizi">Status Gizi</Label>
                  <Input type="text" id="status_gizi" value={formData.status_gizi} onChange={handleChange} placeholder="(Opsional)" className="mt-1" />
              </div>
              <div className="md:col-span-2 lg:col-span-1"> {/* Saran ambil lebar sisa */}
                  <Label htmlFor="saran">Saran</Label>
                  <Textarea id="saran" value={formData.saran} onChange={handleChange} placeholder="(Opsional)" className="mt-1 h-20 resize-none" />
              </div>
          </div>
          {/* Pesan Error/Success & Tombol Submit */}
          {error && !isModalOpen && <p className="text-red-500 text-center font-medium pt-2">{error}</p>}
          {success && !isModalOpen && <p className="text-green-600 text-center font-medium pt-2">{success}</p>}
          <div className="pt-4">
            <Button type="submit" disabled={isLoading || isFetchingAnak || !isLoggedIn} className="w-full py-3 bg-cyan-800 hover:bg-cyan-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? 'Menyimpan...' : 'Tambahkan Data Perkembangan'}
            </Button>
          </div>
        </form>
      </div>

      {/* --- Tabel Data Perkembangan --- */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <h2 className="text-xl font-bold text-gray-800">Riwayat Perkembangan Anak</h2>
           <div className="relative w-full sm:w-64">
             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
             <Input type="text" placeholder="Cari Nama Anak..." value={searchQuery} onChange={handleSearchChange} className="pl-10 pr-4 py-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
             <thead className="bg-gray-50 text-gray-600 uppercase whitespace-nowrap">
               <tr>
                 <th className="px-6 py-3">Nama Anak</th>
                 <th className="px-6 py-3">Tgl Periksa</th>
                 <th className="px-6 py-3">BB (kg)</th>
                 <th className="px-6 py-3">TB (cm)</th>
                 <th className="px-6 py-3">LK (cm)</th>
                 <th className="px-6 py-3">LL (cm)</th>
                 <th className="px-6 py-3">Status Gizi</th>
                 <th className="px-6 py-3">Saran</th>
                 <th className="px-6 py-3">Dicatat Oleh</th>
                 <th className="px-6 py-3">Aksi</th>
               </tr>
             </thead>
             <tbody className="text-gray-700">
               {isFetching && daftarPerkembangan.length === 0 ? ( // Perbaiki kondisi loading
                 <tr><td colSpan={10} className="text-center p-8">Memuat data perkembangan...</td></tr>
               ) : daftarPerkembangan.length > 0 ? (
                 daftarPerkembangan.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                   <td className="px-6 py-4 font-medium">{p.nama_anak || '-'}</td>
                   <td className="px-6 py-4 whitespace-nowrap">{formatDisplayTanggal(p.tanggal_pemeriksaan)}</td>
                   <td className="px-6 py-4 text-center">{p.bb_kg ?? '-'}</td>
                   <td className="px-6 py-4 text-center">{p.tb_cm ?? '-'}</td>
                   <td className="px-6 py-4 text-center">{p.lk_cm ?? '-'}</td>
                   <td className="px-6 py-4 text-center">{p.ll_cm ?? '-'}</td>
                   <td className="px-6 py-4">{p.status_gizi || '-'}</td>
                   <td className="px-6 py-4 truncate max-w-xs">{p.saran || '-'}</td>
                   <td className="px-6 py-4">{p.nama_kader || 'N/A'}</td>
                   <td className="px-6 py-4 flex space-x-2">
                     <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(p)} className="cursor-pointer">
                       <Pencil className="w-4 h-4" />
                     </Button>
                     <Button variant="destructive" size="sm" onClick={() => handleDelete(p.id)} className="cursor-pointer">
                       <Trash2 className="w-4 h-4" />
                     </Button>
                   </td>
                 </tr>
                 ))
               ) : (
                 <tr><td colSpan={10} className="text-center p-8">
                     {searchQuery ? `Tidak ada data ditemukan untuk "${searchQuery}".` : "Belum ada data perkembangan."}
                 </td></tr>
               )}
             </tbody>
          </table>
        </div>
      </div>

      {/* --- Modal Update Perkembangan --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
         <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Data Perkembangan</DialogTitle>
            <DialogDescription>Perbarui data perkembangan anak.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSubmit} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <Label htmlFor="id_anak_edit">Anak *</Label> {/* ID unik */}
                 <Select value={editFormData.id_anak} onValueChange={(value) => handleEditSelectChange('id_anak', value)} required disabled={isFetchingAnak}>
                    <SelectTrigger className="w-full mt-1" id="id_anak_edit"> <SelectValue placeholder={isFetchingAnak ? "Memuat..." : "Pilih Anak"} /> </SelectTrigger>
                    <SelectContent>
                        {daftarAnakOptions.map((anak) => (
                            <SelectItem key={anak.id} value={anak.id.toString()}> {anak.nama_anak || `Anak ID: ${anak.id}`} </SelectItem>
                        ))}
                         {daftarAnakOptions.length === 0 && <SelectItem value="disabled" disabled>{isFetchingAnak ? "Memuat..." : "Tidak ada data anak"}</SelectItem>}
                    </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tanggal_pemeriksaan_edit">Tanggal Pemeriksaan *</Label> {/* ID unik */}
                <Input type="date" id="tanggal_pemeriksaan" value={editFormData.tanggal_pemeriksaan} onChange={handleEditFormChange} required className="mt-1" />
              </div>
              <div>
                  <Label htmlFor="bb_kg_edit">Berat Badan (kg)</Label> {/* ID unik */}
                  <Input type="number" step="0.01" id="bb_kg" value={editFormData.bb_kg} onChange={handleEditFormChange} placeholder="Contoh: 8.5" min="0" className="mt-1" />
              </div>
               <div>
                  <Label htmlFor="tb_cm_edit">Tinggi Badan (cm)</Label> {/* ID unik */}
                  <Input type="number" step="0.1" id="tb_cm" value={editFormData.tb_cm} onChange={handleEditFormChange} placeholder="Contoh: 70.2" min="0" className="mt-1" />
              </div>
               <div>
                  <Label htmlFor="lk_cm_edit">Lingkar Kepala (cm)</Label> {/* ID unik */}
                  <Input type="number" step="0.1" id="lk_cm" value={editFormData.lk_cm} onChange={handleEditFormChange} placeholder="Contoh: 45.1" min="0" className="mt-1" />
              </div>
               <div>
                  <Label htmlFor="ll_cm_edit">Lingkar Lengan (cm)</Label> {/* ID unik */}
                  <Input type="number" step="0.1" id="ll_cm" value={editFormData.ll_cm} onChange={handleEditFormChange} placeholder="Contoh: 15.3" min="0" className="mt-1" />
              </div>
               <div>
                  <Label htmlFor="status_gizi_edit">Status Gizi</Label> {/* ID unik */}
                  <Input type="text" id="status_gizi" value={editFormData.status_gizi} onChange={handleEditFormChange} placeholder="(Opsional)" className="mt-1" />
              </div>
              <div>
                  <Label htmlFor="saran_edit">Saran</Label> {/* ID unik */}
                  <Textarea id="saran" value={editFormData.saran} onChange={handleEditFormChange} placeholder="(Opsional)" className="mt-1 h-20 resize-none" />
              </div>

            {/* Error Message Modal */}
            {error && isModalOpen && <p className="text-red-500 text-center pt-2">{error}</p>}

            <DialogFooter className="pt-4 sm:justify-between">
               <DialogClose asChild>
                  <Button type="button" variant="outline" className="cursor-pointer">Batal</Button>
               </DialogClose>
              <Button type="submit" disabled={isLoading || isFetchingAnak} className="cursor-pointer">
                {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}