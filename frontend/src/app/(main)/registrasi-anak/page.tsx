// src/app/(main)/registrasi-anak/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFetchWithAuth } from '@/lib/utils';

// --- Interface & Tipe Data ---
interface IbuOption { id: number; nama_lengkap: string | null; }
interface Anak { id: number; id_ibu: number; nama_anak: string; nik_anak: string | null; tanggal_lahir: string; jenis_kelamin: string; anak_ke: number | null; berat_lahir_kg: number | null; tinggi_lahir_cm: number | null; created_at: string; updated_at: string | null; nama_ibu: string | null; }
type AnakFormData = { id_ibu: string; nama_anak: string; nik_anak: string; tanggal_lahir: string; jenis_kelamin: string; anak_ke: string; berat_lahir_kg: string; tinggi_lahir_cm: string; }

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
const formatTanggalISO = (tanggalString: string | null) => {
    if (!tanggalString) return '';
    try {
        const date = new Date(tanggalString);
        if (isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
    } catch (_error: unknown) { // Corrected: Added underscore
        console.error("Error parsing date for ISO format:", tanggalString, _error);
        return '';
    }
};
const formatDisplayTanggal = (tanggalString: string | null) => {
      if (!tanggalString) return '-';
      try {
        // Tambah Z atau T00:00:00Z untuk memastikan parsing sebagai UTC
        const date = new Date(tanggalString.includes('T') ? tanggalString : tanggalString + 'T00:00:00Z');
        if (isNaN(date.getTime())) return tanggalString;
        // Format ke DD MMMM YYYY Waktu Indonesia Barat
        return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
      } catch (e) {
        console.error("Error formatting display date:", tanggalString, e);
        return tanggalString;
       }
  };

export default function DataAnakPage() {
  const router = useRouter();
  const { isLoggedIn, isLoadingAuth } = useAuth(); // Dapatkan status auth
  const fetchWithAuth = useFetchWithAuth();

  // --- State ---
  const [daftarAnak, setDaftarAnak] = useState<Anak[]>([]);
  const [daftarIbuOptions, setDaftarIbuOptions] = useState<IbuOption[]>([]);
  const [formData, setFormData] = useState<AnakFormData>({ id_ibu: '', nama_anak: '', nik_anak: '', tanggal_lahir: '', jenis_kelamin: '', anak_ke: '', berat_lahir_kg: '', tinggi_lahir_cm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isFetchingIbu, setIsFetchingIbu] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnak, setEditingAnak] = useState<Anak | null>(null);
  const [editFormData, setEditFormData] = useState<AnakFormData>({ id_ibu: '', nama_anak: '', nik_anak: '', tanggal_lahir: '', jenis_kelamin: '', anak_ke: '', berat_lahir_kg: '', tinggi_lahir_cm: '' });

  const API_URL_ANAK   = 'http://localhost:8080/api/anak';
  const API_URL_IBU = 'http://localhost:8080/api/ibu'; 

  // --- Fungsi Fetch Ibu (Dropdown) ---
  const fetchIbuOptions = useCallback(async () => {
    setIsFetchingIbu(true);
    try {
      const response = await fetchWithAuth(API_URL_IBU); // Gunakan URL API Ibu yang benar
      if (!response.ok) {
           let errorMsg = 'Gagal mengambil data ibu';
            try { const errData = await response.json(); errorMsg = errData.error || errorMsg; }
            catch(_error: unknown) { errorMsg = await response.text() || errorMsg; } // Corrected: Added underscore
          throw new Error(errorMsg);
      }
      const data: IbuOption[] = await response.json();
      setDaftarIbuOptions(data || []);
    } catch (err: unknown) { // <-- Catch unknown error
      let message = 'Gagal memuat daftar ibu.';
       if(err instanceof Error) { message = err.message; }
      console.error("Fetch ibu options failed:", message);
       if (message !== 'Anda belum login.' && message !== 'Sesi Anda tidak valid atau telah berakhir. Silakan login kembali.') {
            setError(message); // Still set error here if needed outside catch block
       }
       setDaftarIbuOptions([]); // Pastikan state kosong jika error
    } finally {
      setIsFetchingIbu(false);
    }
  }, [fetchWithAuth]);

  // --- Fungsi Fetch Anak ---
  const fetchAnak = useCallback(async (query: string = '') => {
    setIsFetching(true);
    setError('');
    let url = API_URL_ANAK;
    if (query) { url += `?search=${encodeURIComponent(query)}`; }
    try {
      const response = await fetchWithAuth(url);
      if (!response.ok) {
        let errorMsg = 'Gagal mengambil data anak';
        try { const errorData = await response.json(); errorMsg = errorData.error || errorMsg; }
        catch (_error: unknown) { errorMsg = await response.text() || errorMsg; } // Corrected: Added underscore
        throw new Error(errorMsg);
      }
      const data: Anak[] = await response.json();
      const formattedData = (data || []).map(anak => ({
        ...anak,
        tanggal_lahir: formatTanggalISO(anak.tanggal_lahir), // Format ke ISO YYYY-MM-DD
      }));
      setDaftarAnak(formattedData);
    } catch (err: unknown) { // <-- Catch unknown error
      let message = 'Tidak dapat memuat data anak.';
       if(err instanceof Error) { message = err.message; }
      console.error("Fetch anak failed:", message);
       if (message !== 'Anda belum login.' && message !== 'Sesi Anda tidak valid atau telah berakhir. Silakan login kembali.') {
         setError(message); // Still set error here if needed outside catch block
       }
      setDaftarAnak([]);
    } finally {
      setIsFetching(false);
    }
  }, [fetchWithAuth]);

  const debouncedFetch = useCallback(debounce(fetchAnak, 500), [fetchAnak]); // Corrected dependency

  // --- useEffect Fetch Data Awal & Redirect ---
   useEffect(() => {
     if (!isLoadingAuth) { // Tunggu auth loading
       if (isLoggedIn) {
         fetchIbuOptions(); // Fetch ibu dulu
         fetchAnak(); // Fetch anak
       } else {
         console.log("AnakPage: Belum login, redirecting...");
         router.push('/login');
       }
     }
   }, [isLoadingAuth, isLoggedIn, fetchAnak, fetchIbuOptions, router]); // <-- Dependensi benar


  // --- Fungsi Helper Konversi Payload ---
  const preparePayload = (data: AnakFormData) => {
      const idIbu = parseInt(data.id_ibu, 10);
      if (isNaN(idIbu) || idIbu <= 0) { throw new Error("Silakan pilih Ibu/Wali."); }
      if (!data.tanggal_lahir || !/^\d{4}-\d{2}-\d{2}$/.test(data.tanggal_lahir)) { throw new Error("Format Tanggal Lahir tidak valid. Gunakan YYYY-MM-DD."); }
      if (!data.jenis_kelamin) { throw new Error("Silakan pilih Jenis Kelamin."); }

      const payload = {
          id_ibu: idIbu,
          nama_anak: data.nama_anak.trim(),
          nik_anak: data.nik_anak.trim() === '' ? null : data.nik_anak.trim(),
          tanggal_lahir: data.tanggal_lahir,
          jenis_kelamin: data.jenis_kelamin,
          anak_ke: data.anak_ke === '' ? null : parseInt(data.anak_ke, 10),
          berat_lahir_kg: data.berat_lahir_kg === '' ? null : parseFloat(data.berat_lahir_kg),
          tinggi_lahir_cm: data.tinggi_lahir_cm === '' ? null : parseFloat(data.tinggi_lahir_cm),
      };
      if (payload.anak_ke !== null && isNaN(payload.anak_ke)) throw new Error("Format Anak Ke tidak valid.");
      if (payload.berat_lahir_kg !== null && isNaN(payload.berat_lahir_kg)) throw new Error("Format Berat Lahir tidak valid.");
      if (payload.tinggi_lahir_cm !== null && isNaN(payload.tinggi_lahir_cm)) throw new Error("Format Tinggi Lahir tidak valid.");
      if (!payload.nama_anak) throw new Error("Nama Anak wajib diisi.");

      return payload;
  };

  // --- Handlers ---
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => { const query = e.target.value; setSearchQuery(query); setError(''); setSuccess(''); debouncedFetch(query); };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const { id, value } = e.target; setFormData(prevState => ({ ...prevState, [id]: value })); };
  const handleSelectChange = (id: keyof AnakFormData, value: string) => { setFormData(prevState => ({ ...prevState, [id]: value })); };
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const { id, value } = e.target; setEditFormData(prevState => ({ ...prevState, [id as keyof AnakFormData]: value })); };
  const handleEditSelectChange = (id: keyof AnakFormData, value: string) => { setEditFormData(prevState => ({ ...prevState, [id]: value })); };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setIsLoading(true); setError(''); setSuccess('');
    try {
      const payload = preparePayload(formData);
      const response = await fetchWithAuth(API_URL_ANAK, { method: 'POST', body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal menambahkan data anak.');
      setSuccess('Data Anak berhasil ditambahkan!'); setFormData({ id_ibu: '', nama_anak: '', nik_anak: '', tanggal_lahir: '', jenis_kelamin: '', anak_ke: '', berat_lahir_kg: '', tinggi_lahir_cm: '' }); fetchAnak(searchQuery);
    } catch (err: unknown) { // <-- Catch unknown error
      let message = 'Gagal menambahkan data anak.';
      if(err instanceof Error) { message = err.message; }
      setError(message);
    } finally { setIsLoading(false); }
  };

  const handleOpenEditModal = (anak: Anak) => {
    setEditingAnak(anak);
    setEditFormData({
      id_ibu: anak.id_ibu?.toString() ?? '',
      nama_anak: anak.nama_anak || '',
      nik_anak: anak.nik_anak || '',
      tanggal_lahir: formatTanggalISO(anak.tanggal_lahir), // Gunakan ISO
      jenis_kelamin: anak.jenis_kelamin || '',
      anak_ke: anak.anak_ke?.toString() ?? '',
      berat_lahir_kg: anak.berat_lahir_kg?.toString() ?? '',
      tinggi_lahir_cm: anak.tinggi_lahir_cm?.toString() ?? '',
    });
    setIsModalOpen(true); setError(''); setSuccess('');
  };

  const handleUpdateSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); if (!editingAnak) return; setIsLoading(true); setError('');
    try {
      const payload = preparePayload(editFormData);
      const response = await fetchWithAuth(`${API_URL_ANAK}/${editingAnak.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal memperbarui data anak.');
      setSuccess('Data Anak berhasil diperbarui!'); setIsModalOpen(false); fetchAnak(searchQuery);
    } catch (err: unknown) { // <-- Catch unknown error
      let message = 'Gagal memperbarui data anak.';
      if(err instanceof Error) { message = err.message; }
      setError(message); // Show error in modal
    } finally { setIsLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Anda yakin ingin menghapus data anak ini?')) return; setError(''); setSuccess('');
    try {
      const response = await fetchWithAuth(`${API_URL_ANAK}/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal menghapus data anak.');
      setSuccess('Data Anak berhasil dihapus!'); fetchAnak(searchQuery);
    } catch (err: unknown) { // <-- Catch unknown error
      let message = 'Gagal menghapus data anak.';
      if(err instanceof Error) { message = err.message; }
      setError(message);
    }
  };


   // --- Render Loading/Redirect ---
   if (isLoadingAuth || ((isFetching || isFetchingIbu) && !daftarAnak.length && !daftarIbuOptions.length)) {
     return <div className="text-center p-8">Memuat data...</div>;
   }
   if (!isLoadingAuth && !isLoggedIn) {
     return <div className="text-center p-8">Mengarahkan ke halaman login...</div>;
   }


  // --- JSX Return ---
  return (
    <>
      {/* --- Form Create Anak --- */}
      <div className="bg-white rounded-xl shadow-md p-6 sm:p-8 mb-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Tambah Data Anak Baru</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div><Label htmlFor="id_ibu">Ibu / Wali *</Label><Select value={formData.id_ibu} onValueChange={(value) => handleSelectChange('id_ibu', value)} required disabled={isFetchingIbu}><SelectTrigger className="w-full mt-1"><SelectValue placeholder={isFetchingIbu ? "Memuat..." : "Pilih Ibu/Wali"} /></SelectTrigger><SelectContent>{daftarIbuOptions.length > 0 ? (daftarIbuOptions.map((ibu) => (<SelectItem key={ibu.id} value={ibu.id.toString()}>{ibu.nama_lengkap || `Ibu ID: ${ibu.id}`}</SelectItem>))) : ( <SelectItem value="disabled" disabled>{isFetchingIbu ? "Memuat..." : "Tidak ada data ibu"}</SelectItem> )}</SelectContent></Select></div>
              <div><Label htmlFor="nama_anak">Nama Lengkap Anak *</Label><Input type="text" id="nama_anak" value={formData.nama_anak} onChange={handleChange} required placeholder="Nama anak" className="mt-1" /></div>
              <div><Label htmlFor="nik_anak">NIK Anak</Label><Input type="text" id="nik_anak" value={formData.nik_anak} onChange={handleChange} placeholder="16 digit NIK (Opsional)" className="mt-1" maxLength={16} /></div>
              <div><Label htmlFor="tanggal_lahir">Tanggal Lahir *</Label><Input type="date" id="tanggal_lahir" value={formData.tanggal_lahir} onChange={handleChange} required className="mt-1" /></div>
              <div><Label htmlFor="jenis_kelamin">Jenis Kelamin *</Label><Select value={formData.jenis_kelamin} onValueChange={(value) => handleSelectChange('jenis_kelamin', value)} required><SelectTrigger className="w-full mt-1"><SelectValue placeholder="Pilih Jenis Kelamin" /></SelectTrigger><SelectContent><SelectItem value="L">Laki-laki</SelectItem><SelectItem value="P">Perempuan</SelectItem></SelectContent></Select></div>
              <div><Label htmlFor="anak_ke">Anak Ke-</Label><Input type="number" id="anak_ke" value={formData.anak_ke} onChange={handleChange} placeholder="(Opsional)" min="1" className="mt-1" /></div>
              <div><Label htmlFor="berat_lahir_kg">Berat Lahir (kg)</Label><Input type="number" step="0.01" id="berat_lahir_kg" value={formData.berat_lahir_kg} onChange={handleChange} placeholder="Contoh: 3.2 (Opsional)" min="0" className="mt-1" /></div>
              <div><Label htmlFor="tinggi_lahir_cm">Tinggi Lahir (cm)</Label><Input type="number" step="0.1" id="tinggi_lahir_cm" value={formData.tinggi_lahir_cm} onChange={handleChange} placeholder="Contoh: 50.5 (Opsional)" min="0" className="mt-1" /></div>
          </div>
          {error && !isModalOpen && <p className="text-red-500 text-center font-medium pt-2">{error}</p>}
          {success && !isModalOpen && <p className="text-green-600 text-center font-medium pt-2">{success}</p>}
          <div className="pt-4"><Button type="submit" disabled={isLoading || isFetchingIbu || !isLoggedIn} className="w-full py-3 bg-cyan-800 hover:bg-cyan-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">{isLoading ? 'Menyimpan...' : 'Tambahkan Data Anak'}</Button></div>
        </form>
      </div>

      {/* --- Tabel Data Anak --- */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <h2 className="text-xl font-bold text-gray-800">Data Anak Terdaftar</h2>
           <div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" /><Input type="text" placeholder="Cari Nama/NIK Anak/Ibu..." value={searchQuery} onChange={handleSearchChange} className="pl-10 pr-4 py-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" /></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
             <thead className="bg-gray-50 text-gray-600 uppercase whitespace-nowrap"><tr><th className="px-6 py-3">Nama Anak</th><th className="px-6 py-3">Nama Ibu</th><th className="px-6 py-3">NIK Anak</th><th className="px-6 py-3">Tgl Lahir</th><th className="px-6 py-3">JK</th><th className="px-6 py-3">Anak Ke</th><th className="px-6 py-3">BB Lahir (Kg)</th><th className="px-6 py-3">TB Lahir (Cm)</th><th className="px-6 py-3">Aksi</th></tr></thead>
             <tbody className="text-gray-700">
               {isFetching && daftarAnak.length === 0 ? (<tr><td colSpan={9} className="text-center p-8 text-gray-500">Memuat data anak...</td></tr>) : !isFetching && daftarAnak.length === 0 ? (<tr><td colSpan={9} className="text-center p-8 text-gray-500">{searchQuery ? `Tidak ada data anak ditemukan untuk "${searchQuery}".` : "Belum ada data anak."}</td></tr>) : (daftarAnak.map((anak) => (<tr key={anak.id} className="border-b hover:bg-gray-50"><td className="px-6 py-4 font-medium">{anak.nama_anak}</td><td className="px-6 py-4">{anak.nama_ibu || '-'}</td><td className="px-6 py-4">{anak.nik_anak || '-'}</td><td className="px-6 py-4 whitespace-nowrap">{formatDisplayTanggal(anak.tanggal_lahir)}</td><td className="px-6 py-4">{anak.jenis_kelamin}</td><td className="px-6 py-4 text-center">{anak.anak_ke ?? '-'}</td><td className="px-6 py-4 text-center">{anak.berat_lahir_kg ?? '-'}</td><td className="px-6 py-4 text-center">{anak.tinggi_lahir_cm ?? '-'}</td><td className="px-6 py-4 flex space-x-2"><Button variant="outline" size="sm" onClick={() => handleOpenEditModal(anak)} className="cursor-pointer"><Pencil className="w-4 h-4" /></Button><Button variant="destructive" size="sm" onClick={() => handleDelete(anak.id)} className="cursor-pointer"><Trash2 className="w-4 h-4" /></Button></td></tr>)))}
             </tbody>
          </table>
        </div>
      </div>

      {/* --- Modal Update Anak --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Data Anak</DialogTitle><DialogDescription>Perbarui data anak di bawah ini.</DialogDescription></DialogHeader>
          <form onSubmit={handleUpdateSubmit} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
              <div><Label htmlFor="id_ibu_edit">Ibu / Wali *</Label><Select value={editFormData.id_ibu} onValueChange={(value) => handleEditSelectChange('id_ibu', value)} required disabled={isFetchingIbu}><SelectTrigger className="w-full mt-1" id="id_ibu_edit"><SelectValue placeholder={isFetchingIbu ? "Memuat..." : "Pilih Ibu/Wali"} /></SelectTrigger><SelectContent>{daftarIbuOptions.map((ibu) => (<SelectItem key={ibu.id} value={ibu.id.toString()}> {ibu.nama_lengkap || `Ibu ID: ${ibu.id}`} </SelectItem>))}{daftarIbuOptions.length === 0 && <SelectItem value="disabled" disabled>{isFetchingIbu ? "Memuat..." : "Tidak ada data ibu"}</SelectItem>}</SelectContent></Select></div>
              <div><Label htmlFor="nama_anak_edit">Nama Lengkap Anak *</Label><Input id="nama_anak" value={editFormData.nama_anak} onChange={handleEditFormChange} required className="mt-1" /></div>
              <div><Label htmlFor="nik_anak_edit">NIK Anak</Label><Input id="nik_anak" value={editFormData.nik_anak} onChange={handleEditFormChange} placeholder="(Opsional)" maxLength={16} className="mt-1"/></div>
              <div><Label htmlFor="tanggal_lahir_edit">Tanggal Lahir *</Label><Input type="date" id="tanggal_lahir" value={editFormData.tanggal_lahir} onChange={handleEditFormChange} required className="mt-1" /></div>
              <div><Label htmlFor="jenis_kelamin_edit">Jenis Kelamin *</Label><Select value={editFormData.jenis_kelamin} onValueChange={(value) => handleEditSelectChange('jenis_kelamin', value)} required><SelectTrigger className="w-full mt-1" id="jenis_kelamin_edit"><SelectValue placeholder="Pilih Jenis Kelamin" /></SelectTrigger><SelectContent><SelectItem value="L">Laki-laki</SelectItem><SelectItem value="P">Perempuan</SelectItem></SelectContent></Select></div>
              <div><Label htmlFor="anak_ke_edit">Anak Ke-</Label><Input type="number" id="anak_ke" value={editFormData.anak_ke} onChange={handleEditFormChange} placeholder="(Opsional)" min="1" className="mt-1"/></div>
              <div><Label htmlFor="berat_lahir_kg_edit">Berat Lahir (kg)</Label><Input type="number" step="0.01" id="berat_lahir_kg" value={editFormData.berat_lahir_kg} onChange={handleEditFormChange} placeholder="(Opsional)" min="0" className="mt-1"/></div>
              <div><Label htmlFor="tinggi_lahir_cm_edit">Tinggi Lahir (cm)</Label><Input type="number" step="0.1" id="tinggi_lahir_cm" value={editFormData.tinggi_lahir_cm} onChange={handleEditFormChange} placeholder="(Opsional)" min="0" className="mt-1"/></div>
            {error && isModalOpen && <p className="text-red-500 text-center pt-2">{error}</p>}
            <DialogFooter className="pt-4 sm:justify-between"><DialogClose asChild><Button type="button" variant="outline" className="cursor-pointer">Batal</Button></DialogClose><Button type="submit" disabled={isLoading || isFetchingIbu} className="cursor-pointer">{isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}