// src/app/dashboard/data-ibu/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose // <-- Tambahkan DialogClose jika perlu
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2, Search } from 'lucide-react';

// --- Interface & Tipe Data ---
interface Ibu {
  id: number;
  nama_lengkap: string | null;
  nik: string | null;
  no_telepon: string | null;
  alamat: string | null;
  created_at: string;
  updated_at: string | null;
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
  // State untuk form tambah di atas
  const [formData, setFormData] = useState({ 
    nama_lengkap: '', 
    nik: '', 
    no_telepon: '', 
    alamat: '' 
  });
  const [error, setError] = useState(''); // Error untuk form tambah & modal edit
  const [success, setSuccess] = useState(''); // Success untuk form tambah & tabel
  const [isLoading, setIsLoading] = useState(false); // Loading untuk form tambah & modal edit
  const [isFetching, setIsFetching] = useState(true); // Loading untuk tabel
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

  // State baru untuk menyimpan ID Kader yang login
  const [kaderId, setKaderId] = useState<number | null>(null);

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
      const response = await fetch(url);
      if (!response.ok) {
        let errorMsg = 'Gagal mengambil data';
        try { const errorData = await response.json(); errorMsg = errorData.error || errorMsg; }
        catch (jsonError) { errorMsg = await response.text() || errorMsg; }
        throw new Error(errorMsg);
      }
      const data: Ibu[] | null = await response.json(); // Data bisa null
      setDaftarIbu(data || []); // Pastikan selalu array
    } 
    catch (err: any) {
      console.error("Fetch failed:", err);
      setError('Tidak dapat memuat data wali terdaftar.');
      setDaftarIbu([]);
    } finally {
      setIsFetching(false);
    }
  }, []);

  const debouncedFetch = useCallback(debounce(fetchIbu, 500), [fetchIbu]);

  useEffect(() => {
    fetchIbu();
  }, [fetchIbu]);

  // --- useEffect baru untuk mengambil ID Kader dari localStorage ---
  useEffect(() => {
    const kaderDataString = localStorage.getItem('kaderUser');
    if (kaderDataString) {
      try {
        const kader = JSON.parse(kaderDataString);
        if (kader && typeof kader.id === 'number') {
          setKaderId(kader.id); // Simpan ID ke state
        } else {
          console.error("Data kader di localStorage tidak valid:", kader);
          setError("Data sesi kader tidak valid. Harap login kembali.");
        }
      } catch (e) {
        console.error("Gagal parse data kader dari localStorage:", e);
        setError("Sesi Anda rusak. Harap login kembali.");
      }
    } else {
      // Handle jika tidak ada data kader (misal: belum login)
      setError("Anda belum login. Silakan login untuk menambah data ibu.");
      // Opsional: Redirect ke halaman login
      // router.push('/login'); 
    }
  }, []); // [] = Hanya dijalankan sekali saat komponen mount

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedFetch(query);
  };

  // --- Handler untuk form tambah di atas ---
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

    // Validasi ID Kader sebelum mengirim
    if (!kaderId) {
      setError("ID Kader pendaftar tidak ditemukan. Pastikan Anda sudah login.");
      setIsLoading(false);
      return; // Hentikan proses jika ID kader tidak ada
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Gunakan kaderId dari state
        body: JSON.stringify({ ...formData, id_kader_pendaftar: kaderId }), 
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
    setError(''); // Bersihkan error utama/form
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
    setError(''); // Bersihkan error di modal

    try {
      const response = await fetch(`${API_URL}/${editingIbu.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal memperbarui data.');

      setSuccess('Data Wali berhasil diperbarui!'); // Tampilkan success utama
      setIsModalOpen(false); // Tutup modal
      fetchIbu(searchQuery); // Refresh tabel
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
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal menghapus data.');

      setSuccess('Data Wali berhasil dihapus!'); // Tampilkan success utama
      fetchIbu(searchQuery); // Refresh tabel
    } catch (err: any) {
      setError(err.message); // Tampilkan error utama
    }
  };

  // --- Fungsi Format Tanggal ---
  const formatTanggal = (tanggalString: string | null) => {
    if (!tanggalString) return 'N/A'; // Ganti dari 'Belum pernah'
    return new Date(tanggalString).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    // Style konsisten dengan data-kader (div pembungkus)
    <div className="flex flex-col gap-9"> 
      {/* --- Form Create (Style dari data-kader) --- */}
      <div className="bg-white rounded-xl shadow-md p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Daftarkan Wali / Ibu Baru</h2> 
          {/* Layout grid disamakan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4"> 
            {/* Kolom Kiri */}
            <div className="space-y-4"> 
              <div>
                <Label htmlFor="nama_lengkap">Nama Lengkap</Label>
                <Input type="text" id="nama_lengkap" value={formData.nama_lengkap} onChange={handleChange} required placeholder="Masukkan nama lengkap" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="nik">Nomor Induk Kependudukan (NIK)</Label>
                <Input type="text" id="nik" value={formData.nik} onChange={handleChange} required placeholder="Masukkan 16 digit NIK" className="mt-1" maxLength={16} />
              </div>
              <div>
                <Label htmlFor="no_telepon">Nomor Telepon</Label>
                <Input type="text" id="no_telepon" value={formData.no_telepon} onChange={handleChange} required placeholder="Contoh: 081234567890" className="mt-1" />
              </div>
            </div>
            {/* Kolom Kanan */}
            <div className="space-y-1"> 
              <Label htmlFor="alamat">Alamat Lengkap</Label>
              <Textarea id="alamat" value={formData.alamat} onChange={handleChange} required placeholder="Masukkan alamat lengkap" className="mt-1 h-full min-h-[170px] md:min-h-[220px] resize-none" /> 
            </div>
          </div>
          {/* Tampilkan error/success hanya jika BUKAN dari modal */}
          {error && !isModalOpen && <p className="text-red-500 text-center font-medium pt-2">{error}</p>}
          {success && <p className="text-green-600 text-center font-medium pt-2">{success}</p>}
          <div className="pt-4"> 
            <Button type="submit" disabled={isLoading || !kaderId} className="w-full py-3 bg-cyan-800 hover:bg-cyan-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? 'Menyimpan...' : (kaderId ? 'Daftarkan Wali' : 'Login Dibutuhkan')}
            </Button>
          </div>
        </form>
      </div>

      {/* --- Tabel Read (Style dari data-kader) --- */}
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
      {/* ... thead Anda ... */}
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
      {isFetching ? (
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
{/* </div> penutup tambahan ini sepertinya salah di kode Anda, 
    pastikan struktur div-nya benar. Saya hapus di sini. */}
      </div>

      {/* --- Modal Update (Style dari shadcn/ui dan data-kader) --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Data Wali</DialogTitle>
            <DialogDescription>
              Perbarui data wali di bawah ini. Klik simpan jika sudah selesai.
            </DialogDescription>
          </DialogHeader>
          {/* Menggunakan space-y seperti form tambah */}
          <form onSubmit={handleUpdateSubmit} className="space-y-4 py-4"> 
            {/* Menggunakan div biasa + label + input seperti form tambah */}
            <div className="space-y-1"> 
              <Label htmlFor="nama_lengkap_edit">Nama Lengkap</Label> {/* ID unik untuk modal */}
              <Input id="nama_lengkap" value={editFormData.nama_lengkap} onChange={handleEditFormChange} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nik_edit">NIK</Label>
              <Input id="nik" value={editFormData.nik} onChange={handleEditFormChange} required maxLength={16} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="no_telepon_edit">No. Telepon</Label>
              <Input id="no_telepon" value={editFormData.no_telepon} onChange={handleEditFormChange} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="alamat_edit">Alamat</Label>
              <Textarea id="alamat" value={editFormData.alamat} onChange={handleEditFormChange} required />
            </div>
            {/* Tampilkan error spesifik modal */}
            {error && isModalOpen && <p className="text-red-500 text-center pt-2">{error}</p>} 
            <DialogFooter className="pt-4 sm:justify-between"> {/* Layout tombol disamakan */}
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