// src/app/admin/(dashboard)/page.tsx
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Baby, UserRoundPlus, PlusSquare, PackagePlus, Syringe } from 'lucide-react';

// Data untuk kartu menu
const mainMenuItems = [
    { title: "Registrasi Wali", description: "Daftarkan data ibu/wali baru.", href: "registrasi-wali", icon: UserPlus },
    { title: "Registrasi Kader", description: "Tambahkan kader Posyandu baru.", href: "registrasi-kader", icon: UserRoundPlus },
    { title: "Registrasi Anak", description: "Masukkan data anak balita.", href: "registrasi-anak", icon: Baby },
];

const quickActions = [
    { title: "Tambah Perkembangan Anak", description: "Catat berat, tinggi, dan lingkar kepala.", href: "perkembangan", icon: PlusSquare },
    { title: "Master Imunisasi", description: "Kelola daftar jenis imunisasi.", href: "master-imunisasi", icon: PackagePlus },
    { title: "Registrasi Imunisasi Anak", description: "Catat imunisasi yang telah diberikan.", href: "imunisasi-anak", icon: Syringe },
];


export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      {/* Bagian Menu Utama */}
      <section>
        <div className="grid gap-6 md:grid-cols-3">
          {mainMenuItems.map((item) => (
            <Link href={item.href} key={item.href}>
              <Card className="hover:bg-gray-50 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium">{item.title}</CardTitle>
                  <item.icon className="h-6 w-6 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Bagian Aksi Cepat */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Aksi Cepat</h2>
        <div className="space-y-4">
           {quickActions.map((item) => (
             <Link href={item.href} key={item.href}>
                <Card className="hover:bg-gray-50 transition-colors">
                    <CardContent className="flex items-center p-6">
                        <div className="p-3 bg-gray-100 rounded-full mr-4">
                            <item.icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-semibold">{item.title}</h3>
                            <p className="text-sm text-gray-500">{item.description}</p>
                        </div>
                    </CardContent>
                </Card>
             </Link>
           ))}
        </div>
      </section>
    </div>
  );
}