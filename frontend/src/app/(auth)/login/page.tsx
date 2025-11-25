// src/app/(auth)/login/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; 
import Image from 'next/image';
import logoPosyandu from '@/img/posyanduku.png';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  // ... (kode state dan handler login TETAP SAMA seperti sebelumnya) ...
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8080/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login gagal');
      }

      if (data.token && data.user && data.user.id && data.user.nama_lengkap) {
        login(data.user.id, data.token, data.user.nama_lengkap);
        router.push('/dashboard');
      } else {
        throw new Error("Token atau data user tidak lengkap dari server.");
      }

    } catch (err) {
      let message = 'Terjadi kesalahan tidak dikenal';
      if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-100 flex justify-center items-center min-h-screen text-gray-800">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl flex items-center p-4 mx-4">
        {/* Kolom Kiri Logo */}
        <div className="hidden md:flex flex-1 flex-col items-center text-center border-r border-slate-200 pr-8">
          <div className="logo w-64 h-64 mb-4 flex items-center justify-center">
             <Image
                src={logoPosyandu}
                alt="Logo Posyandu"
                width={256}
                height={256}
                className="object-contain"
                priority
             />
          </div>
          <h2 className="text-2xl font-semibold text-cyan-900">POSYANDUKU</h2>
          <p className="text-sm font-medium tracking-wider text-cyan-700">Sistem Manajemen Posyandu</p>
        </div>

        {/* Kolom Kanan: Form Login */}
        <div className="w-full md:flex-[1.2] text-left md:pl-12 py-8 px-4">
          <h2 className="text-xl font-medium text-cyan-800">E-POSYANDU</h2>
          <h1 className="text-3xl font-bold mt-1">Selamat Datang, Kader</h1>
          <p className="text-gray-500 mt-2 mb-8">Silakan masuk untuk melanjutkan</p>

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="username" className="block mb-2 font-medium text-gray-700">Username Kader</label>
              <input
                type="text"
                id="username"
                placeholder="Masukkan Username Anda"
                className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 focus:outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/20 transition duration-150"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="mb-6">
              <label htmlFor="password" className="block mb-2 font-medium text-gray-700">Password</label>
              <input
                type="password"
                id="password"
                placeholder="Masukkan Password"
                className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 focus:outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/20 transition duration-150"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-red-500 mb-4 font-medium">{error}</p>}

            <button type="submit"
              className="w-full py-3.5 bg-cyan-800 text-white rounded-lg font-semibold text-base shadow-md hover:bg-cyan-700 transition-colors cursor-pointer disabled:bg-slate-400 disabled:cursor-not-allowed"
              disabled={isLoading}>
              {isLoading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          {/* --- TAMBAHAN: Link ke Page Publik --- */}
          <div className="mt-6 text-center pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-600 mb-2">Ibu atau Wali?</p>
            <Link href="/cek-perkembangan">
              <span className="inline-block w-full py-3 px-4 bg-cyan-50 text-cyan-800 rounded-lg font-semibold text-sm hover:bg-cyan-100 transition-colors cursor-pointer border border-cyan-200">
                Cek Perkembangan Anak Di Sini
              </span>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}