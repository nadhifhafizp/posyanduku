// src/app/page.tsx (Sudah Benar)
'use client'; 

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const router = useRouter();
  const { isLoggedIn, isLoadingAuth } = useAuth();

  useEffect(() => {
    if (!isLoadingAuth) {
      if (isLoggedIn) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [isLoadingAuth, isLoggedIn, router]);

  return (
    <div className="flex justify-center items-center min-h-screen">
      Memeriksa sesi...
    </div>
  );
}