// src/app/(main)/imunisasi-anak/page.tsx
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFetchWithAuth } from '@/lib/utils';

// --- Interface Data ---
interface AnakOption {
  id: number;
  nama_anak: string;
  nik_anak: string | null;
}

interface VaksinOption {
  id: number;
  nama_imunisasi: string;
  usia_ideal_bulan: number;
}

interface RiwayatImunisasi {
  id: number;
  id_anak: number;
  id_master_imunisasi: number;
  tanggal_imunisasi: string;
  catatan: string | null;
  nama_anak: string;
  nik_anak: string | null;
  nama_imunisasi: string;
  nama_kader: string | null;
  created_at: string;
  updated_at: string | null;
}

// --- Tipe Form Data ---
type RiwayatFormData = {
  id_anak: string;
  id_master_imunisasi: string;
  tanggal_imunisasi: string;
  catatan: string;
}

// --- Helper Debounce ---
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => { timeout = null; func(...args); };
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// --- Helper Format Tanggal ---
const formatDisplayTanggal = (tanggalString: string | null) => {
  if (!tanggalString) return '-';
  try {
    const date = new Date(tanggalString.includes('T') ? tanggalString : tanggalString + 'T00:00:00Z');
    if (isNaN(date.getTime())) return tanggalString;
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
  } catch (e) {
    console.error("Error formatting display date:", tanggalString, e);
    return tanggalString;
  }
};

export default function RegistrasiImunisasiPage() {
  const router = useRouter();
  const { isLoggedIn, isLoadingAuth } = useAuth();
  const fetchWithAuth = useFetchWithAuth();

  // --- State ---
  const [daftarRiwayat, setDaftarRiwayat] = useState<RiwayatImunisasi[]>([]);
  const [opsiAnak, setOpsiAnak] = useState<AnakOption[]>([]);
  const [opsiVaksin, setOpsiVaksin] = useState<VaksinOption[]>([]);
  
  const [formData, setFormData] = useState<RiwayatFormData>({
    id_anak: '', id_master_imunisasi: '', tanggal_imunisasi: '', catatan: ''
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // URL API
  const API_URL_RIWAYAT = 'http://localhost:8080/api/riwayat-imunisasi';
  const API_URL_ANAK_SIMPLE = 'http://localhost:8080/api/anak/simple';
  const API_URL_VAKSIN_SIMPLE = 'http://localhost:8080/api/master-imunisasi/simple';

  // --- Fetch Data Options (Anak & Vaksin) ---
  const fetchOptions = useCallback(async () => {
    try {
      const [resAnak, resVaksin] = await Promise.all([
        fetchWithAuth(API_URL_ANAK_SIMPLE),
        fetchWithAuth(API_URL_VAKSIN_SIMPLE)
      ]);

      if (resAnak.ok) setOpsiAnak(await resAnak.json());
      if (resVaksin.ok) setOpsiVaksin(await resVaksin.json());
    } catch (err) {
      console.error("Gagal memuat opsi dropdown:", err);
    }
  }, [fetchWithAuth]);

  // --- Fetch Riwayat Imunisasi ---
  const fetchRiwayat = useCallback(async (query: string = '') => {
    setIsFetching(true);
    setError('');
    let url = API_URL_RIWAYAT;
    if (query) { url += `?search=${encodeURIComponent(query)}`; }
    
    try {
      const response = await fetchWithAuth(url);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Gagal mengambil data riwayat imunisasi');
      }
      const data = await response.json();
      setDaftarRiwayat(data || []);
    } catch (err: unknown) {
      let message = 'Gagal memuat data.';
      if (err instanceof Error) message = err.message;
      console.error(message);
      if (message !== 'Anda belum login.' && message !== 'Sesi Anda tidak valid atau telah berakhir. Silakan login kembali.') {
        setError(message);
      }
    } finally {
      setIsFetching(false);
    }
  }, [fetchWithAuth]);

  const debouncedFetch = useCallback(debounce(fetchRiwayat, 500), [fetchRiwayat]);

  // --- Effect ---
  useEffect(() => {
    if (!isLoadingAuth) {
      if (isLoggedIn) {
        fetchOptions();
        fetchRiwayat();
      } else {
        router.push('/login');
      }
    }
  }, [isLoadingAuth, isLoggedIn, fetchOptions, fetchRiwayat, router]);

  // --- Handlers ---
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedFetch(query);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id: keyof RiwayatFormData, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const preparePayload = (data: RiwayatFormData) => {
    const idAnak = parseInt(data.id_anak, 10);
    const idVaksin = parseInt(data.id_master_imunisasi, 10);
    
    if (isNaN(idAnak) || idAnak <= 0) throw new Error("Pilih Anak terlebih dahulu.");
    if (isNaN(idVaksin) || idVaksin <= 0) throw new Error("Pilih Jenis Imunisasi terlebih dahulu.");
    if (!data.tanggal_imunisasi) throw new Error("Tanggal Imunisasi wajib diisi.");

    return {
      id_anak: idAnak,
      id_master_imunisasi: idVaksin,
      tanggal_imunisasi: data.tanggal_imunisasi, // Format YYYY-MM-DD
      catatan: data.catatan || null
    };
  };

  // --- Create / Update ---
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = preparePayload(formData);
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `${API_URL_RIWAYAT}/${editingId}` : API_URL_RIWAYAT;

      const response = await fetchWithAuth(url, {
        method: method,
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal menyimpan data.');

      setSuccess(editingId ? 'Data berhasil diperbarui!' : 'Imunisasi berhasil dicatat!');
      
      if (!editingId) {
        setFormData({ id_anak: '', id_master_imunisasi: '', tanggal_imunisasi: '', catatan: '' });
      } else {
        setIsModalOpen(false);
      }
      
      fetchRiwayat(searchQuery);
    } catch (err: unknown) {
      let message = 'Gagal menyimpan data.';
      if (err instanceof Error) message = err.message;
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Edit Setup ---
  const handleOpenEditModal = (item: RiwayatImunisasi) => {
    setEditingId(item.id);
    setFormData({
      id_anak: item.id_anak.toString(),
      id_master_imunisasi: item.id_master_imunisasi.toString(),
      // Konversi ISO string ke YYYY-MM-DD untuk input date
      tanggal_imunisasi: item.tanggal_imunisasi ? new Date(item.tanggal_imunisasi).toISOString().split('T')[0] : '',
      catatan: item.catatan || ''
    });
    setIsModalOpen(true);
    setError('');
    setSuccess('');
  };

  // --- Delete ---
  const handleDelete = async (id: number) => {
    if (!confirm('Yakin ingin menghapus data riwayat imunisasi ini?')) return;
    setIsLoading(true);
    try {
      const response = await fetchWithAuth(`${API_URL_RIWAYAT}/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Gagal menghapus data.');
      setSuccess('Data berhasil dihapus!');
      fetchRiwayat(searchQuery);
    } catch (err: unknown) {
      let msg = 'Gagal menghapus.';
      if (err instanceof Error) msg = err.message;
      alert(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingAuth) return <div className="text-center p-8">Memuat...</div>;
  if (!isLoggedIn) return null; 

  return (
    <>
      {/* --- Form Registrasi Imunisasi --- */}
      <div className="bg-white rounded-xl shadow-md p-6 sm:p-8 mb-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Catat Imunisasi Anak</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="id_anak">Nama Anak *</Label>
              <Select value={formData.id_anak} onValueChange={(val) => handleSelectChange('id_anak', val)}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Pilih Anak" />
                </SelectTrigger>
                <SelectContent>
                  {opsiAnak.map((a) => (
                    <SelectItem key={a.id} value={a.id.toString()}>{a.nama_anak}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="id_master_imunisasi">Jenis Imunisasi *</Label>
              <Select value={formData.id_master_imunisasi} onValueChange={(val) => handleSelectChange('id_master_imunisasi', val)}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Pilih Vaksin" />
                </SelectTrigger>
                <SelectContent>
                  {opsiVaksin.map((v) => (
                    <SelectItem key={v.id} value={v.id.toString()}>{v.nama_imunisasi}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tanggal_imunisasi">Tanggal Diberikan *</Label>
              <Input type="date" id="tanggal_imunisasi" value={formData.tanggal_imunisasi} onChange={handleChange} required className="mt-1" />
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <Label htmlFor="catatan">Catatan (Opsional)</Label>
              <Textarea id="catatan" value={formData.catatan} onChange={handleChange} placeholder="Contoh: Reaksi ringan, diberikan di paha kiri..." className="mt-1 h-20 resize-none" />
            </div>
          </div>

          {error && !isModalOpen && <p className="text-red-500 pt-2">{error}</p>}
          {success && !isModalOpen && <p className="text-green-600 pt-2">{success}</p>}

          <div className="pt-4">
            <Button type="submit" disabled={isLoading} className="w-full bg-cyan-800 hover:bg-cyan-700">
              {isLoading ? 'Menyimpan...' : 'Simpan Data Imunisasi'}
            </Button>
          </div>
        </form>
      </div>

      {/* --- Tabel Riwayat --- */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b flex flex-col sm:flex-row justify-between items-center gap-4">
           <h2 className="text-xl font-bold text-gray-800">Riwayat Pemberian Imunisasi</h2>
           <div className="relative w-full sm:w-64">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
             <Input type="text" placeholder="Cari Anak / Vaksin..." value={searchQuery} onChange={handleSearchChange} className="pl-10" />
           </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
             <thead className="bg-gray-50 text-gray-600 uppercase">
               <tr>
                 <th className="px-6 py-3">Nama Anak</th>
                 <th className="px-6 py-3">Vaksin</th>
                 <th className="px-6 py-3">Tgl Diberikan</th>
                 <th className="px-6 py-3">Catatan</th>
                 <th className="px-6 py-3">Kader</th>
                 <th className="px-6 py-3">Aksi</th>
               </tr>
             </thead>
             <tbody className="text-gray-700">
               {isFetching && daftarRiwayat.length === 0 ? (
                 <tr><td colSpan={6} className="text-center p-8">Memuat data...</td></tr>
               ) : daftarRiwayat.length > 0 ? (
                 daftarRiwayat.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                   <td className="px-6 py-4 font-medium">{item.nama_anak}</td>
                   <td className="px-6 py-4">{item.nama_imunisasi}</td>
                   <td className="px-6 py-4 whitespace-nowrap">{formatDisplayTanggal(item.tanggal_imunisasi)}</td>
                   <td className="px-6 py-4 truncate max-w-xs">{item.catatan || '-'}</td>
                   <td className="px-6 py-4">{item.nama_kader || '-'}</td>
                   <td className="px-6 py-4 flex space-x-2">
                     <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(item)}>
                       <Pencil className="w-4 h-4" />
                     </Button>
                     <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>
                       <Trash2 className="w-4 h-4" />
                     </Button>
                   </td>
                 </tr>
                 ))
               ) : (
                 <tr><td colSpan={6} className="text-center p-8">Data tidak ditemukan.</td></tr>
               )}
             </tbody>
          </table>
        </div>
      </div>

      {/* --- Modal Edit --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Data Imunisasi</DialogTitle>
            <DialogDescription>Perbarui data imunisasi yang telah tercatat.</DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div>
              <Label>Nama Anak</Label>
              <Select value={formData.id_anak} onValueChange={(val) => handleSelectChange('id_anak', val)}>
                <SelectTrigger className="w-full mt-1"><SelectValue placeholder="Pilih Anak" /></SelectTrigger>
                <SelectContent>
                  {opsiAnak.map((a) => (<SelectItem key={a.id} value={a.id.toString()}>{a.nama_anak}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Jenis Imunisasi</Label>
              <Select value={formData.id_master_imunisasi} onValueChange={(val) => handleSelectChange('id_master_imunisasi', val)}>
                <SelectTrigger className="w-full mt-1"><SelectValue placeholder="Pilih Vaksin" /></SelectTrigger>
                <SelectContent>
                  {opsiVaksin.map((v) => (<SelectItem key={v.id} value={v.id.toString()}>{v.nama_imunisasi}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tanggal Diberikan</Label>
              <Input type="date" id="tanggal_imunisasi" value={formData.tanggal_imunisasi} onChange={handleChange} required className="mt-1" />
            </div>
            <div>
              <Label>Catatan</Label>
              <Textarea id="catatan" value={formData.catatan} onChange={handleChange} className="mt-1 h-20 resize-none" />
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <DialogFooter className="pt-4 sm:justify-between">
               <DialogClose asChild><Button type="button" variant="outline">Batal</Button></DialogClose>
               <Button type="submit" disabled={isLoading}>{isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}