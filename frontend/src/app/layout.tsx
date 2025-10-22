// src/app/layout.tsx
import type { Metadata } from "next";
// 1. Ganti font dari Geist/Inter ke Poppins
import { Poppins } from "next/font/google";
import "./globals.css";
// 2. Pastikan Providers (untuk Auth) di-import
import { Providers } from "./providers"; 

// 3. Konfigurasikan Poppins
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"], // 400=Regular, 500=Medium, 600=SemiBold, 700=Bold
});

// 4. Atur Metadata Anda
export const metadata: Metadata = {
  title: "Aplikasi Posyandu",
  description: "Sistem Informasi Posyandu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 5. Ganti bahasa ke "id"
    <html lang="id">
      {/* 6. Terapkan kelas Poppins dan antialiased ke <body> */}
      <body className={`${poppins.className} antialiased`}>
        {/* 7. Bungkus {children} dengan <Providers> agar auth berjalan */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}