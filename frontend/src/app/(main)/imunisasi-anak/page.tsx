// src/app/(main)/imunisasi-anak/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2, Search } from 'lucide-react';
import { useFetchWithAuth } from '@/lib/utils'; // <-- Correct import for fetch hook

// --- Interface & Tipe Data ---
interface AnakSimple {
  id: number;
  nama_anak: string;
  nik_anak: string | null;
}

interface MasterImunisasiSimple {
  id: number;
  nama_imunisasi: string;
  usia_ideal_bulan: number;
}

interface RiwayatImunisasi {
  id: number;
  id_anak: number;
  id_master_imunisasi: number;
  tanggal_imunisasi: string; // Already string YYYY-MM-DD
  catatan: string | null;
  created_at: string;
  updated_at: string | null;
  nama_anak: string;
  nik_anak: string | null;
  nama_imunisasi: string;
  nama_kader: string | null;
  nama_kader_updater: string | null;
}

type TambahFormData = {
  id_anak: string;
  id_master_imunisasi: string;
  tanggal_imunisasi: string;
  catatan: string;
}

type EditFormData = {
  id_anak: string;
  id_master_imunisasi: string;
  tanggal_imunisasi: string;
  catatan: string;
}

// --- Fungsi Debounce ---
function debounce<Params extends unknown[]>( 
  func: (...args: Params) => void,
  wait: number
): (...args: Params) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function executedFunction(...args: Params) { 
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

// --- Helper Format Tanggal ---
const formatTanggal = (tanggalString: string | null) => {
  if (!tanggalString) return 'N/A';
  // Use try-catch for date parsing robustness
  try {
      const date = new Date(tanggalString);
      // Check if date is valid before formatting
      if (isNaN(date.getTime())) return 'Invalid Date';
      // Format to DD MMM YYYY using UTC to avoid timezone issues with date-only strings
      return date.toLocaleDateString('id-ID', {
          day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'
      });
  } catch (_e) { // Use underscore prefix for unused variable
      console.error("Error formatting date:", tanggalString, _e);
      return 'Invalid Date';
  }
};


const formatTanggalISO = (tanggalString: string | null) => {
    if (!tanggalString) return '';
    try {
        const date = new Date(tanggalString);
        if (isNaN(date.getTime())) return ''; // Handle invalid date
        return date.toISOString().split('T')[0];
    } catch (_e) { // Use underscore prefix for unused variable
        console.error("Error parsing date for ISO format:", tanggalString, _e);
        return '';
    }
}


export default function RegistrasiImunisasiPage() {
  const fetchWithAuth = useFetchWithAuth(); // <-- Use the hook correctly

  // --- State ---
  const [daftarRiwayat, setDaftarRiwayat] = useState<RiwayatImunisasi[]>([]);
  const [daftarAnak, setDaftarAnak] = useState<AnakSimple[]>([]);
  const [daftarMaster, setDaftarMaster] = useState<MasterImunisasiSimple[]>([]);

  const [tambahFormData, setTambahFormData] = useState<TambahFormData>({
    id_anak: '', id_master_imunisasi: '', tanggal_imunisasi: '', catatan: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRiwayat, setEditingRiwayat] = useState<RiwayatImunisasi | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    id_anak: '', id_master_imunisasi: '', tanggal_imunisasi: '', catatan: '',
  });

  const API_URL = 'http://localhost:8080/api/riwayat-imunisasi';
  const API_ANAK_URL = 'http://localhost:8080/api/anak/simple';
  const API_MASTER_URL = 'http://localhost:8080/api/master-imunisasi';

  // --- Fungsi Fetch ---
  const fetchRiwayatImunisasi = useCallback(async (query: string = '') => {
    setIsFetching(true);
    setError(''); // Clear error on fetch start
    let url = API_URL;
    if (query) url += `?search=${encodeURIComponent(query)}`;
    try {
      const response = await fetchWithAuth(url);
      if (!response.ok) {
        let errorMsg = 'Gagal mengambil data riwayat imunisasi.';
         try { const errData = await response.json(); errorMsg = errData.error || errorMsg;}
         catch(_e) { errorMsg = await response.text() || errorMsg; } // Handle non-JSON error response
        throw new Error(errorMsg);
      }
      const data: RiwayatImunisasi[] | null = await response.json();
      // Format tanggal before setting state if needed (assuming backend sends ISO string)
       const formattedData = (data || []).map(item => ({
            ...item,
            // Keep tanggal_imunisasi as YYYY-MM-DD string internally
            tanggal_imunisasi: formatTanggalISO(item.tanggal_imunisasi),
            // Format created_at/updated_at only for display later if needed
        }));
      setDaftarRiwayat(formattedData);
    } catch (err) { // <-- Correct catch syntax
      let message = 'Terjadi kesalahan tidak dikenal saat fetch riwayat';
      if (err instanceof Error) { message = err.message; } // Type guard
      console.error("Fetch riwayat failed:", message);
       if (!query && message !== 'Anda belum login.' && message !== 'Sesi Anda tidak valid atau telah berakhir. Silakan login kembali.') {
            setError(`Tidak dapat memuat data: ${message}`);
       }
      setDaftarRiwayat([]);
    } finally {
      setIsFetching(false);
    }
  }, [fetchWithAuth]); // <-- Ensure fetchWithAuth is in dependency array

  const fetchDropdownData = useCallback(async () => {
    // No need to set loading specifically for dropdowns unless needed
    try {
        const [anakRes, masterRes] = await Promise.all([
            fetchWithAuth(API_ANAK_URL),
            fetchWithAuth(API_MASTER_URL)
        ]);
        if (!anakRes.ok) {
            let errorMsg = 'Gagal memuat daftar anak';
            try { const errData = await anakRes.json(); errorMsg = errData.error || errorMsg; }
            catch(_e) { errorMsg = await anakRes.text() || errorMsg; }
            throw new Error(errorMsg);
        }
        const dataAnak: AnakSimple[] | null = await anakRes.json();
        setDaftarAnak(dataAnak || []);

        if (!masterRes.ok) {
             let errorMsg = 'Gagal memuat daftar imunisasi';
            try { const errData = await masterRes.json(); errorMsg = errData.error || errorMsg; }
            catch(_e) { errorMsg = await masterRes.text() || errorMsg; }
            throw new Error(errorMsg);
        }
        const dataMaster: MasterImunisasiSimple[] | null = await masterRes.json();
        setDaftarMaster(dataMaster || []);
    } catch (err) { // <-- Correct catch syntax
        let message = "Gagal memuat data dropdown.";
        if (err instanceof Error) { message = err.message; } // Type guard
        console.error(message);
        if (message !== 'Anda belum login.' && message !== 'Sesi Anda tidak valid atau telah berakhir. Silakan login kembali.') {
             setError(message); // Show error if it's not an auth issue
        }
    }
  }, [fetchWithAuth]); // <-- Ensure fetchWithAuth is in dependency array

  // <-- Correct dependency array for debouncedFetch
  const debouncedFetch = useCallback(debounce(fetchRiwayatImunisasi, 500), [fetchRiwayatImunisasi]);

  useEffect(() => {
    // fetchWithAuth internally handles redirect if not logged in
    fetchRiwayatImunisasi();
    fetchDropdownData();
  }, [fetchRiwayatImunisasi, fetchDropdownData]); // <-- Correct dependencies

  // --- Handlers ---
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setError('');
    setSuccess('');
    debouncedFetch(query);
  };

  const handleTambahFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setTambahFormData(prevState => ({ ...prevState, [id]: value }));
  };

  const handleTambahSelectChange = (id: 'id_anak' | 'id_master_imunisasi', value: string) => {
    setTambahFormData(prevState => ({ ...prevState, [id]: value }));
  };

  const handleTambahSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    // Prepare payload, validate IDs and date format
    const idAnak = parseInt(tambahFormData.id_anak, 10);
    const idMaster = parseInt(tambahFormData.id_master_imunisasi, 10);

    if (isNaN(idAnak) || idAnak <= 0) {
        setError("Silakan pilih Anak.");
        setIsLoading(false);
        return;
    }
     if (isNaN(idMaster) || idMaster <= 0) {
        setError("Silakan pilih Jenis Imunisasi.");
        setIsLoading(false);
        return;
    }
    if (!tambahFormData.tanggal_imunisasi || !/^\d{4}-\d{2}-\d{2}$/.test(tambahFormData.tanggal_imunisasi)) {
         setError("Format Tanggal Imunisasi tidak valid (YYYY-MM-DD).");
         setIsLoading(false);
         return;
    }


    const payload = {
      id_anak: idAnak,
      id_master_imunisasi: idMaster,
      tanggal_imunisasi: tambahFormData.tanggal_imunisasi, // Send as YYYY-MM-DD string
      catatan: tambahFormData.catatan || null,
    };


    try {
      const response = await fetchWithAuth(API_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal menambah data.');

      setSuccess('Riwayat imunisasi baru berhasil ditambahkan!');
      setTambahFormData({ id_anak: '', id_master_imunisasi: '', tanggal_imunisasi: '', catatan: '' }); // Reset form
      fetchRiwayatImunisasi(searchQuery); // Refresh table
    } catch (err) { // <-- Correct catch syntax
      let message = 'Gagal menambah data.';
      if (err instanceof Error) { message = err.message; } // Type guard
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };


  const handleOpenEditModal = (riwayat: RiwayatImunisasi) => {
    setEditingRiwayat(riwayat);
    setEditFormData({
        id_anak: String(riwayat.id_anak),
        id_master_imunisasi: String(riwayat.id_master_imunisasi),
        tanggal_imunisasi: formatTanggalISO(riwayat.tanggal_imunisasi), // Use formatted ISO date
        catatan: riwayat.catatan || '',
    });
    setIsEditModalOpen(true);
    setError('');
    setSuccess('');
  };

   const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    // Ensure id is a key of EditFormData for type safety
    setEditFormData(prevState => ({ ...prevState, [id as keyof EditFormData]: value }));
  };

  const handleEditSelectChange = (id: 'id_anak' | 'id_master_imunisasi', value: string) => {
    setEditFormData(prevState => ({ ...prevState, [id]: value }));
  };

  const handleUpdateSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingRiwayat) return;
    setIsLoading(true);
    setError('');

     // Prepare payload, validate IDs and date format
    const idAnak = parseInt(editFormData.id_anak, 10);
    const idMaster = parseInt(editFormData.id_master_imunisasi, 10);

    if (isNaN(idAnak) || idAnak <= 0) {
        setError("Silakan pilih Anak.");
        setIsLoading(false);
        return;
    }
     if (isNaN(idMaster) || idMaster <= 0) {
        setError("Silakan pilih Jenis Imunisasi.");
        setIsLoading(false);
        return;
    }
    if (!editFormData.tanggal_imunisasi || !/^\d{4}-\d{2}-\d{2}$/.test(editFormData.tanggal_imunisasi)) {
         setError("Format Tanggal Imunisasi tidak valid (YYYY-MM-DD).");
         setIsLoading(false);
         return;
    }

    const payload = {
      id_anak: idAnak,
      id_master_imunisasi: idMaster,
      tanggal_imunisasi: editFormData.tanggal_imunisasi, // Send as YYYY-MM-DD string
      catatan: editFormData.catatan || null,
    };

    try {
      const response = await fetchWithAuth(`${API_URL}/${editingRiwayat.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal memperbarui data.');

      setSuccess('Data riwayat imunisasi berhasil diperbarui!');
      setIsEditModalOpen(false);
      fetchRiwayatImunisasi(searchQuery);
    } catch (err) { // <-- Correct catch syntax
       let message = 'Gagal memperbarui data.';
      if (err instanceof Error) { message = err.message; } // Type guard
      setError(message); // Show error in modal
    } finally {
      setIsLoading(false);
    }
  };


  const handleDelete = async (id: number) => {
    if (!confirm(`Anda yakin ingin menghapus data riwayat imunisasi ini?`)) { return; }
    setError('');
    setSuccess('');
    try {
      const response = await fetchWithAuth(`${API_URL}/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal menghapus data.');
      setSuccess(`Data riwayat berhasil dihapus!`);
      fetchRiwayatImunisasi(searchQuery);
    } catch (err) { // <-- Correct catch syntax
       let message = 'Gagal menghapus data.';
      if (err instanceof Error) { message = err.message; } // Type guard
      setError(message);
    }
  };

  // --- JSX Return ---
  // Loading state handling (optional, based on UX preference)
  // if (isFetching && daftarRiwayat.length === 0) {
  //   return <div className="text-center p-8">Memuat data...</div>;
  // }

  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Registrasi Imunisasi
        </h1>
        <p className="text-gray-600 mt-1">
          Catat riwayat imunisasi yang telah diberikan kepada anak.
        </p>
      </header>

      {/* --- Form Tambah Data --- */}
      <div className="mb-8">
        <div className="bg-white rounded-xl shadow-md p-6 sm:p-8">
          <form onSubmit={handleTambahSubmit} className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Catat Imunisasi Baru</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Kolom Kiri */}
              <div className="space-y-6">
                <div>
                  <Label htmlFor="id_anak">Nama Anak *</Label>
                  <Select value={tambahFormData.id_anak} onValueChange={(value) => handleTambahSelectChange('id_anak', value)} required>
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder="Pilih Anak..." />
                    </SelectTrigger>
                    <SelectContent>
                      {daftarAnak.length > 0 ? (
                        daftarAnak.map(anak => (
                          <SelectItem key={anak.id} value={String(anak.id)}>
                            {anak.nama_anak} (NIK: {anak.nik_anak || 'N/A'})
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          {isFetching ? 'Memuat...' : 'Tidak ada data anak'}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="id_master_imunisasi">Jenis Imunisasi *</Label>
                  <Select value={tambahFormData.id_master_imunisasi} onValueChange={(value) => handleTambahSelectChange('id_master_imunisasi', value)} required>
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder="Pilih Jenis Imunisasi..." />
                    </SelectTrigger>
                    <SelectContent>
                      {daftarMaster.length > 0 ? (
                        daftarMaster.map(imun => (
                          <SelectItem key={imun.id} value={String(imun.id)}>
                            {imun.nama_imunisasi} (Usia: {imun.usia_ideal_bulan} bln)
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          {isFetching ? 'Memuat...' : 'Tidak ada data imunisasi'}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Kolom Kanan */}
              <div className="space-y-6">
                <div>
                  <Label htmlFor="tanggal_imunisasi">Tanggal Imunisasi *</Label>
                  <Input
                    type="date"
                    id="tanggal_imunisasi"
                    value={tambahFormData.tanggal_imunisasi}
                    onChange={handleTambahFormChange}
                    required
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Field Lebar Penuh */}
            <div>
              <Label htmlFor="catatan">Catatan (Opsional)</Label>
              <Textarea
                id="catatan"
                value={tambahFormData.catatan}
                onChange={handleTambahFormChange}
                placeholder="Misal: Vitamin A Merah, Imunisasi susulan, dll."
                className="mt-1"
                rows={3}
              />
            </div>

            {error && !isEditModalOpen && <p className="text-red-500 text-center font-medium pt-2">{error}</p>}
            {success && !isEditModalOpen && <p className="text-green-600 text-center font-medium pt-2">{success}</p>}

            <div className="pt-4">
              <Button type="submit" disabled={isLoading} className="w-full py-3 bg-cyan-800 hover:bg-cyan-700 cursor-pointer">
                {isLoading ? 'Menyimpan...' : 'Simpan Catatan Imunisasi'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* --- Tabel Data Riwayat Imunisasi --- */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl font-bold text-gray-800">Riwayat Imunisasi Tercatat</h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Cari Nama Anak/Imunisasi..."
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
                <th className="px-6 py-3">Nama Anak</th>
                <th className="px-6 py-3">NIK Anak</th>
                <th className="px-6 py-3">Nama Imunisasi</th>
                <th className="px-6 py-3">Tgl. Imunisasi</th>
                <th className="px-6 py-3">Kader Pencatat</th>
                <th className="px-6 py-3">Terakhir Diedit Oleh</th>
                <th className="px-6 py-3">Catatan</th>
                <th className="px-6 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
               {/* Improved Loading/Empty State */}
              {isFetching && daftarRiwayat.length === 0 ? (
                <tr><td colSpan={8} className="text-center p-8 text-gray-500">Memuat data riwayat...</td></tr>
              ) : !isFetching && daftarRiwayat.length === 0 ? (
                 <tr><td colSpan={8} className="text-center p-8 text-gray-500">
                  {searchQuery ? `Tidak ada data ditemukan untuk "${searchQuery}".` : "Belum ada data riwayat imunisasi."}
                </td></tr>
              ) : (
                daftarRiwayat.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{item.nama_anak || '-'}</td>
                    <td className="px-6 py-4">{item.nik_anak || '-'}</td>
                    <td className="px-6 py-4">{item.nama_imunisasi || '-'}</td>
                    <td className="px-6 py-4">{formatTanggal(item.tanggal_imunisasi)}</td>
                    <td className="px-6 py-4">{item.nama_kader || 'N/A'}</td>
                    <td className="px-6 py-4">{item.nama_kader_updater || '-'}</td> {/* Menampilkan nama kader updater */}
                    <td className="px-6 py-4 max-w-xs truncate" title={item.catatan || ''}>{item.catatan || '-'}</td>
                    <td className="px-6 py-4 flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(item)} className="cursor-pointer">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)} className="cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Modal Update Riwayat --- */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
      <DialogContent className="sm:max-w-md"> {/* Adjusted max-width */}
        <DialogHeader>
          <DialogTitle>Edit Riwayat Imunisasi</DialogTitle> {/* More generic title */}
          <DialogDescription>
            Perbarui data imunisasi anak di bawah ini.
          </DialogDescription>
        </DialogHeader>
          <form onSubmit={handleUpdateSubmit} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2"> {/* Added scroll */}
             {/* Use grid for better layout in modal */}
             <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="id_anak_edit">Nama Anak *</Label>
                  <Select value={editFormData.id_anak} onValueChange={(value) => handleEditSelectChange('id_anak', value)} required>
                    <SelectTrigger className="w-full mt-1" id="id_anak_edit">
                      <SelectValue placeholder="Pilih Anak..." />
                    </SelectTrigger>
                    <SelectContent>
                      {daftarAnak.length > 0 ? (
                        daftarAnak.map(anak => (
                          <SelectItem key={anak.id} value={String(anak.id)}>
                            {anak.nama_anak} (NIK: {anak.nik_anak || 'N/A'})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="loading" disabled>Memuat anak...</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="id_master_imunisasi_edit">Jenis Imunisasi *</Label>
                  <Select value={editFormData.id_master_imunisasi} onValueChange={(value) => handleEditSelectChange('id_master_imunisasi', value)} required>
                    <SelectTrigger className="w-full mt-1" id="id_master_imunisasi_edit">
                      <SelectValue placeholder="Pilih Jenis Imunisasi..." />
                    </SelectTrigger>
                    <SelectContent>
                      {daftarMaster.length > 0 ? (
                        daftarMaster.map(imun => (
                          <SelectItem key={imun.id} value={String(imun.id)}>
                            {imun.nama_imunisasi}
                          </SelectItem>
                        ))
                      ) : (
                         <SelectItem value="loading" disabled>Memuat imunisasi...</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tanggal_imunisasi_edit">Tanggal Imunisasi *</Label>
                  <Input
                    type="date"
                    id="tanggal_imunisasi" // Keep consistent ID with state key
                    value={editFormData.tanggal_imunisasi}
                    onChange={handleEditFormChange}
                    required
                    className="mt-1"
                  />
                </div>
             </div>
             <div>
                <Label htmlFor="catatan_edit">Catatan (Opsional)</Label>
                <Textarea
                  id="catatan" // Keep consistent ID with state key
                  value={editFormData.catatan}
                  onChange={handleEditFormChange}
                  className="mt-1 h-24 resize-none" // Adjust height
                  rows={3}
                />
              </div>

            {error && isEditModalOpen && <p className="text-red-500 text-center text-sm pt-2">{error}</p>} {/* Added text-sm */}

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