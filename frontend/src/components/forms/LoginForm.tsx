'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/context/AuthContext'; // <-- Import useAuth

export default function LoginForm() {
  const router = useRouter();
  const { login } = useAuth(); // <-- Dapatkan fungsi login dari context
  const [username, setUsername] = useState(''); // <-- Ganti nik jadi username agar sesuai API
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8080/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }), // Kirim username
      });
      const data = await response.json();
      if (!response.ok) {
         throw new Error(data.error || 'Login gagal'); // Lempar error jika tidak ok
      }

       // Proses login jika sukses
       if (data.token && data.user && data.user.id && data.user.nama_lengkap) {
          login(data.user.id, data.token, data.user.nama_lengkap); // Panggil fungsi login context
          router.push('/dashboard'); // Arahkan ke dashboard
       } else {
          throw new Error("Token atau data user tidak lengkap dari server.");
       }

    } catch (err) { // <-- Perbaiki catch
      let message = 'Tidak dapat terhubung ke server.';
      if (err instanceof Error) { // Type guard
        message = err.message;
      }
      setError(message); // Set state error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4">
        <div className="grid gap-2">
          {/* Label diubah jadi Username */}
          <Label htmlFor="username">Username Kader</Label>
          <Input
            id="username" // ID disesuaikan
            type="text"
            placeholder="Masukkan Username Anda"
            value={username} // State username
            onChange={(e) => setUsername(e.target.value)} // Set state username
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Masukkan Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Memproses...' : 'Masuk'}
        </Button>
      </div>
    </form>
  );
}