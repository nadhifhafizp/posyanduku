'use client' ;

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { useAuth } from '@/context/AuthContext';
import { useCallback } from "react";
import { useRouter } from 'next/navigation';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function useFetchWithAuth()   {
  const { authToken, logout } = useAuth(); // Ambil token dan fungsi logout
  const router = useRouter(); // Inisialisasi router

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    if (!authToken) {
        console.error("Tidak ada token autentikasi. Silakan login kembali.");
        router.push('/login'); // Arahkan ke login
        throw new Error('Anda belum login.');
    }

    const headers = new Headers(options.headers || {});
    // Jangan tambahkan Content-Type jika mengirim FormData (misal untuk upload file)
    if (!(options.body instanceof FormData)) {
        headers.append('Content-Type', 'application/json');
    }
    headers.append('Authorization', `Bearer ${authToken}`); // Tambahkan token

    try {
        const response = await fetch(url, { ...options, headers });

        if (response.status === 401) {
            console.error("Otorisasi gagal (401). Token mungkin tidak valid atau kedaluwarsa.");
            logout(); // Hapus sesi yang tidak valid
            router.push('/login'); // Arahkan ke halaman login
            throw new Error('Sesi Anda tidak valid atau telah berakhir. Silakan login kembali.');
        }

        return response;
    } catch (error) {
        console.error("Fetch error:", error);
        // Tangani error jaringan atau lainnya
        if (error instanceof Error && error.message.includes('valid')) {
             throw error; // Lemparkan lagi error spesifik dari status 401
        }
        throw new Error('Gagal terhubung ke server.'); // Error umum
    }

  }, [authToken, logout, router]); // Tambahkan dependensi

  return fetchWithAuth; // Kembalikan fungsi fetch-nya
}
