// src/app/dashboard/data-kader/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose // <-- Tambah DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, Search, KeyRound } from 'lucide-react'; // <-- Import KeyRound

// Interface Kader
interface Kader {
  id: number;
  nama_lengkap: string;
  nik: string | null;
  no_telepon: string | null;
  username: string;
  created_at: string;
  updated_at: string | null;
}
// Tipe untuk form edit
type EditKaderFormData = {
  nama_lengkap: string;
  nik: string;
  no_telepon: string;
  username: string;
}
// Tipe untuk form registrasi
type RegisterKaderFormData = {
    nama_lengkap: string;
    nik: string;
    no_telepon: string;
    username: string;
    password: string;
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

export default function DataKaderPage() {
  const [daftarKader, setDaftarKader] = useState<Kader[]>([]);
  const [registerFormData, setRegisterFormData] = useState<RegisterKaderFormData>({
    nama_lengkap: '', nik: '', no_telepon: '', username: '', password: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // State untuk Modal Edit
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingKader, setEditingKader] = useState<Kader | null>(null);
  const [editFormData, setEditFormData] = useState<EditKaderFormData>({
    nama_lengkap: '', nik: '', no_telepon: '', username: '',
  });

  // State untuk Modal Ubah Password
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [changingPasswordKaderId, setChangingPasswordKaderId] = useState<number | null>(null);
  const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);


  // --- Fungsi Fetch Kader ---
  const fetchKader = useCallback(async (query: string = '') => {
    setIsFetching(true);
    setError(''); // Bersihkan error utama saat fetch
    let url = 'http://localhost:8080/api/kader';
    if (query) {
      url += `?search=${encodeURIComponent(query)}`;
    }
    try {
      const response = await fetch(url);
      if (!response.ok) {
        let errorMsg = 'Gagal mengambil data kader';
        try { const errorData = await response.json(); errorMsg = errorData.error || errorMsg; }
        catch (jsonError) { errorMsg = await response.text() || errorMsg; }
        throw new Error(errorMsg);
      }
      const data: Kader[] = await response.json();
      setDaftarKader(data);
    } catch (err: any) {
      console.error("Fetch kader failed:", err);
      setError('Tidak dapat memuat data kader.'); // Tampilkan error utama
      setDaftarKader([]);
    } finally {
      setIsFetching(false);
    }
  }, []);

  const debouncedFetch = useCallback(debounce(fetchKader, 500), [fetchKader]);

  useEffect(() => {
    fetchKader();
  }, [fetchKader]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedFetch(query);
  };

  // --- Fungsi Registrasi Kader ---
  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setRegisterFormData(prevState => ({ ...prevState, [id]: value }));
  };

  const handleRegisterSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8080/api/kader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerFormData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal mendaftarkan kader.');
      setSuccess('Kader baru berhasil ditambahkan!');
      setRegisterFormData({ nama_lengkap: '', nik: '', no_telepon: '', username: '', password: '' });
      fetchKader(searchQuery);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Fungsi Update Kader ---
  const handleOpenEditModal = (kader: Kader) => {
    setEditingKader(kader);
    setEditFormData({
      nama_lengkap: kader.nama_lengkap || '',
      nik: kader.nik || '',
      no_telepon: kader.no_telepon || '',
      username: kader.username || '',
    });
    setIsEditModalOpen(true);
    setError(''); // Bersihkan error utama
    setSuccess('');
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setEditFormData(prevState => ({ ...prevState, [id]: value }));
  };

  const handleUpdateSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingKader) return;
    setIsLoading(true);
    setError(''); // Bersihkan error di modal edit
    try {
      const response = await fetch(`http://localhost:8080/api/kader/${editingKader.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal memperbarui data kader.');
      setSuccess('Data Kader berhasil diperbarui!'); // Tampilkan success utama
      setIsEditModalOpen(false);
      fetchKader(searchQuery);
    } catch (err: any) {
      setError(err.message); // Tampilkan error di modal edit
    } finally {
      setIsLoading(false);
    }
  };

  // --- Fungsi Delete Kader ---
  const handleDelete = async (id: number) => {
    if (!confirm('Anda yakin ingin menghapus data kader ini?')) { return; }
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`http://localhost:8080/api/kader/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal menghapus data kader.');
      setSuccess('Data Kader berhasil dihapus!'); // Tampilkan success utama
      fetchKader(searchQuery);
    } catch (err: any) {
      setError(err.message); // Tampilkan error utama
    }
  };

  // --- Fungsi Modal Ubah Password ---
  const handleOpenPasswordModal = (kaderId: number) => {
    setChangingPasswordKaderId(kaderId);
    setPasswordData({ current_password: '', new_password: '' });
    setPasswordError('');
    setPasswordSuccess('');
    setIsPasswordModalOpen(true);
    setIsEditModalOpen(false); // Tutup modal edit
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setPasswordData(prevState => ({ ...prevState, [id]: value }));
  };

  const handlePasswordUpdateSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!changingPasswordKaderId) return;
    setIsPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess('');
    try {
      const response = await fetch(`http://localhost:8080/api/kader/${changingPasswordKaderId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordData),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengubah password.');
      }
      setPasswordSuccess('Password berhasil diperbarui!');
      setTimeout(() => {
        setIsPasswordModalOpen(false);
      }, 2000); // Tutup otomatis setelah 2 detik
    } catch (err: any) {
      setPasswordError(err.message); // Tampilkan error di modal password
    } finally {
      setIsPasswordLoading(false);
    }
  };


  // Fungsi formatTanggal
  const formatTanggal = (tanggalString: string | null) => {
    if (!tanggalString) return 'N/A';
    return new Date(tanggalString).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
   };

  return (
    <>
    {/* --- Form Registrasi Kader --- */}
    <div className='flex flex-col gap-9 mb-8'> 
      <div className="bg-white rounded-xl shadow-md p-6 sm:p-8">
        <form onSubmit={handleRegisterSubmit} className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Registrasi Kader Baru</h2>
          <div>
            <Label htmlFor="nama_lengkap">Nama Lengkap</Label>
            <Input type="text" id="nama_lengkap" value={registerFormData.nama_lengkap} onChange={handleRegisterChange} required placeholder="Nama lengkap kader" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="nik">NIK</Label>
            <Input type="text" id="nik" value={registerFormData.nik} onChange={handleRegisterChange} placeholder="16 digit NIK (Opsional)" className="mt-1" maxLength={16} />
          </div>
          <div>
            <Label htmlFor="no_telepon">Nomor Telepon</Label>
            <Input type="text" id="no_telepon" value={registerFormData.no_telepon} onChange={handleRegisterChange} placeholder="Contoh: 0812... (Opsional)" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="username">Username</Label>
            <Input type="text" id="username" value={registerFormData.username} onChange={handleRegisterChange} required placeholder="Username untuk login" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input type="password" id="password" value={registerFormData.password} onChange={handleRegisterChange} required placeholder="Password login" className="mt-1" />
          </div>
          {/* Tampilkan error/success hanya jika bukan dari modal */}
          {error && !isEditModalOpen && !isPasswordModalOpen && <p className="text-red-500 text-center font-medium pt-2">{error}</p>}
          {success && !isPasswordModalOpen && <p className="text-green-600 text-center font-medium pt-2">{success}</p>}
          <div className="pt-4">
            <Button type="submit" disabled={isLoading} className="w-full py-3 bg-cyan-800 hover:bg-cyan-700 cursor-pointer">
              {isLoading ? 'Mendaftarkan...' : 'Daftarkan Kader'}
            </Button>
          </div>
        </form>
      </div>
    </div>
      {/* --- Tabel Data Kader --- */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <h2 className="text-xl font-bold text-gray-800">Data Kader Terdaftar</h2>
           <div className="relative w-full sm:w-64">
             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
             <Input type="text" placeholder="Cari Nama/NIK/Username..." value={searchQuery} onChange={handleSearchChange} className="pl-10 pr-4 py-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
             <thead className="bg-gray-50 text-gray-600 uppercase">
               <tr>
                 <th className="px-6 py-3">Nama Lengkap</th>
                 <th className="px-6 py-3">NIK</th>
                 <th className="px-6 py-3">No. Telepon</th>
                 <th className="px-6 py-3">Username</th>
                 <th className="px-6 py-3">Dibuat</th>
                 <th className="px-6 py-3">Diperbarui</th>
                 <th className="px-6 py-3">Aksi</th>
               </tr>
             </thead>
             <tbody className="text-gray-700">
               {isFetching ? (
                 <tr><td colSpan={7} className="text-center p-8">Memuat data kader...</td></tr>
               ) : daftarKader.length > 0 ? (
                 daftarKader.map((kader) => (
                  <tr key={kader.id} className="border-b hover:bg-gray-50">
                   <td className="px-6 py-4 font-medium">{kader.nama_lengkap}</td>
                   <td className="px-6 py-4">{kader.nik || '-'}</td>
                   <td className="px-6 py-4">{kader.no_telepon || '-'}</td>
                   <td className="px-6 py-4">{kader.username}</td>
                   <td className="px-6 py-4">{formatTanggal(kader.created_at)}</td>
                   <td className="px-6 py-4">{formatTanggal(kader.updated_at)}</td>
                   <td className="px-6 py-4 flex space-x-2">
                     <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(kader)} className="cursor-pointer">
                       <Pencil className="w-4 h-4" />
                     </Button>
                     <Button variant="destructive" size="sm" onClick={() => handleDelete(kader.id)} className="cursor-pointer">
                       <Trash2 className="w-4 h-4" />
                     </Button>
                   </td>
                 </tr>
                 ))
               ) : (
                 <tr><td colSpan={7} className="text-center p-8">
                     {searchQuery ? `Tidak ada kader ditemukan untuk "${searchQuery}".` : "Belum ada data kader."}
                 </td></tr>
               )}
             </tbody>
          </table>
        </div>
      </div>

      {/* --- Modal Update Kader --- */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Data Kader</DialogTitle>
            <DialogDescription>
              Perbarui data kader di bawah ini. Untuk mengubah password, gunakan tombol terpisah.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSubmit} className="space-y-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="nama_lengkap">Nama Lengkap</Label>
              <Input id="nama_lengkap" value={editFormData.nama_lengkap} onChange={handleEditFormChange} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nik">NIK</Label>
              <Input id="nik" value={editFormData.nik} onChange={handleEditFormChange} maxLength={16} placeholder="(Opsional)" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="no_telepon">No. Telepon</Label>
              <Input id="no_telepon" value={editFormData.no_telepon} onChange={handleEditFormChange} placeholder="(Opsional)" />
            </div>
             <div className="space-y-1">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={editFormData.username} onChange={handleEditFormChange} required />
            </div>
            {/* Tampilkan error spesifik modal edit */}
            {error && isEditModalOpen && <p className="text-red-500 text-center pt-2">{error}</p>}

            {/* Tombol Ubah Password */}
            <div className="pt-4">
                 <Button type="button" variant="secondary" onClick={() => handleOpenPasswordModal(editingKader?.id ?? 0)} className="w-full cursor-pointer">
                     <KeyRound className="w-4 h-4 mr-2"/> Ubah Password
                 </Button>
            </div>

            <DialogFooter className="pt-4 sm:justify-between">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)} className="cursor-pointer">Batal</Button>
              <Button type="submit" disabled={isLoading} className="cursor-pointer">
                {isLoading ? 'Menyimpan...' : 'Simpan Perubahan Data'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- Modal Ubah Password --- */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ubah Password Kader</DialogTitle>
            <DialogDescription>
              Masukkan password lama dan password baru Anda.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordUpdateSubmit} className="space-y-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="new_password">Password Baru</Label>
              <Input id="new_password" type="password" value={passwordData.new_password} onChange={handlePasswordChange} required />
            </div>

            {/* Pesan Error/Success Spesifik Modal Password */}
            {passwordError && <p className="text-red-500 text-center pt-2">{passwordError}</p>}
            {passwordSuccess && <p className="text-green-600 text-center pt-2">{passwordSuccess}</p>}

            <DialogFooter className="pt-4 sm:justify-between">
               {/* Gunakan DialogClose agar tombol Batal menutup modal */}
               <DialogClose asChild>
                  <Button type="button" variant="outline" className="cursor-pointer">Batal</Button>
               </DialogClose>
              <Button type="submit" disabled={isPasswordLoading} className="cursor-pointer">
                {isPasswordLoading ? 'Menyimpan...' : 'Simpan Password Baru'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}