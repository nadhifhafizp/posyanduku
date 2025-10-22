// src/app/(main)/registrasi-imunisasi/page.tsx
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
  tanggal_imunisasi: string; // [UPDATE] Sesuaikan nama
  catatan: string | null;
  created_at: string;
  updated_at: string | null;
  // Join fields
  nama_anak: string;
  nik_anak: string | null;
  nama_imunisasi: string;
  nama_kader: string | null; // Kader Pencatat
  nama_kader_updater: string | null; // [BARU] Kader Updater
}

// Tipe untuk form tambah (SANGAT BERSIH)
type TambahFormData = {
  id_anak: string;
  id_master_imunisasi: string;
  tanggal_imunisasi: string; // [UPDATE] Sesuaikan nama
  catatan: string;
}

// Tipe untuk form edit
type EditFormData = {
  id_anak: string;
  id_master_imunisasi: string;
  tanggal_imunisasi: string; // [UPDATE] Sesuaikan nama
  catatan: string;
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

// --- Helper Format Tanggal ---
const formatTanggal = (tanggalString: string | null) => {
  if (!tanggalString) return 'N/A';
  const dateOnly = tanggalString.split('T')[0];
  return new Date(dateOnly).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'
  });
};

const formatTanggalISO = (tanggalString: string | null) => {
    if (!tanggalString) return '';
    try {
        const date = new Date(tanggalString);
        return date.toISOString().split('T')[0];
    } catch (e) {
        return '';
    }
}

// [BARU] Helper untuk fetch dengan Auth
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  // Asumsi token disimpan di localStorage dengan kunci 'authToken'
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  
  const headers = new Headers(options.headers || {});
  headers.append('Content-Type', 'application/json');
  if (token) {
    headers.append('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    console.error("Otorisasi gagal. Silakan login kembali.");
    // Opsional: Arahkan ke halaman login
    // window.location.href = '/login'; 
    throw new Error('Otorisasi gagal. Silakan login kembali.');
  }

  return response;
}


export default function RegistrasiImunisasiPage() {
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
    let url = API_URL;
    if (query) url += `?search=${encodeURIComponent(query)}`;
    try {
      const response = await fetchWithAuth(url); // Pakai Auth
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Gagal mengambil data riwayat imunisasi.');
      }
      const data: RiwayatImunisasi[] | null = await response.json(); 
      setDaftarRiwayat(data || []); 
    } catch (err: any) {
      console.error("Fetch riwayat failed:", err);
      if (!query) setError(`Tidak dapat memuat data: ${err.message}`);
      setDaftarRiwayat([]);
    } finally {
      setIsFetching(false);
    }
  }, []);

  const fetchDropdownData = useCallback(async () => {
    try {
        const [anakRes, masterRes] = await Promise.all([
            fetchWithAuth(API_ANAK_URL), // Pakai Auth
            fetchWithAuth(API_MASTER_URL) // Pakai Auth
        ]);
        if (!anakRes.ok) throw new Error('Gagal memuat daftar anak');
        const dataAnak: AnakSimple[] = await anakRes.json();
        setDaftarAnak(dataAnak);
        
        if (!masterRes.ok) throw new Error('Gagal memuat daftar imunisasi');
        const dataMaster: MasterImunisasiSimple[] = await masterRes.json();
        setDaftarMaster(dataMaster);
    } catch (err: any) {
        console.error(err);
        setError(err.message || "Gagal memuat data dropdown.");
    }
  }, []);

  const debouncedFetch = useCallback(debounce(fetchRiwayatImunisasi, 500), [fetchRiwayatImunisasi]);

  useEffect(() => {
    fetchRiwayatImunisasi();
    fetchDropdownData();
  }, [fetchRiwayatImunisasi, fetchDropdownData]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setError(''); 
    setSuccess(''); 
    debouncedFetch(query);
  };

  // --- Fungsi Handle Form Tambah ---
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

    const payload = {
      ...tambahFormData,
      id_anak: parseInt(tambahFormData.id_anak, 10),
      id_master_imunisasi: parseInt(tambahFormData.id_master_imunisasi, 10),
      catatan: tambahFormData.catatan || null,
      // [DIHAPUS] id_kader_pencatat (diambil dari token di backend)
    };

    if (isNaN(payload.id_anak) || isNaN(payload.id_master_imunisasi)) {
        setError("Pastikan Anak dan Jenis Imunisasi telah dipilih.");
        setIsLoading(false);
        return;
    }

    try {
      const response = await fetchWithAuth(API_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal menambah data.');
      
      setSuccess('Riwayat imunisasi baru berhasil ditambahkan!');
      setTambahFormData({ id_anak: '', id_master_imunisasi: '', tanggal_imunisasi: '', catatan: '' }); 
      fetchRiwayatImunisasi(searchQuery); 
    } catch (err: any) {
      setError(err.message); 
    } finally {
      setIsLoading(false);
    }
  };

  // --- Fungsi Handle Form Edit ---
  const handleOpenEditModal = (riwayat: RiwayatImunisasi) => {
    setEditingRiwayat(riwayat);
    setEditFormData({
        id_anak: String(riwayat.id_anak),
        id_master_imunisasi: String(riwayat.id_master_imunisasi),
        tanggal_imunisasi: formatTanggalISO(riwayat.tanggal_imunisasi),
        catatan: riwayat.catatan || '',
    });
    setIsEditModalOpen(true);
    setError(''); 
    setSuccess(''); 
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setEditFormData(prevState => ({ ...prevState, [id]: value as keyof EditFormData }));
  };
  const handleEditSelectChange = (id: 'id_anak' | 'id_master_imunisasi', value: string) => {
    setEditFormData(prevState => ({ ...prevState, [id]: value }));
  };

  const handleUpdateSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingRiwayat) return;
    setIsLoading(true);
    setError(''); 

    const payload = {
      ...editFormData,
      id_anak: parseInt(editFormData.id_anak, 10),
      id_master_imunisasi: parseInt(editFormData.id_master_imunisasi, 10),
      catatan: editFormData.catatan || null,
      // [DIHAPUS] id_kader_updater (diambil dari token di backend)
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
    } catch (err: any) {
      setError(err.message); 
    } finally {
      setIsLoading(false);
    }
  };

  // --- Fungsi Delete Data ---
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
    } catch (err: any) {
      setError(err.message); 
    }
  };

  // --- JSX Return ---
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

      {/* --- Form Tambah Data (Kartu Putih) --- */}
      <div className="mb-8"> 
        <div className="bg-white rounded-xl shadow-md p-6 sm:p-8">
          <form onSubmit={handleTambahSubmit} className="space-y-6"> 
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Catat Imunisasi Baru</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Kolom Kiri */}
              <div className="space-y-6">
                <div>
                  <Label htmlFor="id_anak">Nama Anak</Label>
                  <Select value={tambahFormData.id_anak} onValueChange={(value) => handleTambahSelectChange('id_anak', value)}>
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
                          Memuat anak...
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="id_master_imunisasi">Jenis Imunisasi</Label>
                  <Select value={tambahFormData.id_master_imunisasi} onValueChange={(value) => handleTambahSelectChange('id_master_imunisasi', value)}>
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
                          Memuat imunisasi...
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Kolom Kanan */}
              <div className="space-y-6">
                <div>
                  <Label htmlFor="tanggal_imunisasi">Tanggal Imunisasi</Label>
                  <Input 
                    type="date" 
                    id="tanggal_imunisasi" // [UPDATE] Sesuaikan ID
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
                <th className="px-6 py-3">Terakhir Diedit</th>
                <th className="px-6 py-3">Catatan</th>
                <th className="px-6 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {isFetching ? (
                <tr><td colSpan={8} className="text-center p-8">Memuat data riwayat...</td></tr>
              ) : daftarRiwayat.length > 0 ? (
                daftarRiwayat.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{item.nama_anak}</td>
                    <td className="px-6 py-4">{item.nik_anak || '-'}</td>
                    <td className="px-6 py-4">{item.nama_imunisasi}</td>
                    <td className="px-6 py-4">{formatTanggal(item.tanggal_imunisasi)}</td>
                    <td className="px-6 py-4">{item.nama_kader || 'N/A'}</td>
                    <td className="px-6 py-4">{item.nama_kader_updater || '-'}</td> {/* [BARU] */}
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
              ) : (
                <tr><td colSpan={8} className="text-center p-8">
                  {searchQuery ? `Tidak ada data ditemukan untuk "${searchQuery}".` : "Belum ada data riwayat imunisasi."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Modal Update Riwayat --- */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Riwayat Imunisasi</DialogTitle>
            <DialogDescription>
              Perbarui data riwayat imunisasi di bawah ini.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSubmit} className="space-y-4 py-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="id_anak_edit">Nama Anak</Label>
                  <Select value={editFormData.id_anak} onValueChange={(value) => handleEditSelectChange('id_anak', value)}>
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
                          Memuat anak...
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="id_master_imunisasi_edit">Jenis Imunisasi</Label>
                  <Select value={editFormData.id_master_imunisasi} onValueChange={(value) => handleEditSelectChange('id_master_imunisasi', value)}>
                    <SelectTrigger className="w-full mt-1">
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
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          Memuat imunisasi...
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tanggal_imunisasi_edit">Tanggal Imunisasi</Label>
                  <Input 
                    type="date" 
                    id="tanggal_imunisasi" // [UPDATE] Sesuaikan ID
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
                  id="catatan" 
                  value={editFormData.catatan} 
                  onChange={handleEditFormChange} 
                  className="mt-1" 
                  rows={3} 
                />
              </div>

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