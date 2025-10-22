// src/context/AuthContext.tsx (Konsep - Anda perlu membuatnya)
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthState {
  kaderId: number | null;
  authToken: string | null;
  // Tambahkan data user lain, misalnya:
  namaKader: string | null;
  isLoggedIn: boolean;
  login: (kaderId: number, token: string, nama: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Ambil dari LocalStorage saat pertama kali load
  const [kaderId, setKaderId] = useState<number | null>(() => {
    if (typeof window !== 'undefined') return parseInt(localStorage.getItem('kaderId') || '0');
    return null;
  });
  const [authToken, setAuthToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('authToken');
    return null;
  });
  const [namaKader, setNamaKader] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('namaKader');
    return null;
  });

  const login = (id: number, token: string, nama: string) => {
    setKaderId(id);
    setAuthToken(token);
    setNamaKader(nama);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kaderId', id.toString());
      localStorage.setItem('authToken', token);
      localStorage.setItem('namaKader', nama);
    }
  };

  const logout = () => {
    setKaderId(null);
    setAuthToken(null);
    setNamaKader(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('kaderId');
      localStorage.removeItem('authToken');
      localStorage.removeItem('namaKader');
    }
  };

  return (
    <AuthContext.Provider value={{ kaderId, authToken, namaKader, isLoggedIn: !!kaderId, login, logout }}>
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