// main.go

package main

import (
	"context"
	"errors" // <-- Ditambahkan untuk error handling JWT
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
	// CurrentPassword string `json:"current_password"` // Hapus jika tidak divalidasi
	NewPassword string `json:"new_password" binding:"required"`
}

// --- Structs untuk Ibu ---
type TambahIbuPayload struct {
	NamaLengkap string `json:"nama_lengkap" binding:"required"`
	NIK         string `json:"nik" binding:"required"`
	NoTelepon   string `json:"no_telepon" binding:"required"`
	Alamat      string `json:"alamat" binding:"required"`
	// IdKaderPendaftar int `json:"id_kader_pendaftar"` // Dihapus
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

// <-- Struct IbuOption ditambahkan di sini -->
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
	// IdKaderPencatat    int      `json:"id_kader_pencatat"` // Dihapus
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
	// IdKaderPencatat    int      `json:"id_kader_pencatat"` // Dihapus
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
	Perkembangan // Embed
}
type LaporanImunisasi struct {
	RiwayatImunisasi // Embed
}

// --- Fungsi JWT dan Middleware ---
func generateJWT(kaderID int) (string, error) {
	secretKey := os.Getenv("JWT_SECRET_KEY")
	if secretKey == "" {
		log.Println("WARNING: JWT_SECRET_KEY environment variable is not set. Using default insecure key for development.")
		secretKey = "rahasia-banget-jangan-disebar" // Ganti di production
	}

	claims := AuthClaims{
		KaderID: kaderID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour * 24)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "posyanduku-api",
			Subject:   strconv.Itoa(kaderID),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secretKey))
}

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Akses Ditolak. Header Authorization tidak ada."})
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Akses Ditolak. Format header Authorization salah."})
			c.Abort()
			return
		}

		tokenString := parts[1]
		secretKey := os.Getenv("JWT_SECRET_KEY")
		if secretKey == "" {
			log.Println("WARNING: JWT_SECRET_KEY environment variable is not set during validation.")
			secretKey = "rahasia-banget-jangan-disebar"
		}

		token, err := jwt.ParseWithClaims(tokenString, &AuthClaims{}, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(secretKey), nil
		})

		// <-- Perbaikan Error Handling JWT -->
		if err != nil {
			log.Printf("Token validation error: %v", err)
			errorMsg := "Token tidak valid."
			// Gunakan errors.Is untuk memeriksa jenis error spesifik dari jwt/v5
			if errors.Is(err, jwt.ErrTokenMalformed) {
				errorMsg = "Token tidak berformat benar."
			} else if errors.Is(err, jwt.ErrTokenExpired) || errors.Is(err, jwt.ErrTokenNotValidYet) {
				errorMsg = "Token sudah kadaluarsa atau belum aktif."
			} else if errors.Is(err, jwt.ErrTokenSignatureInvalid) {
				errorMsg = "Signature token tidak valid."
			}
			// Bisa ditambahkan pengecekan error lain jika perlu
			c.JSON(http.StatusUnauthorized, gin.H{"error": errorMsg})
			c.Abort()
			return
		}

		if claims, ok := token.Claims.(*AuthClaims); ok && token.Valid {
			c.Set("kaderId", claims.KaderID)
			log.Printf("INFO: Authenticated request for Kader ID: %d", claims.KaderID)
		} else {
			log.Printf("Token claims invalid or token invalid after parsing.")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token tidak dapat diproses."})
			c.Abort()
			return
		}

		c.Next()
	}
}

// --- Fungsi Utama ---
func main() {
	// --- Setup ---
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: Error loading .env file, using environment variables if available.")
	}
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}
	dbpool, err := pgxpool.New(context.Background(), databaseURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer dbpool.Close()
	log.Println("Successfully connected to the database!")
	err = dbpool.Ping(context.Background())
	if err != nil {
		log.Fatalf("Unable to ping database: %v\n", err)
	}
	log.Println("Database ping successful!")

	router := gin.Default()
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// ===================================
	// === RUTE PUBLIK (Tidak Perlu Login) ===
	// ===================================
	router.POST("/api/login", func(c *gin.Context) {
		var payload LoginPayload
		var kader Kader
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Username dan Password wajib diisi"})
			return
		}
		// Query ke database untuk mencari kader berdasarkan username
		err := dbpool.QueryRow(context.Background(),
			"SELECT id, nama_lengkap, nik, no_telepon, password, username, created_at, updated_at FROM kader WHERE username = $1", payload.Username).Scan(
			&kader.ID, &kader.NamaLengkap, &kader.NIK, &kader.NoTelepon, &kader.Password, &kader.Username, &kader.CreatedAt, &kader.UpdatedAt)

		if err != nil {
			// Jika tidak ditemukan atau error lain, kembalikan unauthorized
			log.Printf("INFO: Login attempt failed for username %s: %v", payload.Username, err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Username atau Password salah"})
			return
		}

		// Bandingkan hash password dari database dengan password dari payload
		err = bcrypt.CompareHashAndPassword([]byte(kader.Password), []byte(payload.Password))
		if err != nil {
			// Jika password tidak cocok
			log.Printf("INFO: Invalid password for username %s", payload.Username)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Username atau Password salah"})
			return
		}

		// Jika username dan password cocok, generate token JWT
		token, err := generateJWT(kader.ID)
		if err != nil {
			log.Printf("ERROR generating JWT for user %s: %v", payload.Username, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses login."})
			return
		}

		// Kirim respons sukses beserta token dan data user minimal
		log.Printf("INFO: User %s (ID: %d) logged in successfully", payload.Username, kader.ID)
		c.JSON(http.StatusOK, gin.H{
			"message": "Login berhasil!",
			"user":    gin.H{"id": kader.ID, "nama_lengkap": kader.NamaLengkap, "username": kader.Username},
			"token":   token,
		})
	})

	router.POST("/api/kader", func(c *gin.Context) {
		var payload RegisterKaderPayload
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Data tidak lengkap atau format salah."})
			return
		}
		if payload.Password == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Password wajib diisi."})
			return
		}
		if payload.NIK != "" && len(payload.NIK) > 16 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "NIK tidak boleh lebih dari 16 karakter."})
			return
		}
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(payload.Password), bcrypt.DefaultCost)
		if err != nil {
			log.Printf("ERROR hashing password: %v", err)
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
					c.JSON(http.StatusConflict, gin.H{"error": "Data unik sudah ada (" + pgErr.ConstraintName + ")."})
				}
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan data kader."})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"message": "Kader baru berhasil didaftarkan!"})
	})

	// ===================================
	// === RUTE TERPROTEKSI (Perlu Login) ===
	// ===================================
	authenticated := router.Group("/api")
	authenticated.Use(AuthMiddleware())
	{
		// === ENDPOINTS KADER (/api/kader) ===
		authenticated.GET("/kader", func(c *gin.Context) {
			var daftarKader []Kader
			searchQuery := c.Query("search")
			baseQuery := "SELECT id, nama_lengkap, nik, no_telepon, username, created_at, updated_at FROM kader"
			var args []interface{}
			query := baseQuery
			if searchQuery != "" {
				query += " WHERE nama_lengkap ILIKE $1 OR nik ILIKE $1 OR username ILIKE $1"
				args = append(args, fmt.Sprintf("%%%s%%", searchQuery))
			}
			query += " ORDER BY nama_lengkap ASC" // Urutkan berdasarkan nama
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
			if err := rows.Err(); err != nil {
				log.Printf("ERROR after iterating kader rows: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses daftar kader."})
				return
			}
			c.JSON(http.StatusOK, daftarKader)
		})

		authenticated.PUT("/kader/:id", func(c *gin.Context) {
			idStr := c.Param("id")
			id, err := strconv.Atoi(idStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "ID kader tidak valid"})
				return
			}
			var payload UpdateKaderPayload
			if err := c.ShouldBindJSON(&payload); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Data tidak lengkap atau format salah."})
				return
			}
			if payload.NIK != "" && len(payload.NIK) > 16 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "NIK tidak boleh lebih dari 16 karakter."})
				return
			}
			_, err = dbpool.Exec(context.Background(),
				`UPDATE kader SET nama_lengkap = $1, nik = $2, no_telepon = $3, username = $4, updated_at = NOW() WHERE id = $5`,
				payload.NamaLengkap, payload.NIK, payload.NoTelepon, payload.Username, id)
			if err != nil {
				log.Printf("ERROR updating kader ID %d: %v", id, err)
				if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23505" {
					switch pgErr.ConstraintName {
					case "kader_username_key":
						c.JSON(http.StatusConflict, gin.H{"error": "Username ini sudah digunakan kader lain."})
						return
					case "kader_nik_key":
						c.JSON(http.StatusConflict, gin.H{"error": "NIK ini sudah digunakan kader lain."})
						return
					default:
						c.JSON(http.StatusConflict, gin.H{"error": "Data unik sudah ada."})
						return
					}
				}
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui data kader."})
				return
			}
			c.JSON(http.StatusOK, gin.H{"message": "Data kader berhasil diperbarui!"})
		})

		authenticated.PUT("/kader/:id/password", func(c *gin.Context) {
			idStr := c.Param("id")
			id, err := strconv.Atoi(idStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "ID kader tidak valid"})
				return
			}
			var payload ChangePasswordPayload
			if err := c.ShouldBindJSON(&payload); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Password baru wajib diisi."})
				return
			}
			if len(payload.NewPassword) < 6 { // Contoh validasi panjang password
				c.JSON(http.StatusBadRequest, gin.H{"error": "Password baru minimal 6 karakter."})
				return
			}

			newHashedPassword, err := bcrypt.GenerateFromPassword([]byte(payload.NewPassword), bcrypt.DefaultCost)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses password baru."})
				return
			}
			_, err = dbpool.Exec(context.Background(), "UPDATE kader SET password = $1, updated_at = NOW() WHERE id = $2", string(newHashedPassword), id)
			if err != nil {
				log.Printf("ERROR updating password for kader %d: %v", id, err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui password."})
				return
			}
			c.JSON(http.StatusOK, gin.H{"message": "Password berhasil diperbarui!"})
		})

		authenticated.DELETE("/kader/:id", func(c *gin.Context) {
			idStr := c.Param("id")
			id, err := strconv.Atoi(idStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "ID kader tidak valid"})
				return
			}
			_, err = dbpool.Exec(context.Background(), "DELETE FROM kader WHERE id = $1", id)
			if err != nil {
				log.Printf("ERROR deleting kader ID %d: %v", id, err)
				if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23503" {
					c.JSON(http.StatusConflict, gin.H{"error": "Kader tidak bisa dihapus karena masih terhubung dengan data lain (misal: data ibu/perkembangan)."})
					return
				}
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus data kader."})
				return
			}
			c.JSON(http.StatusOK, gin.H{"message": "Data kader berhasil dihapus!"})
		})

		// === ENDPOINTS IBU (/api/ibu) ===
		authenticated.POST("/ibu", func(c *gin.Context) {
			kaderIdInterface, exists := c.Get("kaderId")
			if !exists {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid."})
				return
			}
			kaderId := kaderIdInterface.(int)
			var payload TambahIbuPayload
			if err := c.ShouldBindJSON(&payload); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Data tidak lengkap atau format salah."})
				return
			}
			if len(payload.NIK) > 16 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "NIK max 16 karakter."})
				return
			}
			_, err := dbpool.Exec(context.Background(), `INSERT INTO ibu (nama_lengkap, nik, no_telepon, alamat, id_kader_pendaftar) VALUES ($1, $2, $3, $4, $5)`, payload.NamaLengkap, payload.NIK, payload.NoTelepon, payload.Alamat, kaderId)
			if err != nil {
				log.Printf("ERROR inserting ibu by kader %d: %v", kaderId, err)
				if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23505" {
					c.JSON(http.StatusConflict, gin.H{"error": "NIK ini sudah terdaftar."})
					return
				}
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan data ibu."})
				return
			}
			c.JSON(http.StatusCreated, gin.H{"message": "Data ibu berhasil didaftarkan!"})
		})

		authenticated.GET("/ibu", func(c *gin.Context) {
			var daftarIbu []Ibu
			searchQuery := c.Query("search")
			baseQuery := "SELECT id, nama_lengkap, nik, no_telepon, alamat, id_kader_pendaftar, created_at, updated_at FROM ibu"
			var args []interface{}
			query := baseQuery
			if searchQuery != "" {
				query += " WHERE nama_lengkap ILIKE $1 OR nik ILIKE $1"
				args = append(args, fmt.Sprintf("%%%s%%", searchQuery))
			}
			query += " ORDER BY nama_lengkap ASC" // Urutkan berdasarkan nama
			rows, err := dbpool.Query(context.Background(), query, args...)
			if err != nil {
				log.Printf("ERROR querying ibu: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data ibu."})
				return
			}
			defer rows.Close()
			for rows.Next() {
				var i Ibu
				if err := rows.Scan(&i.ID, &i.NamaLengkap, &i.NIK, &i.NoTelepon, &i.Alamat, &i.IdKaderPendaftar, &i.CreatedAt, &i.UpdatedAt); err != nil {
					log.Printf("ERROR scanning ibu row: %v", err)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memindai data ibu."})
					return
				}
				daftarIbu = append(daftarIbu, i)
			}
			if err := rows.Err(); err != nil {
				log.Printf("ERROR after iterating ibu rows: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses daftar ibu."})
				return
			}
			c.JSON(http.StatusOK, daftarIbu)
		})

		authenticated.GET("/ibu/simple", func(c *gin.Context) {
			var daftarIbu []IbuOption
			query := "SELECT id, nama_lengkap FROM ibu ORDER BY nama_lengkap ASC"
			rows, err := dbpool.Query(context.Background(), query)
			if err != nil {
				log.Printf("ERROR querying ibu simple: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil daftar ibu."})
				return
			}
			defer rows.Close()
			for rows.Next() {
				var i IbuOption
				if err := rows.Scan(&i.ID, &i.NamaLengkap); err != nil {
					log.Printf("ERROR scanning ibu simple row: %v", err)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memindai data ibu."})
					return
				}
				daftarIbu = append(daftarIbu, i)
			}
			if err := rows.Err(); err != nil {
				log.Printf("ERROR after iterating ibu simple rows: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses daftar ibu."})
				return
			}
			c.JSON(http.StatusOK, daftarIbu)
		})

		authenticated.GET("/ibu/:id", func(c *gin.Context) {
			idStr := c.Param("id")
			id, err := strconv.Atoi(idStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "ID ibu tidak valid"})
				return
			}
			var ibu Ibu
			err = dbpool.QueryRow(context.Background(), `SELECT id, nama_lengkap, nik, no_telepon, alamat, id_kader_pendaftar, created_at, updated_at FROM ibu WHERE id = $1`, id).
				Scan(&ibu.ID, &ibu.NamaLengkap, &ibu.NIK, &ibu.NoTelepon, &ibu.Alamat, &ibu.IdKaderPendaftar, &ibu.CreatedAt, &ibu.UpdatedAt)
			if err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "Ibu tidak ditemukan."})
				return
			}
			c.JSON(http.StatusOK, ibu)
		})

		authenticated.PUT("/ibu/:id", func(c *gin.Context) {
			idStr := c.Param("id")
			id, err := strconv.Atoi(idStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "ID ibu tidak valid"})
				return
			}
			var payload UpdateIbuPayload
			if err := c.ShouldBindJSON(&payload); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Data tidak lengkap."})
				return
			}
			if len(payload.NIK) > 16 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "NIK max 16 karakter."})
				return
			}
			_, err = dbpool.Exec(context.Background(), `UPDATE ibu SET nama_lengkap = $1, nik = $2, no_telepon = $3, alamat = $4, updated_at = NOW() WHERE id = $5`, payload.NamaLengkap, payload.NIK, payload.NoTelepon, payload.Alamat, id)
			if err != nil {
				log.Printf("ERROR updating ibu ID %d: %v", id, err)
				if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23505" {
					c.JSON(http.StatusConflict, gin.H{"error": "NIK ini sudah terdaftar pada ibu lain."})
					return
				}
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui data ibu."})
				return
			}
			c.JSON(http.StatusOK, gin.H{"message": "Data ibu berhasil diperbarui!"})
		})

		authenticated.DELETE("/ibu/:id", func(c *gin.Context) {
			idStr := c.Param("id")
			id, err := strconv.Atoi(idStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "ID ibu tidak valid"})
				return
			}
			_, err = dbpool.Exec(context.Background(), "DELETE FROM ibu WHERE id = $1", id)
			if err != nil {
				log.Printf("ERROR deleting ibu ID %d: %v", id, err)
				if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23503" {
					c.JSON(http.StatusConflict, gin.H{"error": "Ibu tidak bisa dihapus karena masih terhubung dengan data anak."})
					return
				}
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus data ibu."})
				return
			}
			c.JSON(http.StatusOK, gin.H{"message": "Data ibu berhasil dihapus!"})
		})

		// === ENDPOINTS ANAK (/api/anak) ===
		authenticated.POST("/anak", func(c *gin.Context) {
			var payload TambahAnakPayload
			if err := c.ShouldBindJSON(&payload); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Data tidak lengkap atau format salah."})
				return
			}
			tglLahir, err := time.Parse("2006-01-02", payload.TanggalLahir)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Format Tanggal Lahir tidak valid (YYYY-MM-DD)."})
				return
			}
			if payload.NikAnak != nil && len(*payload.NikAnak) > 16 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "NIK Anak max 16 karakter."})
				return
			}
			_, err = dbpool.Exec(context.Background(), `INSERT INTO anak (id_ibu, nama_anak, nik_anak, tanggal_lahir, jenis_kelamin, anak_ke, berat_lahir_kg, tinggi_lahir_cm) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, payload.IdIbu, payload.NamaAnak, payload.NikAnak, tglLahir, payload.JenisKelamin, payload.AnakKe, payload.BeratLahirKg, payload.TinggiLahirCm)
			if err != nil {
				log.Printf("ERROR inserting anak: %v", err)
				if pgErr, ok := err.(*pgconn.PgError); ok {
					if pgErr.Code == "23503" {
						c.JSON(http.StatusNotFound, gin.H{"error": "ID Ibu tidak ditemukan."})
						return
					}
					if pgErr.Code == "23505" {
						c.JSON(http.StatusConflict, gin.H{"error": "NIK anak ini sudah terdaftar."})
						return
					}
				}
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan data anak."})
				return
			}
			c.JSON(http.StatusCreated, gin.H{"message": "Data anak berhasil didaftarkan!"})
		})

		authenticated.GET("/anak", func(c *gin.Context) {
			var daftarAnak []Anak
			searchQuery := c.Query("search")
			baseQuery := `SELECT a.id, a.id_ibu, a.nama_anak, a.nik_anak, a.tanggal_lahir, a.jenis_kelamin, a.anak_ke, a.berat_lahir_kg, a.tinggi_lahir_cm, a.created_at, a.updated_at, i.nama_lengkap AS nama_ibu FROM anak a LEFT JOIN ibu i ON a.id_ibu = i.id`
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
				if err := rows.Scan(&a.ID, &a.IdIbu, &a.NamaAnak, &a.NikAnak, &a.TanggalLahir, &a.JenisKelamin, &a.AnakKe, &a.BeratLahirKg, &a.TinggiLahirCm, &a.CreatedAt, &a.UpdatedAt, &a.NamaIbu); err != nil {
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

		authenticated.GET("/anak/simple", func(c *gin.Context) {
			var daftarAnak []AnakSimple
			query := `SELECT id, nama_anak, nik_anak FROM anak ORDER BY nama_anak ASC`
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

		authenticated.GET("/anak/:id", func(c *gin.Context) {
			idStr := c.Param("id")
			id, err := strconv.Atoi(idStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "ID anak tidak valid"})
				return
			}
			var anak Anak
			query := `SELECT a.id, a.id_ibu, a.nama_anak, a.nik_anak, a.tanggal_lahir, a.jenis_kelamin, a.anak_ke, a.berat_lahir_kg, a.tinggi_lahir_cm, a.created_at, a.updated_at, i.nama_lengkap AS nama_ibu FROM anak a LEFT JOIN ibu i ON a.id_ibu = i.id WHERE a.id = $1`
			err = dbpool.QueryRow(context.Background(), query, id).
				Scan(&anak.ID, &anak.IdIbu, &anak.NamaAnak, &anak.NikAnak, &anak.TanggalLahir, &anak.JenisKelamin, &anak.AnakKe, &anak.BeratLahirKg, &anak.TinggiLahirCm, &anak.CreatedAt, &anak.UpdatedAt, &anak.NamaIbu)
			if err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "Data anak tidak ditemukan."})
				return
			}
			c.JSON(http.StatusOK, anak)
		})

		authenticated.PUT("/anak/:id", func(c *gin.Context) {
			idStr := c.Param("id")
			id, err := strconv.Atoi(idStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "ID anak tidak valid"})
				return
			}
			var payload UpdateAnakPayload
			if err := c.ShouldBindJSON(&payload); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Data tidak lengkap atau format salah."})
				return
			}
			tglLahir, err := time.Parse("2006-01-02", payload.TanggalLahir)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Format Tanggal Lahir tidak valid (YYYY-MM-DD)."})
				return
			}
			if payload.NikAnak != nil && len(*payload.NikAnak) > 16 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "NIK Anak max 16 karakter."})
				return
			}
			_, err = dbpool.Exec(context.Background(), `UPDATE anak SET id_ibu = $1, nama_anak = $2, nik_anak = $3, tanggal_lahir = $4, jenis_kelamin = $5, anak_ke = $6, berat_lahir_kg = $7, tinggi_lahir_cm = $8, updated_at = NOW() WHERE id = $9`, payload.IdIbu, payload.NamaAnak, payload.NikAnak, tglLahir, payload.JenisKelamin, payload.AnakKe, payload.BeratLahirKg, payload.TinggiLahirCm, id)
			if err != nil {
				log.Printf("ERROR updating anak ID %d: %v", id, err)
				if pgErr, ok := err.(*pgconn.PgError); ok {
					if pgErr.Code == "23503" {
						c.JSON(http.StatusNotFound, gin.H{"error": "ID Ibu tidak ditemukan."})
						return
					}
					if pgErr.Code == "23505" {
						c.JSON(http.StatusConflict, gin.H{"error": "NIK anak ini sudah digunakan anak lain."})
						return
					}
				}
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui data anak."})
				return
			}
			c.JSON(http.StatusOK, gin.H{"message": "Data anak berhasil diperbarui!"})
		})

		authenticated.DELETE("/anak/:id", func(c *gin.Context) {
			idStr := c.Param("id")
			id, err := strconv.Atoi(idStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "ID anak tidak valid"})
				return
			}
			_, err = dbpool.Exec(context.Background(), "DELETE FROM anak WHERE id = $1", id)
			if err != nil {
				log.Printf("ERROR deleting anak ID %d: %v", id, err)
				if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23503" {
					c.JSON(http.StatusConflict, gin.H{"error": "Anak tidak bisa dihapus karena masih terhubung dengan data perkembangan/imunisasi."})
					return
				}
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus data anak."})
				return
			}
			c.JSON(http.StatusOK, gin.H{"message": "Data anak berhasil dihapus!"})
		})

		// === ENDPOINTS PERKEMBANGAN (/api/perkembangan) ===
		authenticated.POST("/perkembangan", func(c *gin.Context) {
			kaderIdInterface, exists := c.Get("kaderId")
			if !exists {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid."})
				return
			}
			kaderId := kaderIdInterface.(int)
			var payload TambahPerkembanganPayload
			if err := c.ShouldBindJSON(&payload); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Data tidak lengkap atau format salah."})
				return
			}
			tglPemeriksaan, err := time.Parse("2006-01-02", payload.TanggalPemeriksaan)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Format tanggal salah (YYYY-MM-DD)."})
				return
			}
			_, err = dbpool.Exec(context.Background(), `INSERT INTO perkembangan (id_anak, tanggal_pemeriksaan, bb_kg, tb_cm, lk_cm, ll_cm, status_gizi, saran, id_kader_pencatat) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, payload.IdAnak, tglPemeriksaan, payload.BbKg, payload.TbCm, payload.LkCm, payload.LlCm, payload.StatusGizi, payload.Saran, kaderId)
			if err != nil {
				log.Printf("ERROR inserting perkembangan by kader %d: %v", kaderId, err)
				if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23503" {
					c.JSON(http.StatusNotFound, gin.H{"error": "ID Anak tidak ditemukan."})
					return
				}
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan data perkembangan."})
				return
			}
			c.JSON(http.StatusCreated, gin.H{"message": "Data perkembangan berhasil dicatat!"})
		})

		authenticated.GET("/perkembangan", func(c *gin.Context) {
			var daftarPerkembangan []Perkembangan
			searchQuery := c.Query("search")
			baseQuery := `SELECT p.id, p.id_anak, p.tanggal_pemeriksaan, p.bb_kg, p.tb_cm, p.lk_cm, p.ll_cm, p.status_gizi, p.saran, p.id_kader_pencatat, p.created_at, p.updated_at, a.nama_anak, k.nama_lengkap AS nama_kader, a.nik_anak, i.nama_lengkap AS nama_ibu FROM perkembangan p JOIN anak a ON p.id_anak = a.id JOIN ibu i ON a.id_ibu = i.id LEFT JOIN kader k ON p.id_kader_pencatat = k.id`
			var args []interface{}
			query := baseQuery
			if searchQuery != "" {
				query += " WHERE a.nama_anak ILIKE $1 OR a.nik_anak ILIKE $1 OR k.nama_lengkap ILIKE $1 OR i.nama_lengkap ILIKE $1"
				args = append(args, fmt.Sprintf("%%%s%%", searchQuery))
			}
			query += " ORDER BY p.tanggal_pemeriksaan DESC, a.nama_anak ASC" // Urutan lebih baik
			rows, err := dbpool.Query(context.Background(), query, args...)
			if err != nil {
				log.Printf("ERROR querying perkembangan: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data perkembangan."})
				return
			}
			defer rows.Close()
			for rows.Next() {
				var p Perkembangan
				if err := rows.Scan(&p.ID, &p.IdAnak, &p.TanggalPemeriksaan, &p.BbKg, &p.TbCm, &p.LkCm, &p.LlCm, &p.StatusGizi, &p.Saran, &p.IdKaderPencatat, &p.CreatedAt, &p.UpdatedAt, &p.NamaAnak, &p.NamaKader, &p.NikAnak, &p.NamaIbu); err != nil {
					log.Printf("ERROR scanning perkembangan row: %v", err)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memindai data."})
					return
				}
				daftarPerkembangan = append(daftarPerkembangan, p)
			}
			if err := rows.Err(); err != nil {
				log.Printf("ERROR after iterating perkembangan rows: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses daftar."})
				return
			}
			c.JSON(http.StatusOK, daftarPerkembangan)
		})

		authenticated.GET("/perkembangan/:id", func(c *gin.Context) {
			idStr := c.Param("id")
			id, err := strconv.Atoi(idStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
				return
			}
			var p Perkembangan
			query := `SELECT p.id, p.id_anak, p.tanggal_pemeriksaan, p.bb_kg, p.tb_cm, p.lk_cm, p.ll_cm, p.status_gizi, p.saran, p.id_kader_pencatat, p.created_at, p.updated_at, a.nama_anak, k.nama_lengkap AS nama_kader, a.nik_anak, i.nama_lengkap AS nama_ibu FROM perkembangan p JOIN anak a ON p.id_anak = a.id JOIN ibu i ON a.id_ibu = i.id LEFT JOIN kader k ON p.id_kader_pencatat = k.id WHERE p.id = $1`
			err = dbpool.QueryRow(context.Background(), query, id).Scan(&p.ID, &p.IdAnak, &p.TanggalPemeriksaan, &p.BbKg, &p.TbCm, &p.LkCm, &p.LlCm, &p.StatusGizi, &p.Saran, &p.IdKaderPencatat, &p.CreatedAt, &p.UpdatedAt, &p.NamaAnak, &p.NamaKader, &p.NikAnak, &p.NamaIbu)
			if err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "Data tidak ditemukan."})
				return
			}
			c.JSON(http.StatusOK, p)
		})

		authenticated.PUT("/perkembangan/:id", func(c *gin.Context) {
			// kaderIdInterface, exists := c.Get("kaderId") // <-- Dihapus karena tidak digunakan di DB update
			// if !exists { c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid."}); return }

			idStr := c.Param("id")
			id, err := strconv.Atoi(idStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
				return
			}
			var payload UpdatePerkembanganPayload
			if err := c.ShouldBindJSON(&payload); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Data tidak lengkap."})
				return
			}
			tglPemeriksaan, err := time.Parse("2006-01-02", payload.TanggalPemeriksaan)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Format tanggal salah (YYYY-MM-DD)."})
				return
			}
			_, err = dbpool.Exec(context.Background(), `UPDATE perkembangan SET id_anak = $1, tanggal_pemeriksaan = $2, bb_kg = $3, tb_cm = $4, lk_cm = $5, ll_cm = $6, status_gizi = $7, saran = $8, updated_at = NOW() WHERE id = $9`, payload.IdAnak, tglPemeriksaan, payload.BbKg, payload.TbCm, payload.LkCm, payload.LlCm, payload.StatusGizi, payload.Saran, id)
			if err != nil {
				log.Printf("ERROR updating perkembangan ID %d: %v", id, err)
				if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23503" {
					c.JSON(http.StatusNotFound, gin.H{"error": "ID Anak tidak ditemukan."})
					return
				}
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update."})
				return
			}
			c.JSON(http.StatusOK, gin.H{"message": "Data perkembangan berhasil diperbarui!"})
		})

		authenticated.DELETE("/perkembangan/:id", func(c *gin.Context) {
			idStr := c.Param("id")
			id, err := strconv.Atoi(idStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
				return
			}
			_, err = dbpool.Exec(context.Background(), "DELETE FROM perkembangan WHERE id = $1", id)
			if err != nil {
				log.Printf("ERROR deleting perkembangan ID %d: %v", id, err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus."})
				return
			}
			c.JSON(http.StatusOK, gin.H{"message": "Data perkembangan berhasil dihapus!"})
		})

		// === ENDPOINTS MASTER IMUNISASI (/api/master-imunisasi) ===
		authenticated.POST("/master-imunisasi", func(c *gin.Context) {
			var payload TambahMasterImunisasiPayload
			if err := c.ShouldBindJSON(&payload); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Nama Imunisasi dan Usia Ideal wajib diisi."})
				return
			}
			if payload.UsiaIdealBulan < 0 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Usia Ideal tidak boleh negatif."})
				return
			}
			_, err := dbpool.Exec(context.Background(), `INSERT INTO master_imunisasi (nama_imunisasi, usia_ideal_bulan, deskripsi) VALUES ($1, $2, $3)`, payload.NamaImunisasi, payload.UsiaIdealBulan, payload.Deskripsi)
			if err != nil {
				log.Printf("ERROR inserting master_imunisasi: %v", err)
				if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23505" {
					c.JSON(http.StatusConflict, gin.H{"error": "Nama imunisasi ini sudah ada."})
					return
				}
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan."})
				return
			}
			c.JSON(http.StatusCreated, gin.H{"message": "Master imunisasi berhasil ditambahkan!"})
		})

		authenticated.GET("/master-imunisasi", func(c *gin.Context) {
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
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data."})
				return
			}
			defer rows.Close()
			for rows.Next() {
				var m MasterImunisasi
				if err := rows.Scan(&m.ID, &m.NamaImunisasi, &m.UsiaIdealBulan, &m.Deskripsi, &m.CreatedAt, &m.UpdatedAt); err != nil {
					log.Printf("ERROR scanning master_imunisasi: %v", err)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memindai data."})
					return
				}
				daftarImunisasi = append(daftarImunisasi, m)
			}
			if err := rows.Err(); err != nil {
				log.Printf("ERROR iterating master_imunisasi: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses daftar."})
				return
			}
			c.JSON(http.StatusOK, daftarImunisasi)
		})

		authenticated.GET("/master-imunisasi/:id", func(c *gin.Context) {
			idStr := c.Param("id")
			id, err := strconv.Atoi(idStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
				return
			}
			var m MasterImunisasi
			err = dbpool.QueryRow(context.Background(), `SELECT id, nama_imunisasi, usia_ideal_bulan, deskripsi, created_at, updated_at FROM master_imunisasi WHERE id = $1`, id).Scan(&m.ID, &m.NamaImunisasi, &m.UsiaIdealBulan, &m.Deskripsi, &m.CreatedAt, &m.UpdatedAt)
			if err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "Data tidak ditemukan."})
				return
			}
			c.JSON(http.StatusOK, m)
		})

		authenticated.PUT("/master-imunisasi/:id", func(c *gin.Context) {
			idStr := c.Param("id")
			id, err := strconv.Atoi(idStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
				return
			}
			var payload UpdateMasterImunisasiPayload
			if err := c.ShouldBindJSON(&payload); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Data tidak lengkap."})
				return
			}
			if payload.UsiaIdealBulan < 0 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Usia Ideal tidak boleh negatif."})
				return
			}
			_, err = dbpool.Exec(context.Background(), `UPDATE master_imunisasi SET nama_imunisasi = $1, usia_ideal_bulan = $2, deskripsi = $3, updated_at = NOW() WHERE id = $4`, payload.NamaImunisasi, payload.UsiaIdealBulan, payload.Deskripsi, id)
			if err != nil {
				log.Printf("ERROR updating master_imunisasi ID %d: %v", id, err)
				if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23505" {
					c.JSON(http.StatusConflict, gin.H{"error": "Nama imunisasi ini sudah digunakan."})
					return
				}
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui."})
				return
			}
			c.JSON(http.StatusOK, gin.H{"message": "Master imunisasi berhasil diperbarui!"})
		})

		authenticated.DELETE("/master-imunisasi/:id", func(c *gin.Context) {
			idStr := c.Param("id")
			id, err := strconv.Atoi(idStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
				return
			}
			_, err = dbpool.Exec(context.Background(), "DELETE FROM master_imunisasi WHERE id = $1", id)
			if err != nil {
				log.Printf("ERROR deleting master_imunisasi ID %d: %v", id, err)
				if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23503" {
					c.JSON(http.StatusConflict, gin.H{"error": "Master imunisasi tidak bisa dihapus karena terhubung dengan riwayat."})
					return
				}
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus."})
				return
			}
			c.JSON(http.StatusOK, gin.H{"message": "Master imunisasi berhasil dihapus!"})
		})

		// === ENDPOINTS RIWAYAT IMUNISASI (/api/riwayat-imunisasi) ===
		authenticated.POST("/riwayat-imunisasi", func(c *gin.Context) {
			kaderIdInterface, exists := c.Get("kaderId")
			if !exists {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid."})
				return
			}
			kaderId := kaderIdInterface.(int)
			var payload TambahRiwayatPayload
			if err := c.ShouldBindJSON(&payload); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Data tidak lengkap."})
				return
			}
			tglImunisasi, err := time.Parse("2006-01-02", payload.TanggalDiberikan)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Format tanggal salah (YYYY-MM-DD)."})
				return
			}
			_, err = dbpool.Exec(context.Background(), `INSERT INTO riwayat_imunisasi (id_anak, id_master_imunisasi, tanggal_imunisasi, catatan, id_kader_pencatat) VALUES ($1, $2, $3, $4, $5)`, payload.IdAnak, payload.IdMasterImunisasi, tglImunisasi, payload.Catatan, kaderId)
			if err != nil {
				log.Printf("ERROR inserting riwayat imunisasi by kader %d: %v", kaderId, err)
				if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23503" {
					c.JSON(http.StatusNotFound, gin.H{"error": "ID Anak atau ID Master Imunisasi tidak ditemukan."})
					return
				}
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan."})
				return
			}
			c.JSON(http.StatusCreated, gin.H{"message": "Riwayat imunisasi berhasil dicatat!"})
		})

		authenticated.GET("/riwayat-imunisasi", func(c *gin.Context) {
			var daftarRiwayat []RiwayatImunisasi
			searchQuery := c.Query("search")
			baseQuery := `SELECT r.id, r.id_anak, r.id_master_imunisasi, r.id_kader_pencatat, r.id_kader_updater, r.tanggal_imunisasi, r.catatan, r.created_at, r.updated_at, a.nama_anak, a.nik_anak, m.nama_imunisasi, kp.nama_lengkap AS nama_kader, ku.nama_lengkap AS nama_kader_updater FROM riwayat_imunisasi r JOIN anak a ON r.id_anak = a.id JOIN master_imunisasi m ON r.id_master_imunisasi = m.id LEFT JOIN kader kp ON r.id_kader_pencatat = kp.id LEFT JOIN kader ku ON r.id_kader_updater = ku.id`
			var args []interface{}
			query := baseQuery
			if searchQuery != "" {
				query += " WHERE a.nama_anak ILIKE $1 OR a.nik_anak ILIKE $1 OR m.nama_imunisasi ILIKE $1"
				args = append(args, fmt.Sprintf("%%%s%%", searchQuery))
			}
			query += " ORDER BY r.tanggal_imunisasi DESC, a.nama_anak ASC"
			rows, err := dbpool.Query(context.Background(), query, args...)
			if err != nil {
				log.Printf("ERROR querying riwayat_imunisasi: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data."})
				return
			}
			defer rows.Close()
			for rows.Next() {
				var r RiwayatImunisasi
				if err := rows.Scan(&r.ID, &r.IdAnak, &r.IdMasterImunisasi, &r.IdKaderPencatat, &r.IdKaderUpdater, &r.TanggalDiberikan, &r.Catatan, &r.CreatedAt, &r.UpdatedAt, &r.NamaAnak, &r.NikAnak, &r.NamaImunisasi, &r.NamaKader, &r.NamaKaderUpdater); err != nil {
					log.Printf("ERROR scanning riwayat_imunisasi: %v", err)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memindai data."})
					return
				}
				daftarRiwayat = append(daftarRiwayat, r)
			}
			if err := rows.Err(); err != nil {
				log.Printf("ERROR iterating riwayat_imunisasi: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses daftar."})
				return
			}
			c.JSON(http.StatusOK, daftarRiwayat)
		})

		authenticated.GET("/riwayat-imunisasi/:id", func(c *gin.Context) {
			idStr := c.Param("id")
			id, err := strconv.Atoi(idStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
				return
			}
			var r RiwayatImunisasi
			query := `SELECT r.id, r.id_anak, r.id_master_imunisasi, r.id_kader_pencatat, r.id_kader_updater, r.tanggal_imunisasi, r.catatan, r.created_at, r.updated_at, a.nama_anak, a.nik_anak, m.nama_imunisasi, kp.nama_lengkap AS nama_kader, ku.nama_lengkap AS nama_kader_updater FROM riwayat_imunisasi r JOIN anak a ON r.id_anak = a.id JOIN master_imunisasi m ON r.id_master_imunisasi = m.id LEFT JOIN kader kp ON r.id_kader_pencatat = kp.id LEFT JOIN kader ku ON r.id_kader_updater = ku.id WHERE r.id = $1`
			err = dbpool.QueryRow(context.Background(), query, id).Scan(&r.ID, &r.IdAnak, &r.IdMasterImunisasi, &r.IdKaderPencatat, &r.IdKaderUpdater, &r.TanggalDiberikan, &r.Catatan, &r.CreatedAt, &r.UpdatedAt, &r.NamaAnak, &r.NikAnak, &r.NamaImunisasi, &r.NamaKader, &r.NamaKaderUpdater)
			if err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "Data tidak ditemukan."})
				return
			}
			c.JSON(http.StatusOK, r)
		})

		authenticated.PUT("/riwayat-imunisasi/:id", func(c *gin.Context) {
			kaderIdInterface, exists := c.Get("kaderId")
			if !exists {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid."})
				return
			}
			kaderId := kaderIdInterface.(int)
			idStr := c.Param("id")
			id, err := strconv.Atoi(idStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
				return
			}
			var payload UpdateRiwayatPayload
			if err := c.ShouldBindJSON(&payload); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Data tidak lengkap."})
				return
			}
			tglImunisasi, err := time.Parse("2006-01-02", payload.TanggalDiberikan)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Format tanggal salah (YYYY-MM-DD)."})
				return
			}
			_, err = dbpool.Exec(context.Background(), `UPDATE riwayat_imunisasi SET id_anak = $1, id_master_imunisasi = $2, tanggal_imunisasi = $3, catatan = $4, id_kader_updater = $5, updated_at = NOW() WHERE id = $6`, payload.IdAnak, payload.IdMasterImunisasi, tglImunisasi, payload.Catatan, kaderId, id)
			if err != nil {
				log.Printf("ERROR updating riwayat_imunisasi ID %d by kader %d: %v", id, kaderId, err)
				if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23503" {
					c.JSON(http.StatusNotFound, gin.H{"error": "ID Anak atau ID Master Imunisasi tidak ditemukan."})
					return
				}
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update."})
				return
			}
			c.JSON(http.StatusOK, gin.H{"message": "Riwayat imunisasi berhasil diperbarui!"})
		})

		authenticated.DELETE("/riwayat-imunisasi/:id", func(c *gin.Context) {
			idStr := c.Param("id")
			id, err := strconv.Atoi(idStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
				return
			}
			_, err = dbpool.Exec(context.Background(), "DELETE FROM riwayat_imunisasi WHERE id = $1", id)
			if err != nil {
				log.Printf("ERROR deleting riwayat_imunisasi ID %d: %v", id, err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus."})
				return
			}
			c.JSON(http.StatusOK, gin.H{"message": "Riwayat imunisasi berhasil dihapus!"})
		})
		// --- ENDPOINTS LAPORAN ---
		authenticated.GET("/laporan/:tipe", func(c *gin.Context) {
			tipeLaporan := c.Param("tipe")
			tanggalMulai := c.Query("start")
			tanggalAkhir := c.Query("end")
			var startDate, endDate time.Time
			var errStart, errEnd error
			layout := "2006-01-02"
			if tanggalMulai != "" {
				startDate, errStart = time.Parse(layout, tanggalMulai)
			}
			if tanggalAkhir != "" {
				endDate, errEnd = time.Parse(layout, tanggalAkhir)
				endDate = endDate.AddDate(0, 0, 1)
			}
			if errStart != nil || errEnd != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Format tanggal tidak valid (YYYY-MM-DD)"})
				return
			}
			log.Printf("Fetching report type: %s, Start: %s, End: %s", tipeLaporan, tanggalMulai, tanggalAkhir)

			switch tipeLaporan {
			case "wali":
				var daftarIbu []Ibu
				query := `SELECT id, nama_lengkap, nik, no_telepon, alamat, id_kader_pendaftar, created_at, updated_at FROM ibu`
				var args []interface{}
				var conditions []string
				argCounter := 1
				if !startDate.IsZero() {
					conditions = append(conditions, fmt.Sprintf("created_at >= $%d", argCounter))
					args = append(args, startDate)
					argCounter++
				}
				if !endDate.IsZero() {
					conditions = append(conditions, fmt.Sprintf("created_at < $%d", argCounter))
					args = append(args, endDate)
					argCounter++
				}
				if len(conditions) > 0 {
					query += " WHERE " + strings.Join(conditions, " AND ")
				}
				query += " ORDER BY created_at DESC"
				rows, err := dbpool.Query(context.Background(), query, args...)
				if err != nil {
					log.Printf("ERROR querying report ibu: %v", err)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data."})
					return
				}
				defer rows.Close()
				for rows.Next() {
					var i Ibu
					if err := rows.Scan(&i.ID, &i.NamaLengkap, &i.NIK, &i.NoTelepon, &i.Alamat, &i.IdKaderPendaftar, &i.CreatedAt, &i.UpdatedAt); err != nil {
						log.Printf("ERROR scanning report ibu: %v", err)
						c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memindai data."})
						return
					}
					daftarIbu = append(daftarIbu, i)
				}
				if err := rows.Err(); err != nil {
					log.Printf("ERROR iterating report ibu: %v", err)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses."})
					return
				}
				c.JSON(http.StatusOK, daftarIbu)

			case "anak":
				var daftarAnak []Anak
				query := `SELECT a.id, a.id_ibu, a.nama_anak, a.nik_anak, a.tanggal_lahir, a.jenis_kelamin, a.anak_ke, a.berat_lahir_kg, a.tinggi_lahir_cm, a.created_at, a.updated_at, i.nama_lengkap AS nama_ibu FROM anak a LEFT JOIN ibu i ON a.id_ibu = i.id`
				var args []interface{}
				var conditions []string
				argCounter := 1
				if !startDate.IsZero() {
					conditions = append(conditions, fmt.Sprintf("a.created_at >= $%d", argCounter))
					args = append(args, startDate)
					argCounter++
				}
				if !endDate.IsZero() {
					conditions = append(conditions, fmt.Sprintf("a.created_at < $%d", argCounter))
					args = append(args, endDate)
					argCounter++
				}
				if len(conditions) > 0 {
					query += " WHERE " + strings.Join(conditions, " AND ")
				}
				query += " ORDER BY a.created_at DESC"
				rows, err := dbpool.Query(context.Background(), query, args...)
				if err != nil {
					log.Printf("ERROR querying report anak: %v", err)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data."})
					return
				}
				defer rows.Close()
				for rows.Next() {
					var a Anak
					if err := rows.Scan(&a.ID, &a.IdIbu, &a.NamaAnak, &a.NikAnak, &a.TanggalLahir, &a.JenisKelamin, &a.AnakKe, &a.BeratLahirKg, &a.TinggiLahirCm, &a.CreatedAt, &a.UpdatedAt, &a.NamaIbu); err != nil {
						log.Printf("ERROR scanning report anak: %v", err)
						c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memindai data."})
						return
					}
					daftarAnak = append(daftarAnak, a)
				}
				if err := rows.Err(); err != nil {
					log.Printf("ERROR iterating report anak: %v", err)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses."})
					return
				}
				c.JSON(http.StatusOK, daftarAnak)

			case "perkembangan":
				var daftarPerkembangan []LaporanPerkembangan
				query := `SELECT p.id, p.id_anak, p.tanggal_pemeriksaan, p.bb_kg, p.tb_cm, p.lk_cm, p.ll_cm, p.status_gizi, p.saran, p.id_kader_pencatat, p.created_at, p.updated_at, a.nama_anak, k.nama_lengkap AS nama_kader, a.nik_anak, i.nama_lengkap AS nama_ibu FROM perkembangan p JOIN anak a ON p.id_anak = a.id JOIN ibu i ON a.id_ibu = i.id LEFT JOIN kader k ON p.id_kader_pencatat = k.id`
				var args []interface{}
				var conditions []string
				argCounter := 1
				if !startDate.IsZero() {
					conditions = append(conditions, fmt.Sprintf("p.tanggal_pemeriksaan >= $%d", argCounter))
					args = append(args, startDate)
					argCounter++
				}
				if !endDate.IsZero() {
					conditions = append(conditions, fmt.Sprintf("p.tanggal_pemeriksaan < $%d", argCounter))
					args = append(args, endDate)
					argCounter++
				}
				if len(conditions) > 0 {
					query += " WHERE " + strings.Join(conditions, " AND ")
				}
				query += " ORDER BY p.tanggal_pemeriksaan DESC, a.nama_anak ASC"
				rows, err := dbpool.Query(context.Background(), query, args...)
				if err != nil {
					log.Printf("ERROR querying report perkembangan: %v", err)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data."})
					return
				}
				defer rows.Close()
				for rows.Next() {
					var p LaporanPerkembangan
					if err := rows.Scan(&p.ID, &p.IdAnak, &p.TanggalPemeriksaan, &p.BbKg, &p.TbCm, &p.LkCm, &p.LlCm, &p.StatusGizi, &p.Saran, &p.IdKaderPencatat, &p.CreatedAt, &p.UpdatedAt, &p.NamaAnak, &p.NamaKader, &p.NikAnak, &p.NamaIbu); err != nil {
						log.Printf("ERROR scanning report perkembangan: %v", err)
						c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memindai data."})
						return
					}
					daftarPerkembangan = append(daftarPerkembangan, p)
				}
				if err := rows.Err(); err != nil {
					log.Printf("ERROR iterating report perkembangan: %v", err)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses."})
					return
				}
				c.JSON(http.StatusOK, daftarPerkembangan)

			case "imunisasi":
				var daftarImunisasi []LaporanImunisasi
				query := `SELECT r.id, r.id_anak, r.id_master_imunisasi, r.id_kader_pencatat, r.id_kader_updater, r.tanggal_imunisasi, r.catatan, r.created_at, r.updated_at, a.nama_anak, a.nik_anak, m.nama_imunisasi, kp.nama_lengkap AS nama_kader, ku.nama_lengkap AS nama_kader_updater FROM riwayat_imunisasi r JOIN anak a ON r.id_anak = a.id JOIN master_imunisasi m ON r.id_master_imunisasi = m.id LEFT JOIN kader kp ON r.id_kader_pencatat = kp.id LEFT JOIN kader ku ON r.id_kader_updater = ku.id`
				var args []interface{}
				var conditions []string
				argCounter := 1
				if !startDate.IsZero() {
					conditions = append(conditions, fmt.Sprintf("r.tanggal_imunisasi >= $%d", argCounter))
					args = append(args, startDate)
					argCounter++
				}
				if !endDate.IsZero() {
					conditions = append(conditions, fmt.Sprintf("r.tanggal_imunisasi < $%d", argCounter))
					args = append(args, endDate)
					argCounter++
				}
				if len(conditions) > 0 {
					query += " WHERE " + strings.Join(conditions, " AND ")
				}
				query += " ORDER BY r.tanggal_imunisasi DESC, a.nama_anak ASC"
				rows, err := dbpool.Query(context.Background(), query, args...)
				if err != nil {
					log.Printf("ERROR querying report imunisasi: %v", err)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data."})
					return
				}
				defer rows.Close()
				for rows.Next() {
					var r LaporanImunisasi
					if err := rows.Scan(&r.ID, &r.IdAnak, &r.IdMasterImunisasi, &r.IdKaderPencatat, &r.IdKaderUpdater, &r.TanggalDiberikan, &r.Catatan, &r.CreatedAt, &r.UpdatedAt, &r.NamaAnak, &r.NikAnak, &r.NamaImunisasi, &r.NamaKader, &r.NamaKaderUpdater); err != nil {
						log.Printf("ERROR scanning report imunisasi: %v", err)
						c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memindai data."})
						return
					}
					daftarImunisasi = append(daftarImunisasi, r)
				}
				if err := rows.Err(); err != nil {
					log.Printf("ERROR iterating report imunisasi: %v", err)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses."})
					return
				}
				c.JSON(http.StatusOK, daftarImunisasi)

			default:
				c.JSON(http.StatusBadRequest, gin.H{"error": "Tipe laporan tidak valid."})
			}
		})
	} // Akhir dari grup 'authenticated'

	// === Menjalankan Server ===
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Server starting on http://localhost:%s...", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Server failed to run: %v", err)
	}
}
