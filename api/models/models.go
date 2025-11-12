// models/models.go
package models

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// --- Structs untuk Kader ---
type Kader struct {
	ID          int        `json:"id"`
	NamaLengkap string     `json:"nama_lengkap"`
	NIK         *string    `json:"nik"`
	NoTelepon   *string    `json:"no_telepon"`
	Password    string     `json:"-"` // Jangan kirim password ke frontend
	Username    string     `json:"username"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   *time.Time `json:"updated_at"`
}
type LoginPayload struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}
type RegisterKaderPayload struct {
	NamaLengkap string `json:"nama_lengkap" binding:"required"`
	NIK         string `json:"nik"`
	NoTelepon   string `json:"no_telepon"`
	Username    string `json:"username" binding:"required"`
	Password    string `json:"password" binding:"required"`
}
type UpdateKaderPayload struct {
	NamaLengkap string `json:"nama_lengkap" binding:"required"`
	NIK         string `json:"nik"`
	NoTelepon   string `json:"no_telepon"`
	Username    string `json:"username" binding:"required"`
}
type ChangePasswordPayload struct {
	NewPassword string `json:"new_password" binding:"required"`
}

// --- Structs untuk Ibu ---
type TambahIbuPayload struct {
	NamaLengkap string `json:"nama_lengkap" binding:"required"`
	NIK         string `json:"nik" binding:"required"`
	NoTelepon   string `json:"no_telepon" binding:"required"`
	Alamat      string `json:"alamat" binding:"required"`
}
type UpdateIbuPayload struct {
	NamaLengkap string `json:"nama_lengkap" binding:"required"`
	NIK         string `json:"nik" binding:"required"`
	NoTelepon   string `json:"no_telepon" binding:"required"`
	Alamat      string `json:"alamat" binding:"required"`
}
type Ibu struct {
	ID               int        `json:"id"`
	NamaLengkap      *string    `json:"nama_lengkap"`
	NIK              *string    `json:"nik"`
	NoTelepon        *string    `json:"no_telepon"`
	Alamat           *string    `json:"alamat"`
	IdKaderPendaftar *int       `json:"id_kader_pendaftar,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        *time.Time `json:"updated_at"`
}
type IbuOption struct {
	ID          int     `json:"id"`
	NamaLengkap *string `json:"nama_lengkap"`
}

// --- Structs untuk Anak ---
type Anak struct {
	ID            int        `json:"id"`
	IdIbu         int        `json:"id_ibu"`
	NamaAnak      string     `json:"nama_anak"`
	NikAnak       *string    `json:"nik_anak"`
	TanggalLahir  time.Time  `json:"tanggal_lahir"`
	JenisKelamin  string     `json:"jenis_kelamin"`
	AnakKe        *int       `json:"anak_ke"`
	BeratLahirKg  *float64   `json:"berat_lahir_kg"`
	TinggiLahirCm *float64   `json:"tinggi_lahir_cm"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     *time.Time `json:"updated_at"`
	NamaIbu       *string    `json:"nama_ibu,omitempty"`
	NikIbu        *string    `json:"nik_ibu,omitempty"`
}
type TambahAnakPayload struct {
	IdIbu         int      `json:"id_ibu" binding:"required"`
	NamaAnak      string   `json:"nama_anak" binding:"required"`
	NikAnak       *string  `json:"nik_anak"`
	TanggalLahir  string   `json:"tanggal_lahir" binding:"required"` // Terima YYYY-MM-DD
	JenisKelamin  string   `json:"jenis_kelamin" binding:"required,oneof=L P"`
	AnakKe        *int     `json:"anak_ke"`
	BeratLahirKg  *float64 `json:"berat_lahir_kg"`
	TinggiLahirCm *float64 `json:"tinggi_lahir_cm"`
}
type UpdateAnakPayload struct {
	IdIbu         int      `json:"id_ibu" binding:"required"`
	NamaAnak      string   `json:"nama_anak" binding:"required"`
	NikAnak       *string  `json:"nik_anak"`
	TanggalLahir  string   `json:"tanggal_lahir" binding:"required"` // Terima YYYY-MM-DD
	JenisKelamin  string   `json:"jenis_kelamin" binding:"required,oneof=L P"`
	AnakKe        *int     `json:"anak_ke"`
	BeratLahirKg  *float64 `json:"berat_lahir_kg"`
	TinggiLahirCm *float64 `json:"tinggi_lahir_cm"`
}
type AnakSimple struct {
	ID       int     `json:"id"`
	NamaAnak string  `json:"nama_anak"`
	NikAnak  *string `json:"nik_anak"`
}

// --- Structs untuk Perkembangan ---
type Perkembangan struct {
	ID                 int        `json:"id"`
	IdAnak             int        `json:"id_anak"`
	TanggalPemeriksaan time.Time  `json:"tanggal_pemeriksaan"`
	BbKg               *float64   `json:"bb_kg"`
	TbCm               *float64   `json:"tb_cm"`
	LkCm               *float64   `json:"lk_cm"`
	LlCm               *float64   `json:"ll_cm"`
	StatusGizi         *string    `json:"status_gizi"`
	Saran              *string    `json:"saran"`
	IdKaderPencatat    int        `json:"id_kader_pencatat"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          *time.Time `json:"updated_at"`
	NamaAnak           string     `json:"nama_anak,omitempty"`
	NamaKader          *string    `json:"nama_kader,omitempty"`
	NikAnak            *string    `json:"nik_anak,omitempty"`
	NamaIbu            *string    `json:"nama_ibu,omitempty"`
}
type TambahPerkembanganPayload struct {
	IdAnak             int      `json:"id_anak" binding:"required"`
	TanggalPemeriksaan string   `json:"tanggal_pemeriksaan" binding:"required"` // Terima YYYY-MM-DD
	BbKg               *float64 `json:"bb_kg"`
	TbCm               *float64 `json:"tb_cm"`
	LkCm               *float64 `json:"lk_cm"`
	LlCm               *float64 `json:"ll_cm"`
	StatusGizi         *string  `json:"status_gizi"`
	Saran              *string  `json:"saran"`
}
type UpdatePerkembanganPayload struct {
	IdAnak             int      `json:"id_anak" binding:"required"`
	TanggalPemeriksaan string   `json:"tanggal_pemeriksaan" binding:"required"` // Terima YYYY-MM-DD
	BbKg               *float64 `json:"bb_kg"`
	TbCm               *float64 `json:"tb_cm"`
	LkCm               *float64 `json:"lk_cm"`
	LlCm               *float64 `json:"ll_cm"`
	StatusGizi         *string  `json:"status_gizi"`
	Saran              *string  `json:"saran"`
}

// --- Structs Master Imunisasi ---
type MasterImunisasi struct {
	ID             int        `json:"id"`
	NamaImunisasi  string     `json:"nama_imunisasi"`
	UsiaIdealBulan int        `json:"usia_ideal_bulan"`
	Deskripsi      *string    `json:"deskripsi"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      *time.Time `json:"updated_at"`
}
type TambahMasterImunisasiPayload struct {
	NamaImunisasi  string  `json:"nama_imunisasi" binding:"required"`
	UsiaIdealBulan int     `json:"usia_ideal_bulan"`
	Deskripsi      *string `json:"deskripsi"`
}
type UpdateMasterImunisasiPayload struct {
	NamaImunisasi  string  `json:"nama_imunisasi" binding:"required"`
	UsiaIdealBulan int     `json:"usia_ideal_bulan"`
	Deskripsi      *string `json:"deskripsi"`
}
type MasterImunisasiSimple struct {
	ID             int    `json:"id"`
	NamaImunisasi  string `json:"nama_imunisasi"`
	UsiaIdealBulan int    `json:"usia_ideal_bulan"`
}

// --- Structs Riwayat Imunisasi ---
type RiwayatImunisasi struct {
	ID                int        `json:"id"`
	IdAnak            int        `json:"id_anak"`
	IdMasterImunisasi int        `json:"id_master_imunisasi"`
	IdKaderPencatat   int        `json:"id_kader_pencatat"`
	IdKaderUpdater    *int       `json:"id_kader_updater"`
	TanggalDiberikan  time.Time  `json:"tanggal_imunisasi"`
	Catatan           *string    `json:"catatan"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         *time.Time `json:"updated_at"`

	NamaAnak         string  `json:"nama_anak,omitempty"`
	NikAnak          *string `json:"nik_anak,omitempty"`
	NamaImunisasi    string  `json:"nama_imunisasi,omitempty"`
	NamaKader        *string `json:"nama_kader,omitempty"`
	NamaKaderUpdater *string `json:"nama_kader_updater,omitempty"`
}
type TambahRiwayatPayload struct {
	IdAnak            int     `json:"id_anak" binding:"required"`
	IdMasterImunisasi int     `json:"id_master_imunisasi" binding:"required"`
	TanggalDiberikan  string  `json:"tanggal_imunisasi" binding:"required"` // Terima YYYY-MM-DD
	Catatan           *string `json:"catatan"`
}
type UpdateRiwayatPayload struct {
	IdAnak            int     `json:"id_anak" binding:"required"`
	IdMasterImunisasi int     `json:"id_master_imunisasi" binding:"required"`
	TanggalDiberikan  string  `json:"tanggal_imunisasi" binding:"required"` // Terima YYYY-MM-DD
	Catatan           *string `json:"catatan"`
}

// --- Structs untuk Laporan ---
type LaporanPerkembangan struct {
	Perkembangan         // Embed struct Perkembangan yang sudah ada
	NikIbu       *string `json:"nik_ibu,omitempty"` // Tambahkan NIK Ibu
}

type LaporanImunisasi struct {
	RiwayatImunisasi // Embed
}

// --- Struct untuk JWT Claims ---
type AuthClaims struct {
	KaderID int `json:"kader_id"`
	jwt.RegisteredClaims
}
