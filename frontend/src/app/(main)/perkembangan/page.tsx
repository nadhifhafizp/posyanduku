// src/app/dashboard/data-perkembangan/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // <-- Dibutuhkan untuk Saran
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

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
  tanggal_pemeriksaan: string;
  bb_kg: number | null;
  tb_cm: number | null;
  lk_cm: number | null;
  ll_cm: number | null;
  status_gizi: string | null;
  saran: string | null;
  id_kader_pencatat: number;
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
// Tipe NodeJS.Timeout mungkin butuh '@types/node'
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null; // Gunakan ReturnType<typeof setTimeout>
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
  const [daftarPerkembangan, setDaftarPerkembangan] = useState<Perkembangan[]>([]);
  const [daftarAnakOptions, setDaftarAnakOptions] = useState<AnakOption[]>([]);
  // State untuk form create/edit, loading, dll (Tidak berubah)
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
  // ID Kader yang login (sementara hardcode, ganti dengan data sesi)
  const { kaderId: loggedInKaderId, authToken } = useAuth();
  // Fungsi untuk menambahkan Header Authorization jika token ada
  const getAuthHeaders = useCallback(() => ({
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` }), 
    }), [authToken]);

  

  // --- Fungsi Fetch Anak Simple (Dropdown) ---
  const fetchAnakOptions = useCallback(async () => {
    setIsFetchingAnak(true);
    try {
      const response = await fetch('http://localhost:8080/api/anak/simple'); // Endpoint baru
      if (!response.ok) throw new Error('Gagal mengambil daftar anak');
      const data: AnakOption[] = await response.json();
      setDaftarAnakOptions(data);
    } catch (err) {
      console.error("Fetch anak options failed:", err);
      setError('Gagal memuat daftar anak untuk pilihan.');
    } finally {
      setIsFetchingAnak(false);
    }
  }, []);

  // --- Fungsi Fetch Perkembangan ---
  const fetchPerkembangan = useCallback(async (query: string = '') => {
    setIsFetching(true);
    setError('');
    let url = 'http://localhost:8080/api/perkembangan'; // Endpoint perkembangan
    if (query) {
      url += `?search=${encodeURIComponent(query)}`;
    }
    try {
      const response = await fetch(url);
      if (!response.ok) {
        let errorMsg = 'Gagal mengambil data perkembangan';
        try { const errorData = await response.json(); errorMsg = errorData.error || errorMsg; }
        catch (jsonError) { errorMsg = await response.text() || errorMsg; }
        throw new Error(errorMsg);
      }
      const data: Perkembangan[] = await response.json();
      // Format tanggal sebelum disimpan
      const formattedData = data.map(p => ({
        ...p,
        tanggal_pemeriksaan: p.tanggal_pemeriksaan ? new Date(p.tanggal_pemeriksaan).toISOString().split('T')[0] : '',
      }));
      setDaftarPerkembangan(formattedData);
    } catch (err: any) {
      console.error("Fetch perkembangan failed:", err);
      setError('Tidak dapat memuat data perkembangan.');
      setDaftarPerkembangan([]);
    } finally {
      setIsFetching(false);
    }
  }, []);

  const debouncedFetch = useCallback(debounce(fetchPerkembangan, 500), [fetchPerkembangan]);

  useEffect(() => {
    // Hanya fetch jika sudah ada ID Kader (artinya user sudah login)
    if (loggedInKaderId && authToken) { // <-- Pastikan ada Token dan ID
      fetchAnakOptions(); 
      fetchPerkembangan(); 
    } else {
      // Opsi: redirect ke halaman login jika tidak ada Auth
      // router.push('/login'); 
      console.warn("User belum terautentikasi, fetch data dibatalkan.");
      setIsFetching(false);
      setIsFetchingAnak(false);
    }
  }, [loggedInKaderId, authToken, fetchAnakOptions, fetchPerkembangan]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedFetch(query);
  };

   // --- Fungsi Helper Konversi Payload ---
  const preparePayload = (data: PerkembanganFormData) => {
      const payload: any = {
          ...data,
          id_anak: parseInt(data.id_anak, 10),
          bb_kg: data.bb_kg === '' ? null : parseFloat(data.bb_kg),
          tb_cm: data.tb_cm === '' ? null : parseFloat(data.tb_cm),
          lk_cm: data.lk_cm === '' ? null : parseFloat(data.lk_cm),
          ll_cm: data.ll_cm === '' ? null : parseFloat(data.ll_cm),
          status_gizi: data.status_gizi === '' ? null : data.status_gizi,
          saran: data.saran === '' ? null : data.saran,
          id_kader_pencatat: loggedInKaderId, // Tambahkan ID kader yang login
      };
      if (isNaN(payload.id_anak)) payload.id_anak = 0; // Atau handle error
      if (isNaN(payload.bb_kg)) payload.bb_kg = null;
      if (isNaN(payload.tb_cm)) payload.tb_cm = null;
      if (isNaN(payload.lk_cm)) payload.lk_cm = null;
      if (isNaN(payload.ll_cm)) payload.ll_cm = null;

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
    const payload = preparePayload(formData);
    if (!payload.id_anak || payload.id_anak <= 0) {
        setError("Silakan pilih Anak terlebih dahulu.");
        setIsLoading(false);
        return;
    }

    try {
      const response = await fetch('http://localhost:8080/api/perkembangan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal menambahkan data perkembangan.');
      setSuccess('Data perkembangan berhasil ditambahkan!');
      setFormData({ id_anak: '', tanggal_pemeriksaan: '', bb_kg: '', tb_cm: '', lk_cm: '', ll_cm: '', status_gizi: '', saran: '' });
      fetchPerkembangan(searchQuery);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Fungsi Update Perkembangan ---
  const handleOpenEditModal = (p: Perkembangan) => {
    setEditingPerkembangan(p);
    setEditFormData({
        id_anak: p.id_anak?.toString() ?? '',
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
    const payload = preparePayload(editFormData);
    if (!payload.id_anak || payload.id_anak <= 0) {
        setError("Silakan pilih Anak terlebih dahulu.");
        setIsLoading(false);
        return;
    }

    try {
      const response = await fetch(`http://localhost:8080/api/perkembangan/${editingPerkembangan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal memperbarui data perkembangan.');
      setSuccess('Data perkembangan berhasil diperbarui!');
      setIsModalOpen(false);
      fetchPerkembangan(searchQuery);
    } catch (err: any) {
      setError(err.message); // Tampilkan di modal
    } finally {
      setIsLoading(false);
    }
  };

  // --- Fungsi Delete Perkembangan ---
  const handleDelete = async (id: number) => {
    if (!confirm('Anda yakin ingin menghapus data perkembangan ini?')) { return; }
    setError(''); setSuccess('');
    try {
      const response = await fetch(`http://localhost:8080/api/perkembangan/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal menghapus data perkembangan.');
      setSuccess('Data perkembangan berhasil dihapus!');
      fetchPerkembangan(searchQuery);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Fungsi formatTanggal
  const formatTanggal = (tanggalString: string | null) => {
    if (!tanggalString) return 'N/A';
    // Format lengkap untuk created_at/updated_at
    try {
        return new Date(tanggalString).toLocaleString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    } catch (e) { return 'Invalid Date'; }
   };
   const formatDisplayTanggal = (tanggalString: string | null) => {
      if (!tanggalString) return '-';
      // Format tanggal saja untuk tanggal lahir/pemeriksaan
      try {
        // Asumsi tanggalString adalah YYYY-MM-DD
        const [year, month, day] = tanggalString.split('-');
        // Pastikan tanggal valid sebelum format
        if (!year || !month || !day) return tanggalString;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        // Cek jika hasil parsing valid
        if (isNaN(date.getTime())) return tanggalString;
        return date.toLocaleDateString('id-ID', {
            day: '2-digit', month: 'long', year: 'numeric'
        });
      } catch (e) {
          console.error("Error formatting date:", tanggalString, e); // Log error
          return tanggalString; // Tampilkan string asli jika format salah
      }
  };


  return (
    // Menggunakan Fragment karena div terluar sudah ada di layout.tsx
    <>
      {/* --- Form Create Perkembangan --- */}
      <div className="bg-white rounded-xl shadow-md p-6 sm:p-8">
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
            <Button type="submit" disabled={isLoading || isFetchingAnak} className="w-full py-3 bg-cyan-800 hover:bg-cyan-700 cursor-pointer">
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
             {/* --- Perbaikan tbody --- */}
             <tbody className="text-gray-700">
               {isFetching ? (
                 <tr><td colSpan={10} className="text-center p-8">Memuat data perkembangan...</td></tr>
               ) : daftarPerkembangan.length > 0 ? (
                 daftarPerkembangan.map((p) => ( // Gunakan variabel 'p'
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
                 )) // Tutup map
               ) : (
                 <tr><td colSpan={10} className="text-center p-8">
                     {searchQuery ? `Tidak ada data ditemukan untuk "${searchQuery}".` : "Belum ada data perkembangan."}
                 </td></tr>
               )}
             </tbody>
             {/* --- Akhir Perbaikan tbody --- */}
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
                <Label htmlFor="id_anak_edit">Anak *</Label>
                 <Select value={editFormData.id_anak} onValueChange={(value) => handleEditSelectChange('id_anak', value)} required disabled={isFetchingAnak}>
                    <SelectTrigger className="w-full mt-1" id="id_anak_edit"> <SelectValue placeholder="Pilih Anak" /> </SelectTrigger>
                    <SelectContent>
                        {daftarAnakOptions.map((anak) => (
                            <SelectItem key={anak.id} value={anak.id.toString()}> {anak.nama_anak || `Anak ID: ${anak.id}`} </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tanggal_pemeriksaan_edit">Tanggal Pemeriksaan *</Label>
                <Input type="date" id="tanggal_pemeriksaan" value={editFormData.tanggal_pemeriksaan} onChange={handleEditFormChange} required className="mt-1" />
              </div>
              <div>
                  <Label htmlFor="bb_kg_edit">Berat Badan (kg)</Label>
                  <Input type="number" step="0.01" id="bb_kg" value={editFormData.bb_kg} onChange={handleEditFormChange} placeholder="Contoh: 8.5" min="0" className="mt-1" />
              </div>
               <div>
                  <Label htmlFor="tb_cm_edit">Tinggi Badan (cm)</Label>
                  <Input type="number" step="0.1" id="tb_cm" value={editFormData.tb_cm} onChange={handleEditFormChange} placeholder="Contoh: 70.2" min="0" className="mt-1" />
              </div>
               <div>
                  <Label htmlFor="lk_cm_edit">Lingkar Kepala (cm)</Label>
                  <Input type="number" step="0.1" id="lk_cm" value={editFormData.lk_cm} onChange={handleEditFormChange} placeholder="Contoh: 45.1" min="0" className="mt-1" />
              </div>
               <div>
                  <Label htmlFor="ll_cm_edit">Lingkar Lengan (cm)</Label>
                  <Input type="number" step="0.1" id="ll_cm" value={editFormData.ll_cm} onChange={handleEditFormChange} placeholder="Contoh: 15.3" min="0" className="mt-1" />
              </div>
               <div>
                  <Label htmlFor="status_gizi_edit">Status Gizi</Label>
                  <Input type="text" id="status_gizi" value={editFormData.status_gizi} onChange={handleEditFormChange} placeholder="(Opsional)" className="mt-1" />
              </div>
              <div>
                  <Label htmlFor="saran_edit">Saran</Label>
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