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
	"github.com/nadhifhafizp/api/models"
)

// TambahIbuHandler menangani penambahan data ibu baru
func TambahIbuHandler(dbpool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		kaderIdInterface, exists := c.Get("kaderId")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid."})
			return
		}
		kaderId := kaderIdInterface.(int)

		var payload models.TambahIbuPayload
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Data tidak lengkap atau format salah."})
			return
		}

		if len(payload.NIK) > 16 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "NIK max 16 karakter."})
			return
		}

		_, err := dbpool.Exec(context.Background(),
			`INSERT INTO ibu (nama_lengkap, nik, no_telepon, alamat, id_kader_pendaftar) VALUES ($1, $2, $3, $4, $5)`,
			payload.NamaLengkap, payload.NIK, payload.NoTelepon, payload.Alamat, kaderId)

		if err != nil {
			log.Printf("ERROR inserting ibu by kader %d: %v", kaderId, err)
			if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23505" {
				if pgErr.ConstraintName == "ibu_nik_key" {
					c.JSON(http.StatusConflict, gin.H{"error": "NIK ini sudah terdaftar."})
					return
				}
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan data ibu."})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"message": "Data ibu berhasil didaftarkan!"})
	}
}

// GetIbuHandler menangani pengambilan daftar ibu
func GetIbuHandler(dbpool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		var daftarIbu []models.Ibu
		searchQuery := c.Query("search")
		baseQuery := "SELECT id, nama_lengkap, nik, no_telepon, alamat, id_kader_pendaftar, created_at, updated_at FROM ibu"
		var args []interface{}
		query := baseQuery

		if searchQuery != "" {
			query += " WHERE nama_lengkap ILIKE $1 OR nik ILIKE $1"
			args = append(args, fmt.Sprintf("%%%s%%", searchQuery))
		}
		query += " ORDER BY nama_lengkap ASC"

		rows, err := dbpool.Query(context.Background(), query, args...)
		if err != nil {
			log.Printf("ERROR querying ibu: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data ibu."})
			return
		}
		defer rows.Close()

		for rows.Next() {
			var i models.Ibu
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
	}
}

// GetIbuSimpleHandler menangani pengambilan daftar ibu (hanya ID dan nama)
func GetIbuSimpleHandler(dbpool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		var daftarIbu []models.IbuOption
		query := "SELECT id, nama_lengkap FROM ibu ORDER BY nama_lengkap ASC"
		rows, err := dbpool.Query(context.Background(), query)
		if err != nil {
			log.Printf("ERROR querying ibu simple: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil daftar ibu."})
			return
		}
		defer rows.Close()

		for rows.Next() {
			var i models.IbuOption
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
	}
}

// GetIbuByIdHandler menangani pengambilan data ibu berdasarkan ID
func GetIbuByIdHandler(dbpool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ID ibu tidak valid"})
			return
		}

		var ibu models.Ibu
		err = dbpool.QueryRow(context.Background(),
			`SELECT id, nama_lengkap, nik, no_telepon, alamat, id_kader_pendaftar, created_at, updated_at FROM ibu WHERE id = $1`, id).
			Scan(&ibu.ID, &ibu.NamaLengkap, &ibu.NIK, &ibu.NoTelepon, &ibu.Alamat, &ibu.IdKaderPendaftar, &ibu.CreatedAt, &ibu.UpdatedAt)

		if err != nil {
			if err.Error() == "no rows in result set" {
				c.JSON(http.StatusNotFound, gin.H{"error": "Ibu tidak ditemukan."})
			} else {
				log.Printf("ERROR querying ibu by ID %d: %v", id, err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data ibu."})
			}
			return
		}
		c.JSON(http.StatusOK, ibu)
	}
}

// UpdateIbuHandler menangani pembaruan data ibu
func UpdateIbuHandler(dbpool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ID ibu tidak valid"})
			return
		}

		var payload models.UpdateIbuPayload
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Data tidak lengkap."})
			return
		}
		if len(payload.NIK) > 16 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "NIK max 16 karakter."})
			return
		}

		_, err = dbpool.Exec(context.Background(),
			`UPDATE ibu SET nama_lengkap = $1, nik = $2, no_telepon = $3, alamat = $4, updated_at = NOW() WHERE id = $5`,
			payload.NamaLengkap, payload.NIK, payload.NoTelepon, payload.Alamat, id)

		if err != nil {
			log.Printf("ERROR updating ibu ID %d: %v", id, err)
			if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23505" {
				if pgErr.ConstraintName == "ibu_nik_key" {
					c.JSON(http.StatusConflict, gin.H{"error": "NIK ini sudah terdaftar pada ibu lain."})
					return
				}
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui data ibu."})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Data ibu berhasil diperbarui!"})
	}
}

// DeleteIbuHandler menangani penghapusan data ibu
func DeleteIbuHandler(dbpool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
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
				if pgErr.ConstraintName == "anak_id_ibu_fkey" {
					c.JSON(http.StatusConflict, gin.H{"error": "Ibu tidak bisa dihapus karena masih terhubung dengan data anak."})
					return
				}
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus data ibu."})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Data ibu berhasil dihapus!"})
	}
}
