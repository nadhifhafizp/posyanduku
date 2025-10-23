// handlers/kader.go
package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nadhifhafizp/api/models" // Sesuaikan path import
	"golang.org/x/crypto/bcrypt"
)

// RegisterKaderHandler handles kader registration
func RegisterKaderHandler(dbpool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		var payload models.RegisterKaderPayload
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Data tidak lengkap atau format salah."})
			return
		}
		// ... (validasi lainnya seperti password, NIK length) ...

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
				// ... (handle constraint errors) ...
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
	}
}

// GetKaderHandler handles fetching kader list
func GetKaderHandler(dbpool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		var daftarKader []models.Kader
		searchQuery := c.Query("search")
		baseQuery := "SELECT id, nama_lengkap, nik, no_telepon, username, created_at, updated_at FROM kader"
		var args []interface{}
		query := baseQuery
		if searchQuery != "" {
			query += " WHERE nama_lengkap ILIKE $1 OR nik ILIKE $1 OR username ILIKE $1"
			args = append(args, fmt.Sprintf("%%%s%%", searchQuery))
		}
		query += " ORDER BY nama_lengkap ASC"

		rows, err := dbpool.Query(context.Background(), query, args...)
		if err != nil {
			log.Printf("ERROR querying kader: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data kader."})
			return
		}
		defer rows.Close()

		for rows.Next() {
			var k models.Kader
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
	}
}

// UpdateKaderHandler handles updating kader data
func UpdateKaderHandler(dbpool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ID kader tidak valid"})
			return
		}
		var payload models.UpdateKaderPayload
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Data tidak lengkap atau format salah."})
			return
		}
		// ... (validasi NIK length) ...
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
				// ... (handle constraint errors) ...
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
	}
}

// ChangePasswordHandler handles changing kader password
func ChangePasswordHandler(dbpool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ID kader tidak valid"})
			return
		}
		var payload models.ChangePasswordPayload
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Password baru wajib diisi."})
			return
		}
		// ... (validasi panjang password) ...
		if len(payload.NewPassword) < 6 { // Contoh validasi panjang password
			c.JSON(http.StatusBadRequest, gin.H{"error": "Password baru minimal 6 karakter."})
			return
		}

		newHashedPassword, err := bcrypt.GenerateFromPassword([]byte(payload.NewPassword), bcrypt.DefaultCost)
		if err != nil {
			log.Printf("ERROR hashing new password for kader %d: %v", id, err)
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
	}
}

// DeleteKaderHandler handles deleting a kader
func DeleteKaderHandler(dbpool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
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
	}
}
