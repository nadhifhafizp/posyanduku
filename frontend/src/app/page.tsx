// src/app/page.tsx
'use client'; // Jadikan client component

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext'; // Import useAuth

export default function HomePage() {
  const router = useRouter();
  const { isLoggedIn, isLoadingAuth } = useAuth(); // Dapatkan status login dan loading

  useEffect(() => {
    // Tunggu sampai status auth selesai dimuat
    if (!isLoadingAuth) {
      if (isLoggedIn) {
        // Jika sudah login, arahkan ke dashboard
        router.replace('/dashboard');
      } else {
        // Jika belum login, arahkan ke halaman login
        router.replace('/login');
      }
    }
  }, [isLoadingAuth, isLoggedIn, router]); // Tambahkan dependensi

  // Tampilkan pesan loading sementara redirect diproses
  return (
    <div className="flex justify-center items-center min-h-screen">
      Memeriksa sesi...
    </div>
  );
}