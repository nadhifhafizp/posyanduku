// handlers/anak.go
package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nadhifhafizp/api/models" // Sesuaikan path import
)

// TambahAnakHandler menangani penambahan data anak baru
func TambahAnakHandler(dbpool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		var payload models.TambahAnakPayload
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

		_, err = dbpool.Exec(context.Background(),
			`INSERT INTO anak (id_ibu, nama_anak, nik_anak, tanggal_lahir, jenis_kelamin, anak_ke, berat_lahir_kg, tinggi_lahir_cm) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			payload.IdIbu, payload.NamaAnak, payload.NikAnak, tglLahir, payload.JenisKelamin, payload.AnakKe, payload.BeratLahirKg, payload.TinggiLahirCm)

		if err != nil {
			log.Printf("ERROR inserting anak: %v", err)
			if pgErr, ok := err.(*pgconn.PgError); ok {
				if pgErr.Code == "23503" { // Foreign key violation (id_ibu)
					if pgErr.ConstraintName == "anak_id_ibu_fkey" { // Ganti dg nama constraint yg benar
						c.JSON(http.StatusNotFound, gin.H{"error": "ID Ibu tidak ditemukan."})
						return
					}
				}
				if pgErr.Code == "23505" { // Unique key violation (nik_anak)
					if pgErr.ConstraintName == "anak_nik_anak_key" { // Ganti dg nama constraint yg benar
						c.JSON(http.StatusConflict, gin.H{"error": "NIK anak ini sudah terdaftar."})
						return
					}
				}
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan data anak."})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"message": "Data anak berhasil didaftarkan!"})
	}
}

// GetAnakHandler menangani pengambilan daftar anak
func GetAnakHandler(dbpool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		var daftarAnak []models.Anak
		searchQuery := c.Query("search")
		// Pastikan JOIN ke ibu sudah ada
		baseQuery := `SELECT a.id, a.id_ibu, a.nama_anak, a.nik_anak, a.tanggal_lahir, a.jenis_kelamin, a.anak_ke, a.berat_lahir_kg, a.tinggi_lahir_cm, a.created_at, a.updated_at, i.nama_lengkap AS nama_ibu FROM anak a LEFT JOIN ibu i ON a.id_ibu = i.id`
		var args []interface{}
		query := baseQuery

		if searchQuery != "" {
			// Tambahkan i.nik ILIKE $1 ke pencarian
			query += " WHERE a.nama_anak ILIKE $1 OR a.nik_anak ILIKE $1 OR i.nama_lengkap ILIKE $1 OR i.nik ILIKE $1"
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
			var a models.Anak
			// Scan tetap sama, karena kita tidak menambahkan nik_ibu di list
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
	}
}

// GetAnakSimpleHandler menangani pengambilan daftar anak (hanya ID, nama, NIK)
func GetAnakSimpleHandler(dbpool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		var daftarAnak []models.AnakSimple
		query := `SELECT id, nama_anak, nik_anak FROM anak ORDER BY nama_anak ASC`
		rows, err := dbpool.Query(context.Background(), query)
		if err != nil {
			log.Printf("ERROR querying anak (simple): %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil daftar anak."})
			return
		}
		defer rows.Close()

		for rows.Next() {
			var a models.AnakSimple
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
	}
}

// GetAnakByIdHandler menangani pengambilan data anak berdasarkan ID
func GetAnakByIdHandler(dbpool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ID anak tidak valid"})
			return
		}

		var anak models.Anak
		// Perbarui query untuk menyertakan i.nik AS nik_ibu
		query := `SELECT a.id, a.id_ibu, a.nama_anak, a.nik_anak, a.tanggal_lahir, a.jenis_kelamin, a.anak_ke, a.berat_lahir_kg, a.tinggi_lahir_cm, a.created_at, a.updated_at, i.nama_lengkap AS nama_ibu, i.nik AS nik_ibu FROM anak a LEFT JOIN ibu i ON a.id_ibu = i.id WHERE a.id = $1`
		err = dbpool.QueryRow(context.Background(), query, id).
			// Perbarui Scan untuk menyertakan &anak.NikIbu
			Scan(&anak.ID, &anak.IdIbu, &anak.NamaAnak, &anak.NikAnak, &anak.TanggalLahir, &anak.JenisKelamin, &anak.AnakKe, &anak.BeratLahirKg, &anak.TinggiLahirCm, &anak.CreatedAt, &anak.UpdatedAt, &anak.NamaIbu, &anak.NikIbu)

		if err != nil {
			if err.Error() == "no rows in result set" {
				c.JSON(http.StatusNotFound, gin.H{"error": "Data anak tidak ditemukan."})
			} else {
				log.Printf("ERROR querying anak by ID %d: %v", id, err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data anak."})
			}
			return
		}
		c.JSON(http.StatusOK, anak)
	}
}

// UpdateAnakHandler menangani pembaruan data anak
func UpdateAnakHandler(dbpool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ID anak tidak valid"})
			return
		}

		var payload models.UpdateAnakPayload
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

		_, err = dbpool.Exec(context.Background(),
			`UPDATE anak SET id_ibu = $1, nama_anak = $2, nik_anak = $3, tanggal_lahir = $4, jenis_kelamin = $5, anak_ke = $6, berat_lahir_kg = $7, tinggi_lahir_cm = $8, updated_at = NOW() WHERE id = $9`,
			payload.IdIbu, payload.NamaAnak, payload.NikAnak, tglLahir, payload.JenisKelamin, payload.AnakKe, payload.BeratLahirKg, payload.TinggiLahirCm, id)

		if err != nil {
			log.Printf("ERROR updating anak ID %d: %v", id, err)
			if pgErr, ok := err.(*pgconn.PgError); ok {
				if pgErr.Code == "23503" { // Foreign key violation (id_ibu)
					if pgErr.ConstraintName == "anak_id_ibu_fkey" { // Ganti dg nama constraint yg benar
						c.JSON(http.StatusNotFound, gin.H{"error": "ID Ibu tidak ditemukan."})
						return
					}
				}
				if pgErr.Code == "23505" { // Unique key violation (nik_anak)
					if pgErr.ConstraintName == "anak_nik_anak_key" { // Ganti dg nama constraint yg benar
						c.JSON(http.StatusConflict, gin.H{"error": "NIK anak ini sudah digunakan anak lain."})
						return
					}
				}
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui data anak."})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Data anak berhasil diperbarui!"})
	}
}

// DeleteAnakHandler menangani penghapusan data anak
func DeleteAnakHandler(dbpool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
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
				// Cek constraint foreign key (misal, jika terhubung ke 'perkembangan' atau 'riwayat_imunisasi')
				if pgErr.ConstraintName == "perkembangan_id_anak_fkey" || pgErr.ConstraintName == "riwayat_imunisasi_id_anak_fkey" { // Ganti dg nama constraint yg benar
					c.JSON(http.StatusConflict, gin.H{"error": "Anak tidak bisa dihapus karena masih terhubung dengan data perkembangan/imunisasi."})
					return
				}
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus data anak."})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Data anak berhasil dihapus!"})
	}
}
