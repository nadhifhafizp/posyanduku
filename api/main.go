// main.go

package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

// --- Structs untuk Kader ---
type Kader struct {
	ID          int        `json:"id"`
	NamaLengkap string     `json:"nama_lengkap"`
	NIK         *string    `json:"nik"`
	NoTelepon   *string    `json:"no_telepon"`
	Password    string     `json:"-"`
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
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required"`
}

// --- Structs untuk Ibu ---
type TambahIbuPayload struct {
	NamaLengkap      string `json:"nama_lengkap" binding:"required"`
	NIK              string `json:"nik" binding:"required"`
	NoTelepon        string `json:"no_telepon" binding:"required"`
	Alamat           string `json:"alamat" binding:"required"`
	IdKaderPendaftar int    `json:"id_kader_pendaftar" binding:"required"`
}
type UpdateIbuPayload struct {
	NamaLengkap string `json:"nama_lengkap" binding:"required"`
	NIK         string `json:"nik" binding:"required"`
	NoTelepon   string `json:"no_telepon" binding:"required"`
	Alamat      string `json:"alamat" binding:"required"`
}

// *** PERBAIKAN: Tambahkan IdKaderPendaftar ***
type Ibu struct {
	ID               int        `json:"id"`
	NamaLengkap      *string    `json:"nama_lengkap"`
	NIK              *string    `json:"nik"`
	NoTelepon        *string    `json:"no_telepon"`
	Alamat           *string    `json:"alamat"`
	IdKaderPendaftar *int       `json:"id_kader_pendaftar,omitempty"` // <-- TAMBAHAN
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        *time.Time `json:"updated_at"`
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
}
type TambahAnakPayload struct {
	IdIbu         int      `json:"id_ibu" binding:"required"`
	NamaAnak      string   `json:"nama_anak" binding:"required"`
	NikAnak       *string  `json:"nik_anak"`
	TanggalLahir  string   `json:"tanggal_lahir" binding:"required"`
	JenisKelamin  string   `json:"jenis_kelamin" binding:"required,oneof=L P"`
	AnakKe        *int     `json:"anak_ke"`
	BeratLahirKg  *float64 `json:"berat_lahir_kg"`
	TinggiLahirCm *float64 `json:"tinggi_lahir_cm"`
}
type UpdateAnakPayload struct {
	IdIbu         int      `json:"id_ibu" binding:"required"`
	NamaAnak      string   `json:"nama_anak" binding:"required"`
	NikAnak       *string  `json:"nik_anak"`
	TanggalLahir  string   `json:"tanggal_lahir" binding:"required"`
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
	TanggalPemeriksaan string   `json:"tanggal_pemeriksaan" binding:"required"`
	BbKg               *float64 `json:"bb_kg"`
	TbCm               *float64 `json:"tb_cm"`
	LkCm               *float64 `json:"lk_cm"`
	LlCm               *float64 `json:"ll_cm"`
	StatusGizi         *string  `json:"status_gizi"`
	Saran              *string  `json:"saran"`
	IdKaderPencatat    int      `json:"id_kader_pencatat" binding:"required"`
}
type UpdatePerkembanganPayload struct {
	IdAnak             int      `json:"id_anak" binding:"required"`
	TanggalPemeriksaan string   `json:"tanggal_pemeriksaan" binding:"required"`
	BbKg               *float64 `json:"bb_kg"`
	TbCm               *float64 `json:"tb_cm"`
	LkCm               *float64 `json:"lk_cm"`
	LlCm               *float64 `json:"ll_cm"`
	StatusGizi         *string  `json:"status_gizi"`
	Saran              *string  `json:"saran"`
	IdKaderPencatat    int      `json:"id_kader_pencatat" binding:"required"`
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

// --- Struct untuk JWT Claims ---
type AuthClaims struct {
	KaderID int `json:"kader_id"`
	jwt.RegisteredClaims
}

// --- Structs Riwayat Imunisasi ---
// *** Nama field TanggalDiberikan tidak apa-apa, karena JSON tag sudah benar ***
type RiwayatImunisasi struct {
	ID                int        `json:"id"`
	IdAnak            int        `json:"id_anak"`
	IdMasterImunisasi int        `json:"id_master_imunisasi"`
	IdKaderPencatat   int        `json:"id_kader_pencatat"`
	IdKaderUpdater    *int       `json:"-"`
	TanggalDiberikan  time.Time  `json:"tanggal_imunisasi"` // JSON tag sesuai frontend
	Catatan           *string    `json:"catatan"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         *time.Time `json:"updated_at"`

	// Join fields
	NamaAnak         string  `json:"nama_anak,omitempty"`
	NikAnak          *string `json:"nik_anak,omitempty"`
	NamaImunisasi    string  `json:"nama_imunisasi,omitempty"`
	NamaKader        *string `json:"nama_kader,omitempty"`
	NamaKaderUpdater *string `json:"nama_kader_updater,omitempty"`
}

// Payload Tambah (JSON tag harus sesuai frontend)
type TambahRiwayatPayload struct {
	IdAnak            int     `json:"id_anak" binding:"required"`
	IdMasterImunisasi int     `json:"id_master_imunisasi" binding:"required"`
	TanggalDiberikan  string  `json:"tanggal_imunisasi" binding:"required"` // JSON tag
	Catatan           *string `json:"catatan"`
}

// Payload Update (JSON tag harus sesuai frontend)
type UpdateRiwayatPayload struct {
	IdAnak            int     `json:"id_anak" binding:"required"`
	IdMasterImunisasi int     `json:"id_master_imunisasi" binding:"required"`
	TanggalDiberikan  string  `json:"tanggal_imunisasi" binding:"required"` // JSON tag
	Catatan           *string `json:"catatan"`
}

func generateJWT(kaderID int) (string, error) {
	secretKey := os.Getenv("JWT_SECRET_KEY")

	claims := AuthClaims{
		KaderID: kaderID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour * 24)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secretKey))
}

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Akses Ditolak. Token tidak disediakan."})
			c.Abort()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		secretKey := os.Getenv("JWT_SECRET_KEY")

		token, err := jwt.ParseWithClaims(tokenString, &AuthClaims{}, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(secretKey), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token tidak valid atau kadaluarsa."})
			c.Abort()
			return
		}

		if claims, ok := token.Claims.(*AuthClaims); ok && token.Valid {
			c.Set("kaderId", claims.KaderID)
		} else {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token tidak dapat diproses."})
			c.Abort()
			return
		}

		c.Next()
	}
}

func main() {
	// --- Setup ---
	if err := godotenv.Load(); err != nil {
		log.Fatal("Error loading .env file")
	}
	dbpool, err := pgxpool.New(context.Background(), os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer dbpool.Close()
	log.Println("Successfully connected to Supabase!")

	router := gin.Default()

	// *** PERBAIKAN: Tambahkan "Authorization" ke AllowHeaders ***
	router.Use(cors.New(cors.Config{
		AllowOrigins: []string{"http://localhost:3000"},
		AllowMethods: []string{"GET", "POST", "PUT", "DELETE"},
		AllowHeaders: []string{"Origin", "Content-Type", "Authorization"},
	}))

	// ===================================
	// === ENDPOINTS KADER (/api/login) ===
	// ===================================

	// *** PERBAIKAN: Login handler sekarang mengembalikan JWT Token ***
	router.POST("/api/login", func(c *gin.Context) {
		var payload LoginPayload
		var kader Kader
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Username dan Password wajib diisi"})
			return
		}
		err := dbpool.QueryRow(context.Background(),
			"SELECT id, nama_lengkap, nik, no_telepon, password, username, created_at, updated_at FROM kader WHERE username = $1", payload.Username).Scan(
			&kader.ID, &kader.NamaLengkap, &kader.NIK, &kader.NoTelepon, &kader.Password, &kader.Username, &kader.CreatedAt, &kader.UpdatedAt)

		if err != nil {
			log.Printf("INFO: Login attempt failed for username %s: %v", payload.Username, err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Username atau Password salah"})
			return
		}

		err = bcrypt.CompareHashAndPassword([]byte(kader.Password), []byte(payload.Password))
		if err != nil {
			log.Printf("INFO: Invalid password for username %s", payload.Username)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Username atau Password salah"})
			return
		}

		// Hasilkan token
		token, err := generateJWT(kader.ID)
		if err != nil {
			log.Printf("ERROR generating JWT for user %s: %v", payload.Username, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses login."})
			return
		}

		// Login berhasil
		log.Printf("INFO: User %s logged in successfully", payload.Username)
		c.JSON(http.StatusOK, gin.H{
			"message": "Login berhasil!",
			"user":    gin.H{"id": kader.ID, "nama_lengkap": kader.NamaLengkap, "username": kader.Username},
			"token":   token, // Kirim token ke frontend
		})
	})

	router.POST("/api/kader", func(c *gin.Context) {
		var payload RegisterKaderPayload
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Semua field wajib diisi."})
			return
		}
		if payload.NIK != "" && len(payload.NIK) > 16 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "NIK tidak boleh lebih dari 16 karakter."})
			return
		}
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(payload.Password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses pendaftaran."})
			return
		}
		_, err = dbpool.Exec(context.Background(),
			`INSERT INTO kader (nama_lengkap, nik, no_telepon, username, password) VALUES ($1, $2, $3, $4, $5)`,
			payload.NamaLengkap, payload.NIK, payload.NoTelepon, payload.Username, string(hashedPassword))
		if err != nil {
			log.Printf("ERROR inserting kader: %v", err)
			if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23505" {
				switch pgErr.ConstraintName {
				case "kader_username_key":
					c.JSON(http.StatusConflict, gin.H{"error": "Username ini sudah digunakan."})
				case "kader_nik_key":
					c.JSON(http.StatusConflict, gin.H{"error": "NIK ini sudah terdaftar."})
				default:
					c.JSON(http.StatusConflict, gin.H{"error": "Data unik sudah ada."})
				}
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan data kader."})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"message": "Kader baru berhasil didaftarkan!"})
	})

	router.GET("/api/kader", func(c *gin.Context) {
		var daftarKader []Kader
		searchQuery := c.Query("search")
		baseQuery := "SELECT id, nama_lengkap, nik, no_telepon, username, created_at, updated_at FROM kader"
		var args []interface{}
		query := baseQuery
		if searchQuery != "" {
			query += " WHERE nama_lengkap ILIKE $1 OR nik ILIKE $1 OR username ILIKE $1"
			args = append(args, fmt.Sprintf("%%%s%%", searchQuery))
		}
		query += " ORDER BY created_at DESC"
		rows, err := dbpool.Query(context.Background(), query, args...)
		if err != nil {
			log.Printf("ERROR querying kader: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data kader."})
			return
		}
		defer rows.Close()
		for rows.Next() {
			var k Kader
			if err := rows.Scan(&k.ID, &k.NamaLengkap, &k.NIK, &k.NoTelepon, &k.Username, &k.CreatedAt, &k.UpdatedAt); err != nil {
				log.Printf("ERROR scanning kader row: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memindai data kader."})
				return
			}
			daftarKader = append(daftarKader, k)
		}
		c.JSON(http.StatusOK, daftarKader)
	})

	router.PUT("/api/kader/:id", func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ID kader tidak valid"})
			return
		}
		var payload UpdateKaderPayload
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Semua field wajib diisi."})
			return
		}
		if payload.NIK != "" && len(payload.NIK) > 16 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "NIK tidak boleh lebih dari 16 karakter."})
			return
		}
		_, err = dbpool.Exec(context.Background(),
			`UPDATE kader SET nama_lengkap = $1, nik = $2, no_telepon = $3, username = $4, updated_at = NOW()
			  WHERE id = $5`,
			payload.NamaLengkap, payload.NIK, payload.NoTelepon, payload.Username, id)
		if err != nil {
			log.Printf("ERROR updating kader: %v", err)
			if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23505" {
				switch pgErr.ConstraintName {
				case "kader_username_key":
					c.JSON(http.StatusConflict, gin.H{"error": "Username ini sudah digunakan kader lain."})
				case "kader_nik_key":
					c.JSON(http.StatusConflict, gin.H{"error": "NIK ini sudah digunakan kader lain."})
				default:
					c.JSON(http.StatusConflict, gin.H{"error": "Data unik sudah ada."})
				}
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui data kader."})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Data kader berhasil diperbarui!"})
	})

	router.PUT("/api/kader/:id/password", func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ID kader tidak valid"})
			return
		}
		var payload ChangePasswordPayload
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Password lama dan baru wajib diisi."})
			return
		}
		var currentPasswordHash string
		err = dbpool.QueryRow(context.Background(), "SELECT password FROM kader WHERE id = $1", id).Scan(&currentPasswordHash)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Kader tidak ditemukan."})
			return
		}
		err = bcrypt.CompareHashAndPassword([]byte(currentPasswordHash), []byte(payload.CurrentPassword))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Password saat ini salah."})
			return
		}
		newHashedPassword, err := bcrypt.GenerateFromPassword([]byte(payload.NewPassword), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses password baru."})
			return
		}
		_, err = dbpool.Exec(context.Background(),
			"UPDATE kader SET password = $1, updated_at = NOW() WHERE id = $2",
			string(newHashedPassword), id)
		if err != nil {
			log.Printf("ERROR updating password for kader %d: %v", id, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui password."})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Password berhasil diperbarui!"})
	})

	router.DELETE("/api/kader/:id", func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ID kader tidak valid"})
			return
		}
		_, err = dbpool.Exec(context.Background(), "DELETE FROM kader WHERE id = $1", id)
		if err != nil {
			log.Printf("ERROR deleting kader: %v", err)
			if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23503" {
				c.JSON(http.StatusConflict, gin.H{"error": "Kader tidak bisa dihapus karena masih terhubung dengan data lain."})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus data kader."})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Data kader berhasil dihapus!"})
	})

	// =================================
	// === ENDPOINTS UNTUK /api/ibu ===
	// =================================
	router.POST("/api/ibu", func(c *gin.Context) {
		var payload TambahIbuPayload
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Semua field wajib diisi."})
			return
		}

		if len(payload.NIK) > 16 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "NIK tidak boleh lebih dari 16 karakter."})
			return
		}
		_, err := dbpool.Exec(context.Background(),
			`INSERT INTO ibu (nama_lengkap, nik, no_telepon, alamat, id_kader_pendaftar) VALUES ($1, $2, $3, $4, $5)`,
			payload.NamaLengkap, payload.NIK, payload.NoTelepon, payload.Alamat, payload.IdKaderPendaftar)
		if err != nil {
			log.Printf("ERROR inserting ibu: %v", err)

			if pgErr, ok := err.(*pgconn.PgError); ok {
				switch pgErr.Code {
				case "23505":
					switch pgErr.ConstraintName {
					case "ibu_nik_key":
						log.Printf("ERROR: NIK sudah terdaftar: %s", payload.NIK)
						c.JSON(http.StatusConflict, gin.H{"error": "NIK ini sudah terdaftar."})
					default:
						c.JSON(http.StatusConflict, gin.H{"error": "Data unik sudah ada (kemungkinan NIK)."})
					}
					return
				case "23503":
					if pgErr.ConstraintName == "ibu_id_kader_pendaftar_fkey" {
						c.JSON(http.StatusBadRequest, gin.H{"error": "ID Kader pendaftar tidak valid atau tidak ditemukan."})
						return
					}
					c.JSON(http.StatusBadRequest, gin.H{"error": "Data referensi tidak ditemukan."})
					return
				}
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan data."})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"message": "Data ibu berhasil didaftarkan!"})
	})

	// *** PERBAIKAN: GET /api/ibu sekarang ambil id_kader_pendaftar ***
	router.GET("/api/ibu", func(c *gin.Context) {
		var daftarIbu []Ibu
		searchQuery := c.Query("search")
		// Query diperbarui
		baseQuery := "SELECT id, nama_lengkap, nik, no_telepon, alamat, id_kader_pendaftar, created_at, updated_at FROM ibu"
		var args []interface{}
		query := baseQuery
		if searchQuery != "" {
			query += " WHERE nama_lengkap ILIKE $1 OR nik ILIKE $1 OR no_telepon ILIKE $1 OR alamat ILIKE $1"
			args = append(args, fmt.Sprintf("%%%s%%", searchQuery))
		}
		query += " ORDER BY created_at DESC"
		rows, err := dbpool.Query(context.Background(), query, args...)
		if err != nil {
			log.Printf("ERROR querying ibu: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data ibu."})
			return
		}
		defer rows.Close()
		for rows.Next() {
			var i Ibu
			// Scan diperbarui
			if err := rows.Scan(&i.ID, &i.NamaLengkap, &i.NIK, &i.NoTelepon, &i.Alamat, &i.IdKaderPendaftar, &i.CreatedAt, &i.UpdatedAt); err != nil {
				log.Printf("ERROR scanning ibu row: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memindai data ibu."})
				return
			}
			daftarIbu = append(daftarIbu, i)
		}
		c.JSON(http.StatusOK, daftarIbu)
	})

	// *** PERBAIKAN: GET /api/ibu/:id sekarang ambil id_kader_pendaftar ***
	router.GET("/api/ibu/:id", func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ID ibu tidak valid"})
			return
		}
		var ibu Ibu
		// Query dan Scan diperbarui
		err = dbpool.QueryRow(context.Background(),
			"SELECT id, nama_lengkap, nik, no_telepon, alamat, id_kader_pendaftar, created_at, updated_at FROM ibu WHERE id = $1", id).
			Scan(&ibu.ID, &ibu.NamaLengkap, &ibu.NIK, &ibu.NoTelepon, &ibu.Alamat, &ibu.IdKaderPendaftar, &ibu.CreatedAt, &ibu.UpdatedAt)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Ibu tidak ditemukan."})
			return
		}
		c.JSON(http.StatusOK, ibu)
	})

	router.PUT("/api/ibu/:id", func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ID ibu tidak valid"})
			return
		}
		var payload UpdateIbuPayload
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Semua field wajib diisi."})
			return
		}
		if len(payload.NIK) > 16 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "NIK tidak boleh lebih dari 16 karakter."})
			return
		}
		_, err = dbpool.Exec(context.Background(),
			`UPDATE ibu SET nama_lengkap = $1, nik = $2, no_telepon = $3, alamat = $4, updated_at = NOW() WHERE id = $5`,
			payload.NamaLengkap, payload.NIK, payload.NoTelepon, payload.Alamat, id)
		if err != nil {
			log.Printf("ERROR updating ibu: %v", err)
			if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23505" {
				c.JSON(http.StatusConflict, gin.H{"error": "NIK ini sudah terdaftar pada ibu lain."})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui data ibu."})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Data ibu berhasil diperbarui!"})
	})

	router.DELETE("/api/ibu/:id", func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ID ibu tidak valid"})
			return
		}
		_, err = dbpool.Exec(context.Background(), "DELETE FROM ibu WHERE id = $1", id)
		if err != nil {
			log.Printf("ERROR deleting ibu: %v", err)
			if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23503" {
				c.JSON(http.StatusConflict, gin.H{"error": "Ibu tidak bisa dihapus karena masih terhubung dengan data anak."})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus data ibu."})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Data ibu berhasil dihapus!"})
	})

	// ===================================
	// === ENDPOINTS UNTUK /api/anak ===
	// ===================================

	router.POST("/api/anak", func(c *gin.Context) {
		var payload TambahAnakPayload
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Semua field wajib diisi."})
			return
		}

		tglLahir, err := time.Parse("2006-01-02", payload.TanggalLahir)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Format Tanggal Lahir tidak valid. Gunakan format YYYY-MM-DD."})
			return
		}

		_, err = dbpool.Exec(context.Background(),
			`INSERT INTO anak (id_ibu, nama_anak, nik_anak, tanggal_lahir, jenis_kelamin, anak_ke, berat_lahir_kg, tinggi_lahir_cm)
			  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			payload.IdIbu, payload.NamaAnak, payload.NikAnak, tglLahir, payload.JenisKelamin, payload.AnakKe, payload.BeratLahirKg, payload.TinggiLahirCm)

		if err != nil {
			log.Printf("ERROR inserting anak: %v", err)
			if pgErr, ok := err.(*pgconn.PgError); ok {
				if pgErr.Code == "23503" {
					c.JSON(http.StatusNotFound, gin.H{"error": "ID Ibu tidak ditemukan."})
					return
				} else if pgErr.Code == "23505" {
					c.JSON(http.StatusConflict, gin.H{"error": "Data anak dengan NIK tersebut sudah ada."})
					return
				}
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan data anak."})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"message": "Data anak berhasil didaftarkan!"})
	})

	router.GET("/api/anak", func(c *gin.Context) {
		var daftarAnak []Anak
		searchQuery := c.Query("search")
		baseQuery := `
			SELECT
				a.id, a.id_ibu, a.nama_anak, a.nik_anak, a.tanggal_lahir, a.jenis_kelamin, 
				a.anak_ke, a.berat_lahir_kg, a.tinggi_lahir_cm, a.created_at, a.updated_at, 
				i.nama_lengkap AS nama_ibu
			FROM
				anak a
			LEFT JOIN
				ibu i ON a.id_ibu = i.id
		`
		var args []interface{}
		query := baseQuery
		if searchQuery != "" {
			query += " WHERE a.nama_anak ILIKE $1 OR a.nik_anak ILIKE $1 OR i.nama_lengkap ILIKE $1"
			args = append(args, fmt.Sprintf("%%%s%%", searchQuery))
		}
		query += " ORDER BY a.nama_anak ASC"

		rows, err := dbpool.Query(context.Background(), query, args...)
		if err != nil {
			log.Printf("ERROR querying anak (all): %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data anak."})
			return
		}
		defer rows.Close()

		for rows.Next() {
			var a Anak
			if err := rows.Scan(
				&a.ID, &a.IdIbu, &a.NamaAnak, &a.NikAnak, &a.TanggalLahir, &a.JenisKelamin,
				&a.AnakKe, &a.BeratLahirKg, &a.TinggiLahirCm, &a.CreatedAt, &a.UpdatedAt, &a.NamaIbu,
			); err != nil {
				log.Printf("ERROR scanning anak row (all): %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memindai data anak."})
				return
			}
			daftarAnak = append(daftarAnak, a)
		}

		if err := rows.Err(); err != nil {
			log.Printf("ERROR after iterating anak (all) rows: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses daftar anak."})
			return
		}

		c.JSON(http.StatusOK, daftarAnak)
	})

	router.GET("/api/anak/simple", func(c *gin.Context) {
		var daftarAnak []AnakSimple
		query := `
			SELECT 
				id, nama_anak, nik_anak 
			FROM 
				anak 
			ORDER BY 
				nama_anak ASC
		`

		rows, err := dbpool.Query(context.Background(), query)
		if err != nil {
			log.Printf("ERROR querying anak (simple): %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil daftar anak."})
			return
		}
		defer rows.Close()

		for rows.Next() {
			var a AnakSimple
			if err := rows.Scan(&a.ID, &a.NamaAnak, &a.NikAnak); err != nil {
				log.Printf("ERROR scanning anak (simple) row: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memindai data anak."})
				return
			}
			daftarAnak = append(daftarAnak, a)
		}

		if err := rows.Err(); err != nil {
			log.Printf("ERROR after iterating anak (simple) rows: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses daftar anak."})
			return
		}

		c.JSON(http.StatusOK, daftarAnak)
	})

	router.GET("/api/anak/:id", func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ID anak tidak valid"})
			return
		}

		var anak Anak
		query := `
			SELECT
				a.id, a.id_ibu, a.nama_anak, a.nik_anak, a.tanggal_lahir, a.jenis_kelamin, a.anak_ke, a.berat_lahir_kg, a.tinggi_lahir_cm, a.created_at, a.updated_at, i.nama_lengkap AS nama_ibu
			FROM
				anak a
			LEFT JOIN
				ibu i ON a.id_ibu = i.id
			WHERE
				a.id = $1
		`
		err = dbpool.QueryRow(context.Background(), query, id).
			Scan(&anak.ID, &anak.IdIbu, &anak.NamaAnak, &anak.NikAnak, &anak.TanggalLahir, &anak.JenisKelamin, &anak.AnakKe, &anak.BeratLahirKg, &anak.TinggiLahirCm, &anak.CreatedAt, &anak.UpdatedAt, &anak.NamaIbu)

		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Data anak tidak ditemukan."})
			return
		}

		c.JSON(http.StatusOK, anak)
	})

	router.PUT("/api/anak/:id", func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ID anak tidak valid"})
			return
		}

		var payload UpdateAnakPayload
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Semua field wajib diisi."})
			return
		}

		tglLahir, err := time.Parse("2006-01-02", payload.TanggalLahir)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Format Tanggal Lahir tidak valid. Gunakan format YYYY-MM-DD."})
			return
		}

		_, err = dbpool.Exec(context.Background(),
			`UPDATE anak SET id_ibu = $1, nama_anak = $2, nik_anak = $3, tanggal_lahir = $4, jenis_kelamin = $5,
			  anak_ke = $6, berat_lahir_kg = $7, tinggi_lahir_cm = $8, updated_at = NOW()
			  WHERE id = $9`,
			payload.IdIbu, payload.NamaAnak, payload.NikAnak, tglLahir, payload.JenisKelamin,
			payload.AnakKe, payload.BeratLahirKg, payload.TinggiLahirCm, id)

		if err != nil {
			log.Printf("ERROR updating anak: %v", err)
			if pgErr, ok := err.(*pgconn.PgError); ok {
				if pgErr.Code == "23503" {
					c.JSON(http.StatusNotFound, gin.H{"error": "ID Ibu tidak ditemukan."})
					return
				} else if pgErr.Code == "23505" {
					c.JSON(http.StatusConflict, gin.H{"error": "Data anak dengan NIK tersebut sudah ada."})
					return
				}
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui data anak."})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Data anak berhasil diperbarui!"})
	})

	router.DELETE("/api/anak/:id", func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ID anak tidak valid"})
			return
		}

		_, err = dbpool.Exec(context.Background(), "DELETE FROM anak WHERE id = $1", id)
		if err != nil {
			log.Printf("ERROR deleting anak: %v", err)
			if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23503" {
				c.JSON(http.StatusConflict, gin.H{"error": "Data anak tidak bisa dihapus karena masih terhubung dengan data perkembangan."})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus data anak."})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Data anak berhasil dihapus!"})
	})

	// ==========================================
	// === ENDPOINTS UNTUK /api/perkembangan ===
	// ==========================================

	router.POST("/api/perkembangan", func(c *gin.Context) {
		var payload TambahPerkembanganPayload
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Semua field wajib diisi."})
			return
		}

		tglPemeriksaan, err := time.Parse("2006-01-02", payload.TanggalPemeriksaan)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Format Tanggal Pemeriksaan tidak valid. Gunakan format YYYY-MM-DD."})
			return
		}

		_, err = dbpool.Exec(context.Background(),
			`INSERT INTO perkembangan (id_anak, tanggal_pemeriksaan, bb_kg, tb_cm, lk_cm, ll_cm, status_gizi, saran, id_kader_pencatat)
			  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
			payload.IdAnak, tglPemeriksaan, payload.BbKg, payload.TbCm, payload.LkCm, payload.LlCm, payload.StatusGizi, payload.Saran, payload.IdKaderPencatat)

		if err != nil {
			log.Printf("ERROR inserting perkembangan: %v", err)
			if pgErr, ok := err.(*pgconn.PgError); ok {
				if pgErr.Code == "23503" {
					c.JSON(http.StatusNotFound, gin.H{"error": "ID Anak atau ID Kader tidak ditemukan."})
					return
				}
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan data perkembangan."})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"message": "Data perkembangan berhasil dicatat!"})
	})

	router.GET("/api/perkembangan", func(c *gin.Context) {
		var daftarPerkembangan []Perkembangan
		searchQuery := c.Query("search")
		baseQuery := `
			SELECT
				p.id, p.id_anak, p.tanggal_pemeriksaan, p.bb_kg, p.tb_cm, p.lk_cm, p.ll_cm, p.status_gizi, p.saran, p.id_kader_pencatat,
				p.created_at, p.updated_at, a.nama_anak, k.nama_lengkap AS nama_kader, a.nik_anak, i.nama_lengkap AS nama_ibu
			FROM
				perkembangan p
			JOIN
				anak a ON p.id_anak = a.id
			JOIN
				ibu i ON a.id_ibu = i.id
			LEFT JOIN
				kader k ON p.id_kader_pencatat = k.id
		`
		var args []interface{}
		query := baseQuery
		if searchQuery != "" {
			query += " WHERE a.nama_anak ILIKE $1 OR k.nama_lengkap ILIKE $1 OR a.nik_anak ILIKE $1 OR i.nama_lengkap ILIKE $1"
			args = append(args, fmt.Sprintf("%%%s%%", searchQuery))
		}
		query += " ORDER BY p.tanggal_pemeriksaan DESC"

		rows, err := dbpool.Query(context.Background(), query, args...)
		if err != nil {
			log.Printf("ERROR querying perkembangan: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data perkembangan."})
			return
		}
		defer rows.Close()

		for rows.Next() {
			var p Perkembangan
			if err := rows.Scan(
				&p.ID, &p.IdAnak, &p.TanggalPemeriksaan, &p.BbKg, &p.TbCm, &p.LkCm, &p.LlCm, &p.StatusGizi, &p.Saran, &p.IdKaderPencatat,
				&p.CreatedAt, &p.UpdatedAt, &p.NamaAnak, &p.NamaKader, &p.NikAnak, &p.NamaIbu,
			); err != nil {
				log.Printf("ERROR scanning perkembangan row: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memindai data perkembangan."})
				return
			}
			daftarPerkembangan = append(daftarPerkembangan, p)
		}
		c.JSON(http.StatusOK, daftarPerkembangan)
	})

	router.GET("/api/perkembangan/:id", func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ID perkembangan tidak valid"})
			return
		}

		var perkembangan Perkembangan
		query := `
			SELECT
				p.id, p.id_anak, p.tanggal_pemeriksaan, p.bb_kg, p.tb_cm, p.lk_cm, p.ll_cm, p.status_gizi, p.saran, p.id_kader_pencatat,
				p.created_at, p.updated_at, a.nama_anak, k.nama_lengkap AS nama_kader, a.nik_anak, i.nama_lengkap AS nama_ibu
			FROM
				perkembangan p
			JOIN
				anak a ON p.id_anak = a.id
			JOIN
				ibu i ON a.id_ibu = i.id
			LEFT JOIN
				kader k ON p.id_kader_pencatat = k.id
			WHERE
				p.id = $1
		`
		err = dbpool.QueryRow(context.Background(), query, id).
			Scan(&perkembangan.ID, &perkembangan.IdAnak, &perkembangan.TanggalPemeriksaan, &perkembangan.BbKg, &perkembangan.TbCm, &perkembangan.LkCm, &perkembangan.LlCm, &perkembangan.StatusGizi, &perkembangan.Saran, &perkembangan.IdKaderPencatat, &perkembangan.CreatedAt, &perkembangan.UpdatedAt, &perkembangan.NamaAnak, &perkembangan.NamaKader, &perkembangan.NikAnak, &perkembangan.NamaIbu)

		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Data perkembangan tidak ditemukan."})
			return
		}

		c.JSON(http.StatusOK, perkembangan)
	})

	router.PUT("/api/perkembangan/:id", func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ID perkembangan tidak valid"})
			return
		}

		var payload UpdatePerkembanganPayload
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Semua field wajib diisi."})
			return
		}

		tglPemeriksaan, err := time.Parse("2006-01-02", payload.TanggalPemeriksaan)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Format Tanggal Pemeriksaan tidak valid. Gunakan format YYYY-MM-DD."})
			return
		}

		_, err = dbpool.Exec(context.Background(),
			`UPDATE perkembangan SET id_anak = $1, tanggal_pemeriksaan = $2, bb_kg = $3, tb_cm = $4, lk_cm = $5, ll_cm = $6,
			  status_gizi = $7, saran = $8, id_kader_pencatat = $9, updated_at = NOW()
			  WHERE id = $10`,
			payload.IdAnak, tglPemeriksaan, payload.BbKg, payload.TbCm, payload.LkCm, payload.LlCm,
			payload.StatusGizi, payload.Saran, payload.IdKaderPencatat, id)

		if err != nil {
			log.Printf("ERROR updating perkembangan: %v", err)
			if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23503" {
				c.JSON(http.StatusNotFound, gin.H{"error": "ID Anak atau ID Kader tidak ditemukan."})
				return
			}
			if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23505" {
				log.Printf("WARN: Unique constraint violation on update perkembangan: %s", pgErr.ConstraintName)
				c.JSON(http.StatusConflict, gin.H{"error": "Data unik sudah ada."})
				return
			}

			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui data perkembangan."})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Data perkembangan berhasil diperbarui!"})
	})

	router.DELETE("/api/perkembangan/:id", func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ID perkembangan tidak valid"})
			return
		}

		_, err = dbpool.Exec(context.Background(), "DELETE FROM perkembangan WHERE id = $1", id)
		if err != nil {
			log.Printf("ERROR deleting perkembangan: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus data perkembangan."})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Data perkembangan berhasil dihapus!"})
	})

	// ===============================================
	// === ENDPOINTS /api/master-imunisasi ===
	// ===============================================

	router.POST("/api/master-imunisasi", func(c *gin.Context) {
		var payload TambahMasterImunisasiPayload
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Field Nama Imunisasi dan Usia Ideal wajib diisi."})
			return
		}

		_, err := dbpool.Exec(context.Background(),
			`INSERT INTO master_imunisasi (nama_imunisasi, usia_ideal_bulan, deskripsi) 
			  VALUES ($1, $2, $3)`,
			payload.NamaImunisasi, payload.UsiaIdealBulan, payload.Deskripsi)

		if err != nil {
			log.Printf("ERROR inserting master_imunisasi: %v", err)
			if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23505" {
				c.JSON(http.StatusConflict, gin.H{"error": "Nama imunisasi ini sudah ada."})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan data master imunisasi."})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"message": "Master imunisasi berhasil ditambahkan!"})
	})

	router.GET("/api/master-imunisasi", func(c *gin.Context) {
		daftarImunisasi := make([]MasterImunisasi, 0)
		searchQuery := c.Query("search")

		baseQuery := "SELECT id, nama_imunisasi, usia_ideal_bulan, deskripsi, created_at, updated_at FROM master_imunisasi"
		var args []interface{}
		query := baseQuery

		if searchQuery != "" {
			query += " WHERE nama_imunisasi ILIKE $1 OR deskripsi ILIKE $1"
			args = append(args, fmt.Sprintf("%%%s%%", searchQuery))
		}
		query += " ORDER BY usia_ideal_bulan ASC, nama_imunisasi ASC"

		rows, err := dbpool.Query(context.Background(), query, args...)
		if err != nil {
			log.Printf("ERROR querying master_imunisasi: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data master imunisasi."})
			return
		}
		defer rows.Close()

		for rows.Next() {
			var m MasterImunisasi
			if err := rows.Scan(&m.ID, &m.NamaImunisasi, &m.UsiaIdealBulan, &m.Deskripsi, &m.CreatedAt, &m.UpdatedAt); err != nil {
				log.Printf("ERROR scanning master_imunisasi row: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memindai data master imunisasi."})
				return
			}
			daftarImunisasi = append(daftarImunisasi, m)
		}

		if err := rows.Err(); err != nil {
			log.Printf("ERROR after iterating master_imunisasi rows: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses daftar master imunisasi."})
			return
		}

		c.JSON(http.StatusOK, daftarImunisasi)
	})

	router.GET("/api/master-imunisasi/:id", func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ID master imunisasi tidak valid"})
			return
		}

		var m MasterImunisasi
		err = dbpool.QueryRow(context.Background(),
			"SELECT id, nama_imunisasi, usia_ideal_bulan, deskripsi, created_at, updated_at FROM master_imunisasi WHERE id = $1", id).
			Scan(&m.ID, &m.NamaImunisasi, &m.UsiaIdealBulan, &m.Deskripsi, &m.CreatedAt, &m.UpdatedAt)

		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Master imunisasi tidak ditemukan."})
			return
		}
		c.JSON(http.StatusOK, m)
	})

	router.PUT("/api/master-imunisasi/:id", func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ID master imunisasi tidak valid"})
			return
		}

		var payload UpdateMasterImunisasiPayload
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Field Nama Imunisasi dan Usia Ideal wajib diisi."})
			return
		}

		_, err = dbpool.Exec(context.Background(),
			`UPDATE master_imunisasi 
			  SET nama_imunisasi = $1, usia_ideal_bulan = $2, deskripsi = $3, updated_at = NOW() 
			  WHERE id = $4`,
			payload.NamaImunisasi, payload.UsiaIdealBulan, payload.Deskripsi, id)

		if err != nil {
			log.Printf("ERROR updating master_imunisasi: %v", err)
			if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23505" {
				c.JSON(http.StatusConflict, gin.H{"error": "Nama imunisasi ini sudah digunakan."})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui master imunisasi."})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Master imunisasi berhasil diperbarui!"})
	})

	router.DELETE("/api/master-imunisasi/:id", func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ID master imunisasi tidak valid"})
			return
		}

		_, err = dbpool.Exec(context.Background(), "DELETE FROM master_imunisasi WHERE id = $1", id)
		if err != nil {
			log.Printf("ERROR deleting master_imunisasi: %v", err)
			if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23503" {
				c.JSON(http.StatusConflict, gin.H{"error": "Master imunisasi tidak bisa dihapus karena sudah terhubung dengan riwayat imunisasi."})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus master imunisasi."})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Master imunisasi berhasil dihapus!"})
	})

	// ==================================================
	// === ENDPOINTS /api/riwayat-imunisasi ===
	// ==================================================

	// *** PERBAIKAN: Ganti 'tanggal_diberikan' menjadi 'tanggal_imunisasi' di SQL ***
	router.POST("/api/riwayat-imunisasi", AuthMiddleware(), func(c *gin.Context) {
		var payload TambahRiwayatPayload
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Semua field wajib diisi."})
			return
		}

		kaderId, exists := c.Get("kaderId")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid."})
			return
		}

		tglImunisasi, err := time.Parse("2006-01-02", payload.TanggalDiberikan)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Format Tanggal Imunisasi tidak valid. Gunakan format YYYY-MM-DD."})
			return
		}

		_, err = dbpool.Exec(context.Background(),
			`INSERT INTO riwayat_imunisasi (id_anak, id_master_imunisasi, tanggal_imunisasi, catatan, id_kader_pencatat, id_kader_updater) 
			  VALUES ($1, $2, $3, $4, $5, NULL)`, // <-- Kolom 'tanggal_imunisasi'
			payload.IdAnak, payload.IdMasterImunisasi, tglImunisasi, payload.Catatan, kaderId.(int))

		if err != nil {
			log.Printf("ERROR inserting riwayat_imunisasi: %v", err)
			if pgErr, ok := err.(*pgconn.PgError); ok {
				if pgErr.Code == "23503" {
					c.JSON(http.StatusNotFound, gin.H{"error": "ID Anak atau ID Master Imunisasi tidak ditemukan."})
					return
				}
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan riwayat imunisasi."})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"message": "Riwayat imunisasi berhasil dicatat!"})
	})

	// *** PERBAIKAN: Ganti 'tanggal_diberikan' menjadi 'tanggal_imunisasi' di SQL ***
	router.GET("/api/riwayat-imunisasi", AuthMiddleware(), func(c *gin.Context) {
		var daftarRiwayat []RiwayatImunisasi
		searchQuery := c.Query("search")

		baseQuery := `
			SELECT
				r.id, r.id_anak, r.id_master_imunisasi, r.id_kader_pencatat, r.id_kader_updater,
				r.tanggal_imunisasi, r.catatan, r.created_at, r.updated_at,
				a.nama_anak, a.nik_anak,
				m.nama_imunisasi,
				k_pencatat.nama_lengkap AS nama_kader,
				k_updater.nama_lengkap AS nama_kader_updater
			FROM
				riwayat_imunisasi r
			JOIN anak a ON r.id_anak = a.id
			JOIN master_imunisasi m ON r.id_master_imunisasi = m.id
			LEFT JOIN kader k_pencatat ON r.id_kader_pencatat = k_pencatat.id
			LEFT JOIN kader k_updater ON r.id_kader_updater = k_updater.id
		`
		var args []interface{}
		query := baseQuery

		if searchQuery != "" {
			query += " WHERE a.nama_anak ILIKE $1 OR a.nik_anak ILIKE $1 OR m.nama_imunisasi ILIKE $1"
			args = append(args, fmt.Sprintf("%%%s%%", searchQuery))
		}
		query += " ORDER BY r.tanggal_imunisasi DESC" // <-- Perbaikan urutan

		rows, err := dbpool.Query(context.Background(), query, args...)
		if err != nil {
			log.Printf("ERROR querying riwayat_imunisasi: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data riwayat."})
			return
		}
		defer rows.Close()

		for rows.Next() {
			var r RiwayatImunisasi
			if err := rows.Scan(
				&r.ID, &r.IdAnak, &r.IdMasterImunisasi, &r.IdKaderPencatat, &r.IdKaderUpdater,
				&r.TanggalDiberikan, &r.Catatan, &r.CreatedAt, &r.UpdatedAt, // <-- r.TanggalDiberikan (field struct)
				&r.NamaAnak, &r.NikAnak,
				&r.NamaImunisasi,
				&r.NamaKader,
				&r.NamaKaderUpdater,
			); err != nil {
				log.Printf("ERROR scanning riwayat_imunisasi row: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memindai data riwayat."})
				return
			}
			daftarRiwayat = append(daftarRiwayat, r)
		}

		if err := rows.Err(); err != nil {
			log.Printf("ERROR after iterating riwayat_imunisasi rows: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses daftar riwayat."})
			return
		}
		c.JSON(http.StatusOK, daftarRiwayat)
	})

	// *** PERBAIKAN: Ganti 'tanggal_diberikan' menjadi 'tanggal_imunisasi' di SQL ***
	router.GET("/api/riwayat-imunisasi/:id", AuthMiddleware(), func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ID riwayat tidak valid"})
			return
		}

		var r RiwayatImunisasi
		query := `
			SELECT
				r.id, r.id_anak, r.id_master_imunisasi, r.id_kader_pencatat, r.id_kader_updater,
				r.tanggal_imunisasi, r.catatan, r.created_at, r.updated_at,
				a.nama_anak, a.nik_anak,
				m.nama_imunisasi,
				k_pencatat.nama_lengkap AS nama_kader,
				k_updater.nama_lengkap AS nama_kader_updater
			FROM
				riwayat_imunisasi r
			JOIN anak a ON r.id_anak = a.id
			JOIN master_imunisasi m ON r.id_master_imunisasi = m.id
			LEFT JOIN kader k_pencatat ON r.id_kader_pencatat = k_pencatat.id
			LEFT JOIN kader k_updater ON r.id_kader_updater = k_updater.id
			WHERE r.id = $1
		`
		err = dbpool.QueryRow(context.Background(), query, id).
			Scan(
				&r.ID, &r.IdAnak, &r.IdMasterImunisasi, &r.IdKaderPencatat, &r.IdKaderUpdater,
				&r.TanggalDiberikan, &r.Catatan, &r.CreatedAt, &r.UpdatedAt, // <-- r.TanggalDiberikan (field struct)
				&r.NamaAnak, &r.NikAnak,
				&r.NamaImunisasi,
				&r.NamaKader,
				&r.NamaKaderUpdater,
			)

		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Riwayat imunisasi tidak ditemukan."})
			return
		}
		c.JSON(http.StatusOK, r)
	})

	// *** PERBAIKAN: Ganti 'tanggal_diberikan' menjadi 'tanggal_imunisasi' di SQL ***
	router.PUT("/api/riwayat-imunisasi/:id", AuthMiddleware(), func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ID riwayat tidak valid"})
			return
		}

		var payload UpdateRiwayatPayload
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Semua field wajib diisi."})
			return
		}

		kaderId, exists := c.Get("kaderId")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid."})
			return
		}

		tglImunisasi, err := time.Parse("2006-01-02", payload.TanggalDiberikan)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Format Tanggal Imunisasi tidak valid. Gunakan format YYYY-MM-DD."})
			return
		}

		_, err = dbpool.Exec(context.Background(),
			`UPDATE riwayat_imunisasi 
			  SET id_anak = $1, id_master_imunisasi = $2, tanggal_imunisasi = $3, catatan = $4, 
			      id_kader_updater = $5, updated_at = NOW() 
			  WHERE id = $6`, // <-- Kolom 'tanggal_imunisasi'
			payload.IdAnak, payload.IdMasterImunisasi, tglImunisasi, payload.Catatan, kaderId.(int), id)

		if err != nil {
			log.Printf("ERROR updating riwayat_imunisasi: %v", err)
			if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23503" {
				c.JSON(http.StatusNotFound, gin.H{"error": "ID Anak atau ID Master Imunisasi tidak ditemukan."})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui riwayat imunisasi."})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Riwayat imunisasi berhasil diperbarui!"})
	})

	router.DELETE("/api/riwayat-imunisasi/:id", AuthMiddleware(), func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ID riwayat tidak valid"})
			return
		}

		_, err = dbpool.Exec(context.Background(), "DELETE FROM riwayat_imunisasi WHERE id = $1", id)
		if err != nil {
			log.Printf("ERROR deleting riwayat_imunisasi: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus riwayat imunisasi."})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Riwayat imunisasi berhasil dihapus!"})
	})

	// ===================================
	// === Menjalankan Server ===
	// ===================================
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Server starting on port %s...", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Server failed to run: %v", err)
	}
}
