// src/app/(main)/registrasi-anak/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation'; // <-- 1. Import useRouter
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext'; // <-- 2. Import useAuth
import { useFetchWithAuth } from '@/lib/utils'; // <-- 3. Import useFetchWithAuth

// Interface Ibu (minimal untuk dropdown)
interface IbuOption {
  id: number;
  nama_lengkap: string | null;
}

// Interface Anak
interface Anak {
  id: number;
  id_ibu: number;
  nama_anak: string;
  nik_anak: string | null;
  tanggal_lahir: string; // Biarkan string YYYY-MM-DD untuk form
  jenis_kelamin: string;
  anak_ke: number | null;
  berat_lahir_kg: number | null;
  tinggi_lahir_cm: number | null;
  created_at: string;
  updated_at: string | null;
  nama_ibu: string | null;
}
// Tipe untuk form create/edit
type AnakFormData = {
  id_ibu: string;
  nama_anak: string;
  nik_anak: string;
  tanggal_lahir: string;
  jenis_kelamin: string;
  anak_ke: string;
  berat_lahir_kg: string;
  tinggi_lahir_cm: string;
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

export default function DataAnakPage() {
  const router = useRouter(); // <-- 4. Inisialisasi router
  const { isLoggedIn, authToken } = useAuth(); // <-- 5. Gunakan useAuth
  const fetchWithAuth = useFetchWithAuth(); // <-- 6. Dapatkan fungsi fetch terautentikasi

  const [daftarAnak, setDaftarAnak] = useState<Anak[]>([]);
  const [daftarIbuOptions, setDaftarIbuOptions] = useState<IbuOption[]>([]);
  const [formData, setFormData] = useState<AnakFormData>({
    id_ibu: '', nama_anak: '', nik_anak: '', tanggal_lahir: '', jenis_kelamin: '', anak_ke: '', berat_lahir_kg: '', tinggi_lahir_cm: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isFetchingIbu, setIsFetchingIbu] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnak, setEditingAnak] = useState<Anak | null>(null);
  const [editFormData, setEditFormData] = useState<AnakFormData>({
     id_ibu: '', nama_anak: '', nik_anak: '', tanggal_lahir: '', jenis_kelamin: '', anak_ke: '', berat_lahir_kg: '', tinggi_lahir_cm: ''
  });

  const API_URL_ANAK = 'http://localhost:8080/api/anak';
  const API_URL_IBU = 'http://localhost:8080/api/ibu';

  // --- Fungsi Fetch Ibu (Dropdown) ---
  const fetchIbuOptions = useCallback(async () => {
    setIsFetchingIbu(true);
    try {
      // Gunakan fetchWithAuth jika GET /api/ibu perlu login
      const response = await fetchWithAuth(API_URL_IBU);
      if (!response.ok) throw new Error('Gagal mengambil data ibu');
      const data: IbuOption[] = await response.json();
      setDaftarIbuOptions(data);
    } catch (err: any) {
      console.error("Fetch ibu options failed:", err);
       if (err.message !== 'Anda belum login.' && err.message !== 'Sesi Anda tidak valid atau telah berakhir. Silakan login kembali.') {
            setError('Gagal memuat daftar ibu.');
       }
    } finally {
      setIsFetchingIbu(false);
    }
  }, [fetchWithAuth]); // <-- Tambah dependensi

  // --- Fungsi Fetch Anak ---
  const fetchAnak = useCallback(async (query: string = '') => {
    setIsFetching(true);
    setError('');
    let url = API_URL_ANAK;
    if (query) {
      url += `?search=${encodeURIComponent(query)}`;
    }
    try {
       // Gunakan fetchWithAuth jika GET /api/anak perlu login
      const response = await fetchWithAuth(url);
      if (!response.ok) {
        let errorMsg = 'Gagal mengambil data anak';
        try { const errorData = await response.json(); errorMsg = errorData.error || errorMsg; }
        catch (jsonError) { errorMsg = await response.text() || errorMsg; }
        throw new Error(errorMsg);
      }
      const data: Anak[] = await response.json();
      // Format tanggal lahir menjadi YYYY-MM-DD
      const formattedData = data.map(anak => ({
        ...anak,
        tanggal_lahir: anak.tanggal_lahir ? new Date(anak.tanggal_lahir).toISOString().split('T')[0] : '',
      }));
      setDaftarAnak(formattedData);
    } catch (err: any) {
      console.error("Fetch anak failed:", err);
       if (err.message !== 'Anda belum login.' && err.message !== 'Sesi Anda tidak valid atau telah berakhir. Silakan login kembali.') {
            setError('Tidak dapat memuat data anak.');
       }
      setDaftarAnak([]);
    } finally {
      setIsFetching(false);
    }
  }, [fetchWithAuth]); // <-- Tambah dependensi

  const debouncedFetch = useCallback(debounce(fetchAnak, 500), [fetchAnak]);

  // --- useEffect untuk fetch data awal dan redirect ---
  useEffect(() => {
    if (isLoggedIn) {
        fetchIbuOptions(); // Fetch ibu dulu atau bersamaan
        fetchAnak();
    } else {
        // Redirect jika belum login (setelah cek state awal)
       const checkAuthAndRedirect = async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
            if (!localStorage.getItem('authToken')) {
                console.log("Belum login (anak), mengarahkan ke /login...");
                router.push('/login');
            }
       };
            checkAuthAndRedirect();
    }
  }, [isLoggedIn, fetchAnak, fetchIbuOptions, router]); // Tambahkan dependensi

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedFetch(query);
  };

  // --- Fungsi Helper Konversi Payload ---
  const preparePayload = (data: AnakFormData) => {
      const payload: any = {
          // ...data, // Tidak perlu spread jika field berbeda
          id_ibu: parseInt(data.id_ibu, 10),
          nama_anak: data.nama_anak,
          nik_anak: data.nik_anak === '' ? null : data.nik_anak,
          tanggal_lahir: data.tanggal_lahir, // Sudah string YYYY-MM-DD
          jenis_kelamin: data.jenis_kelamin,
          anak_ke: data.anak_ke === '' ? null : parseInt(data.anak_ke, 10),
          berat_lahir_kg: data.berat_lahir_kg === '' ? null : parseFloat(data.berat_lahir_kg),
          tinggi_lahir_cm: data.tinggi_lahir_cm === '' ? null : parseFloat(data.tinggi_lahir_cm),
      };
      // Basic validation after conversion
      if (isNaN(payload.id_ibu)) payload.id_ibu = 0; // Atau handle error
      if (isNaN(payload.anak_ke)) payload.anak_ke = null;
      if (isNaN(payload.berat_lahir_kg)) payload.berat_lahir_kg = null;
      if (isNaN(payload.tinggi_lahir_cm)) payload.tinggi_lahir_cm = null;

      // Validasi tanggal
      if (!payload.tanggal_lahir || !/^\d{4}-\d{2}-\d{2}$/.test(payload.tanggal_lahir)) {
          throw new Error("Format Tanggal Lahir tidak valid. Gunakan YYYY-MM-DD.");
      }

      return payload;
  };

  // --- Fungsi Create Anak ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prevState => ({ ...prevState, [id]: value }));
  };
  const handleSelectChange = (id: keyof AnakFormData, value: string) => {
      setFormData(prevState => ({ ...prevState, [id]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(''); setSuccess(''); setIsLoading(true);

    try {
      const payload = preparePayload(formData); // Validasi format tanggal di sini

      if (!payload.id_ibu || payload.id_ibu <= 0) {
          throw new Error("Silakan pilih Ibu/Wali.");
      }
      if (!payload.jenis_kelamin) {
          throw new Error("Silakan pilih Jenis Kelamin.");
      }

       // Gunakan fetchWithAuth untuk POST
      const response = await fetchWithAuth(API_URL_ANAK, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal menambahkan data anak.');

      setSuccess('Data Anak berhasil ditambahkan!');
      setFormData({ id_ibu: '', nama_anak: '', nik_anak: '', tanggal_lahir: '', jenis_kelamin: '', anak_ke: '', berat_lahir_kg: '', tinggi_lahir_cm: '' }); // Reset form
      fetchAnak(searchQuery); // Refresh tabel
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Fungsi Update Anak ---
  const handleOpenEditModal = (anak: Anak) => {
    setEditingAnak(anak);
    setEditFormData({
      id_ibu: anak.id_ibu?.toString() ?? '',
      nama_anak: anak.nama_anak || '',
      nik_anak: anak.nik_anak || '',
      // Pastikan format YYYY-MM-DD
      tanggal_lahir: anak.tanggal_lahir ? new Date(anak.tanggal_lahir).toISOString().split('T')[0] : '',
      jenis_kelamin: anak.jenis_kelamin || '',
      anak_ke: anak.anak_ke?.toString() ?? '',
      berat_lahir_kg: anak.berat_lahir_kg?.toString() ?? '',
      tinggi_lahir_cm: anak.tinggi_lahir_cm?.toString() ?? '',
    });
    setIsModalOpen(true);
    setError(''); setSuccess('');
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setEditFormData(prevState => ({ ...prevState, [id]: value }));
  };
  const handleEditSelectChange = (id: keyof AnakFormData, value: string) => {
      setEditFormData(prevState => ({ ...prevState, [id]: value }));
  };

  const handleUpdateSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingAnak) return;
    setIsLoading(true); setError('');

    try {
      const payload = preparePayload(editFormData); // Validasi format tanggal

       if (!payload.id_ibu || payload.id_ibu <= 0) {
          throw new Error("Silakan pilih Ibu/Wali.");
      }
       if (!payload.jenis_kelamin) {
          throw new Error("Silakan pilih Jenis Kelamin.");
      }

      // Gunakan fetchWithAuth untuk PUT
      const response = await fetchWithAuth(`${API_URL_ANAK}/${editingAnak.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal memperbarui data anak.');

      setSuccess('Data Anak berhasil diperbarui!');
      setIsModalOpen(false);
      fetchAnak(searchQuery);
    } catch (err: any) {
      setError(err.message); // Show error in modal
    } finally {
      setIsLoading(false);
    }
  };

  // --- Fungsi Delete Anak ---
  const handleDelete = async (id: number) => {
    if (!confirm('Anda yakin ingin menghapus data anak ini?')) { return; }
    setError(''); setSuccess('');
    try {
       // Gunakan fetchWithAuth untuk DELETE
      const response = await fetchWithAuth(`${API_URL_ANAK}/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal menghapus data anak.');
      setSuccess('Data Anak berhasil dihapus!');
      fetchAnak(searchQuery);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Fungsi formatTanggal untuk tampilan
  const formatTanggal = (tanggalString: string | null) => {
    if (!tanggalString) return 'N/A';
     try {
        return new Date(tanggalString).toLocaleString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
     } catch(e) { return 'Invalid Date'; }
   };
   // Fungsi format tanggal HANYA untuk tampilan di tabel
   const formatDisplayTanggal = (tanggalString: string | null) => {
      if (!tanggalString) return '-';
      try {
        // Asumsi input YYYY-MM-DD dari state
        const date = new Date(tanggalString + 'T00:00:00'); // Tambahkan waktu agar tidak ada isu timezone
        if (isNaN(date.getTime())) return tanggalString; // Handle invalid date string
        return date.toLocaleDateString('id-ID', {
            day: '2-digit', month: 'long', year: 'numeric'
        });
      } catch (e) {
          console.error("Error formatting display date:", tanggalString, e);
          return tanggalString;
       }
  };

  // Render loading atau pesan jika belum login
   if ((isFetching || isFetchingIbu) && !daftarAnak.length && !daftarIbuOptions.length) {
     return <div className="text-center p-8">Memuat data...</div>;
   }
   if (!isLoggedIn && !isFetching && !isFetchingIbu) {
     return <div className="text-center p-8">Anda harus login untuk mengakses halaman ini. Mengarahkan...</div>;
   }


  return (
    <>
      {/* --- Form Create Anak --- */}
      <div className="bg-white rounded-xl shadow-md p-6 sm:p-8 mb-8"> {/* Tambah mb-8 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Tambah Data Anak Baru</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <Label htmlFor="id_ibu">Ibu / Wali *</Label>
                <Select value={formData.id_ibu} onValueChange={(value) => handleSelectChange('id_ibu', value)} required disabled={isFetchingIbu}>
                    <SelectTrigger className="w-full mt-1">
                        <SelectValue placeholder={isFetchingIbu ? "Memuat..." : "Pilih Ibu/Wali"} />
                    </SelectTrigger>
                    <SelectContent>
                        {daftarIbuOptions.length > 0 ? (
                            daftarIbuOptions.map((ibu) => (
                                <SelectItem key={ibu.id} value={ibu.id.toString()}>
                                    {ibu.nama_lengkap || `Ibu ID: ${ibu.id}`}
                                </SelectItem>
                            ))
                        ) : ( <SelectItem value="disabled" disabled> {isFetchingIbu ? "Memuat..." : "Tidak ada data ibu"} </SelectItem> )}
                    </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="nama_anak">Nama Lengkap Anak *</Label>
                <Input type="text" id="nama_anak" value={formData.nama_anak} onChange={handleChange} required placeholder="Nama anak" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="nik_anak">NIK Anak</Label>
                <Input type="text" id="nik_anak" value={formData.nik_anak} onChange={handleChange} placeholder="16 digit NIK (Opsional)" className="mt-1" maxLength={16} />
              </div>
              <div>
                <Label htmlFor="tanggal_lahir">Tanggal Lahir *</Label>
                <Input type="date" id="tanggal_lahir" value={formData.tanggal_lahir} onChange={handleChange} required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="jenis_kelamin">Jenis Kelamin *</Label>
                 <Select value={formData.jenis_kelamin} onValueChange={(value) => handleSelectChange('jenis_kelamin', value)} required>
                    <SelectTrigger className="w-full mt-1"> <SelectValue placeholder="Pilih Jenis Kelamin" /> </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="L">Laki-laki</SelectItem>
                        <SelectItem value="P">Perempuan</SelectItem>
                    </SelectContent>
                </Select>
              </div>
               <div>
                <Label htmlFor="anak_ke">Anak Ke-</Label>
                <Input type="number" id="anak_ke" value={formData.anak_ke} onChange={handleChange} placeholder="(Opsional)" min="1" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="berat_lahir_kg">Berat Lahir (kg)</Label>
                <Input type="number" step="0.01" id="berat_lahir_kg" value={formData.berat_lahir_kg} onChange={handleChange} placeholder="Contoh: 3.2 (Opsional)" min="0" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="tinggi_lahir_cm">Tinggi Lahir (cm)</Label>
                <Input type="number" step="0.1" id="tinggi_lahir_cm" value={formData.tinggi_lahir_cm} onChange={handleChange} placeholder="Contoh: 50.5 (Opsional)" min="0" className="mt-1" />
              </div>
          </div>
          {/* Pesan Error/Success & Tombol Submit */}
          {error && !isModalOpen && <p className="text-red-500 text-center font-medium pt-2">{error}</p>}
          {success && !isModalOpen && <p className="text-green-600 text-center font-medium pt-2">{success}</p>}
          <div className="pt-4">
            <Button type="submit" disabled={isLoading || isFetchingIbu || !isLoggedIn} className="w-full py-3 bg-cyan-800 hover:bg-cyan-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? 'Menyimpan...' : 'Tambahkan Data Anak'}
            </Button>
          </div>
        </form>
      </div>

      {/* --- Tabel Data Anak --- */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <h2 className="text-xl font-bold text-gray-800">Data Anak Terdaftar</h2>
           <div className="relative w-full sm:w-64">
             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
             <Input type="text" placeholder="Cari Nama/NIK Anak/Ibu..." value={searchQuery} onChange={handleSearchChange} className="pl-10 pr-4 py-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
             <thead className="bg-gray-50 text-gray-600 uppercase whitespace-nowrap">
               <tr>
                 <th className="px-6 py-3">Nama Anak</th>
                 <th className="px-6 py-3">Nama Ibu</th>
                 <th className="px-6 py-3">NIK Anak</th>
                 <th className="px-6 py-3">Tgl Lahir</th>
                 <th className="px-6 py-3">JK</th>
                 <th className="px-6 py-3">Anak Ke</th>
                 <th className="px-6 py-3">BB Lahir (Kg)</th>
                 <th className="px-6 py-3">TB Lahir (Cm)</th>
                 <th className="px-6 py-3">Aksi</th>
               </tr>
             </thead>
             <tbody className="text-gray-700">
               {isFetching && daftarAnak.length === 0 ? ( // Perbaiki kondisi loading
                 <tr><td colSpan={9} className="text-center p-8">Memuat data anak...</td></tr>
               ) : daftarAnak.length > 0 ? (
                 daftarAnak.map((anak) => (
                  <tr key={anak.id} className="border-b hover:bg-gray-50">
                   <td className="px-6 py-4 font-medium">{anak.nama_anak}</td>
                   <td className="px-6 py-4">{anak.nama_ibu || '-'}</td>
                   <td className="px-6 py-4">{anak.nik_anak || '-'}</td>
                   <td className="px-6 py-4 whitespace-nowrap">{formatDisplayTanggal(anak.tanggal_lahir)}</td>
                   <td className="px-6 py-4">{anak.jenis_kelamin}</td>
                   <td className="px-6 py-4 text-center">{anak.anak_ke ?? '-'}</td>
                   <td className="px-6 py-4 text-center">{anak.berat_lahir_kg ?? '-'}</td>
                   <td className="px-6 py-4 text-center">{anak.tinggi_lahir_cm ?? '-'}</td>
                   <td className="px-6 py-4 flex space-x-2">
                     <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(anak)} className="cursor-pointer">
                       <Pencil className="w-4 h-4" />
                     </Button>
                     <Button variant="destructive" size="sm" onClick={() => handleDelete(anak.id)} className="cursor-pointer">
                       <Trash2 className="w-4 h-4" />
                     </Button>
                   </td>
                 </tr>
                 ))
               ) : (
                 <tr><td colSpan={9} className="text-center p-8">
                     {searchQuery ? `Tidak ada data anak ditemukan untuk "${searchQuery}".` : "Belum ada data anak."}
                 </td></tr>
               )}
             </tbody>
          </table>
        </div>
      </div>

      {/* --- Modal Update Anak --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Data Anak</DialogTitle>
            <DialogDescription>Perbarui data anak di bawah ini.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSubmit} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <Label htmlFor="id_ibu_edit">Ibu / Wali *</Label> {/* ID unik */}
                 <Select value={editFormData.id_ibu} onValueChange={(value) => handleEditSelectChange('id_ibu', value)} required disabled={isFetchingIbu}>
                    <SelectTrigger className="w-full mt-1" id="id_ibu_edit"> <SelectValue placeholder={isFetchingIbu ? "Memuat..." : "Pilih Ibu/Wali"} /> </SelectTrigger>
                    <SelectContent>
                        {daftarIbuOptions.map((ibu) => (
                            <SelectItem key={ibu.id} value={ibu.id.toString()}> {ibu.nama_lengkap || `Ibu ID: ${ibu.id}`} </SelectItem>
                        ))}
                         {daftarIbuOptions.length === 0 && <SelectItem value="disabled" disabled> {isFetchingIbu ? "Memuat..." : "Tidak ada data ibu"} </SelectItem>}
                    </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="nama_anak_edit">Nama Lengkap Anak *</Label> {/* ID unik */}
                <Input id="nama_anak" value={editFormData.nama_anak} onChange={handleEditFormChange} required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="nik_anak_edit">NIK Anak</Label> {/* ID unik */}
                <Input id="nik_anak" value={editFormData.nik_anak} onChange={handleEditFormChange} placeholder="(Opsional)" maxLength={16} className="mt-1"/>
              </div>
              <div>
                <Label htmlFor="tanggal_lahir_edit">Tanggal Lahir *</Label> {/* ID unik */}
                <Input type="date" id="tanggal_lahir" value={editFormData.tanggal_lahir} onChange={handleEditFormChange} required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="jenis_kelamin_edit">Jenis Kelamin *</Label> {/* ID unik */}
                 <Select value={editFormData.jenis_kelamin} onValueChange={(value) => handleEditSelectChange('jenis_kelamin', value)} required>
                    <SelectTrigger className="w-full mt-1" id="jenis_kelamin_edit"> <SelectValue placeholder="Pilih Jenis Kelamin" /> </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="L">Laki-laki</SelectItem>
                        <SelectItem value="P">Perempuan</SelectItem>
                    </SelectContent>
                </Select>
              </div>
               <div>
                <Label htmlFor="anak_ke_edit">Anak Ke-</Label> {/* ID unik */}
                <Input type="number" id="anak_ke" value={editFormData.anak_ke} onChange={handleEditFormChange} placeholder="(Opsional)" min="1" className="mt-1"/>
              </div>
              <div>
                <Label htmlFor="berat_lahir_kg_edit">Berat Lahir (kg)</Label> {/* ID unik */}
                <Input type="number" step="0.01" id="berat_lahir_kg" value={editFormData.berat_lahir_kg} onChange={handleEditFormChange} placeholder="(Opsional)" min="0" className="mt-1"/>
              </div>
              <div>
                <Label htmlFor="tinggi_lahir_cm_edit">Tinggi Lahir (cm)</Label> {/* ID unik */}
                <Input type="number" step="0.1" id="tinggi_lahir_cm" value={editFormData.tinggi_lahir_cm} onChange={handleEditFormChange} placeholder="(Opsional)" min="0" className="mt-1"/>
              </div>
            {/* Error Message Modal */}
            {error && isModalOpen && <p className="text-red-500 text-center pt-2">{error}</p>}
            <DialogFooter className="pt-4 sm:justify-between">
               <DialogClose asChild>
                  <Button type="button" variant="outline" className="cursor-pointer">Batal</Button>
               </DialogClose>
              <Button type="submit" disabled={isLoading || isFetchingIbu} className="cursor-pointer">
                {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}