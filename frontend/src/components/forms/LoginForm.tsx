'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation'; // 1. Import useRouter
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginForm() {
  const router = useRouter(); // 2. Inisialisasi router
  const [nik, setNik] = useState('');
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
        body: JSON.stringify({ nik, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Terjadi kesalahan');
      } else {
        // 3. Ganti alert dengan router.push untuk navigasi
        router.push('/dashboard'); 
      }
    } catch (err) {
      setError('Tidak dapat terhubung ke server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4">
        <div className="grid gap-2">
          {/* Label diubah agar lebih sesuai */}
          <Label htmlFor="nik">NIK Kader</Label>
          <Input
            id="nik"
            type="text"
            placeholder="Masukkan NIK Anda"
            value={nik}
            onChange={(e) => setNik(e.target.value)}
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