'use client'; // <-- TAMBAHKAN BARIS INI

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'; // Tambahkan useEffect jika belum ada

interface AuthState {
  kaderId: number | null;
  authToken: string | null;
  namaKader: string | null;
  isLoggedIn: boolean;
  isLoadingAuth: boolean; // <-- Tambah state loading
  login: (kaderId: number, token: string, nama: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [kaderId, setKaderId] = useState<number | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [namaKader, setNamaKader] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); // State loading awal

  // Gunakan useEffect untuk membaca localStorage setelah komponen di-mount di client
  useEffect(() => {
    try {
        const storedKaderId = localStorage.getItem('kaderId');
        const storedAuthToken = localStorage.getItem('authToken');
        const storedNamaKader = localStorage.getItem('namaKader');

        if (storedAuthToken && storedKaderId) {
            setKaderId(parseInt(storedKaderId, 10));
            setAuthToken(storedAuthToken);
            setNamaKader(storedNamaKader);
        }
    } catch (error) {
        console.error("Gagal membaca auth state dari localStorage:", error);
        // Jika gagal baca, pastikan state kosong
        localStorage.removeItem('kaderId');
        localStorage.removeItem('authToken');
        localStorage.removeItem('namaKader');
    } finally {
        setIsLoadingAuth(false); // Selesai loading setelah membaca localStorage
    }
  }, []); // [] berarti hanya dijalankan sekali saat mount

  const login = (id: number, token: string, nama: string) => {
    setKaderId(id);
    setAuthToken(token);
    setNamaKader(nama);
    try {
        localStorage.setItem('kaderId', id.toString());
        localStorage.setItem('authToken', token);
        localStorage.setItem('namaKader', nama);
    } catch (error) {
        console.error("Gagal menyimpan auth state ke localStorage:", error);
    }
  };

  const logout = () => {
    setKaderId(null);
    setAuthToken(null);
    setNamaKader(null);
     try {
        localStorage.removeItem('kaderId');
        localStorage.removeItem('authToken');
        localStorage.removeItem('namaKader');
     } catch (error) {
         console.error("Gagal menghapus auth state dari localStorage:", error);
     }
  };

  // Tentukan isLoggedIn berdasarkan authToken (lebih reliable daripada kaderId saat loading)
  const isLoggedIn = !!authToken;

  return (
    <AuthContext.Provider value={{ kaderId, authToken, namaKader, isLoggedIn, isLoadingAuth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};