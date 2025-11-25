// handlers/imunisasi.go
package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nadhifhafizp/api/models" // Sesuaikan path import
)

// --- Master Imunisasi Handlers ---

// TambahMasterImunisasiHandler menangani penambahan master imunisasi baru
func TambahMasterImunisasiHandler(dbpool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		var payload models.TambahMasterImunisasiPayload
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Nama Imunisasi dan Usia Ideal wajib diisi."})
			return
		}
		if payload.UsiaIdealBulan < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Usia Ideal tidak boleh negatif."})
			return
		}

		_, err := dbpool.Exec(context.Background(),
			`INSERT INTO master_imunisasi (nama_imunisasi, usia_ideal_bulan, deskripsi) VALUES ($1, $2, $3)`,
			payload.NamaImunisasi, payload.UsiaIdealBulan, payload.Deskripsi)

		if err != nil {
			log.Printf("ERROR inserting master_imunisasi: %v", err)
			if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23505" {
				if pgErr.ConstraintName == "master_imunisasi_nama_imunisasi_key" { // Ganti dg nama constraint yg benar
					c.JSON(http.StatusConflict, gin.H{"error": "Nama imunisasi ini sudah ada."})
					return
				}
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan."})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"message": "Master imunisasi berhasil ditambahkan!"})
	}
}

// GetMasterImunisasiHandler menangani pengambilan daftar master imunisasi
func GetMasterImunisasiHandler(dbpool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Cek apakah perlu format 'simple'
		if c.Request.URL.Path == "/api/master-imunisasi/simple" { // Atau gunakan parameter query
			GetMasterImunisasiSimpleHandler(dbpool)(c) // Panggil handler simple
			return
		}

		daftarImunisasi := make([]models.MasterImunisasi, 0) // Gunakan slice kosong agar return [] bukan null
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
			var m models.MasterImunisasi
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
	}
}

// GetMasterImunisasiSimpleHandler menangani pengambilan daftar simple (ID, Nama, Usia)
func GetMasterImunisasiSimpleHandler(dbpool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		daftarImunisasi := make([]models.MasterImunisasiSimple, 0)
		query := "SELECT id, nama_imunisasi, usia_ideal_bulan FROM master_imunisasi ORDER BY usia_ideal_bulan ASC, nama_imunisasi ASC"
		rows, err := dbpool.Query(context.Background(), query)
		if err != nil {
			log.Printf("ERROR querying master_imunisasi simple: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data."})
			return
		}
		defer rows.Close()

		for rows.Next() {
			var m models.MasterImunisasiSimple
			if err := rows.Scan(&m.ID, &m.NamaImunisasi, &m.UsiaIdealBulan); err != nil {
				log.Printf("ERROR scanning master_imunisasi simple: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memindai data."})
				return
			}
			daftarImunisasi = append(daftarImunisasi, m)
		}

		if err := rows.Err(); err != nil {
			log.Printf("ERROR iterating master_imunisasi simple: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses daftar."})
			return
		}
		c.JSON(http.StatusOK, daftarImunisasi)
	}
}

// GetMasterImunisasiByIdHandler menangani pengambilan master imunisasi berdasarkan ID
func GetMasterImunisasiByIdHandler(dbpool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
			return
		}

		var m models.MasterImunisasi
		err = dbpool.QueryRow(context.Background(),
			`SELECT id, nama_imunisasi, usia_ideal_bulan, deskripsi, created_at, updated_at FROM master_imunisasi WHERE id = $1`, id).
			Scan(&m.ID, &m.NamaImunisasi, &m.UsiaIdealBulan, &m.Deskripsi, &m.CreatedAt, &m.UpdatedAt)

		if err != nil {
			if err.Error() == "no rows in result set" {
				c.JSON(http.StatusNotFound, gin.H{"error": "Data tidak ditemukan."})
			} else {
				log.Printf("ERROR querying master_imunisasi by ID %d: %v", id, err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data."})
			}
			return
		}
		c.JSON(http.StatusOK, m)
	}
}

// UpdateMasterImunisasiHandler menangani pembaruan master imunisasi
func UpdateMasterImunisasiHandler(dbpool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
			return
		}

		var payload models.UpdateMasterImunisasiPayload
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Data tidak lengkap."})
			return
		}
		if payload.UsiaIdealBulan < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Usia Ideal tidak boleh negatif."})
			return
		}

		_, err = dbpool.Exec(context.Background(),
			`UPDATE master_imunisasi SET nama_imunisasi = $1, usia_ideal_bulan = $2, deskripsi = $3, updated_at = NOW() WHERE id = $4`,
			payload.NamaImunisasi, payload.UsiaIdealBulan, payload.Deskripsi, id)

		if err != nil {
			log.Printf("ERROR updating master_imunisasi ID %d: %v", id, err)
			if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23505" {
				if pgErr.ConstraintName == "master_imunisasi_nama_imunisasi_key" { // Ganti dg nama constraint yg benar
					c.JSON(http.StatusConflict, gin.H{"error": "Nama imunisasi ini sudah digunakan."})
					return
				}
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui."})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Master imunisasi berhasil diperbarui!"})
	}
}

// DeleteMasterImunisasiHandler menangani penghapusan master imunisasi
func DeleteMasterImunisasiHandler(dbpool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
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
				if pgErr.ConstraintName == "riwayat_imunisasi_id_master_imunisasi_fkey" { // Ganti dg nama constraint yg benar
					c.JSON(http.StatusConflict, gin.H{"error": "Master imunisasi tidak bisa dihapus karena terhubung dengan riwayat."})
					return
				}
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus."})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Master imunisasi berhasil dihapus!"})
	}
}

// --- Riwayat Imunisasi Handlers ---

// TambahRiwayatImunisasiHandler menangani penambahan riwayat imunisasi baru
func TambahRiwayatImunisasiHandler(dbpool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		kaderIdInterface, exists := c.Get("kaderId")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid."})
			return
		}
		kaderId := kaderIdInterface.(int)

		var payload models.TambahRiwayatPayload
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Data tidak lengkap."})
			return
		}

		tglImunisasi, err := time.Parse("2006-01-02", payload.TanggalDiberikan)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Format tanggal salah (YYYY-MM-DD)."})
			return
		}

		_, err = dbpool.Exec(context.Background(),
			`INSERT INTO riwayat_imunisasi (id_anak, id_master_imunisasi, tanggal_imunisasi, catatan, id_kader_pencatat) VALUES ($1, $2, $3, $4, $5)`,
			payload.IdAnak, payload.IdMasterImunisasi, tglImunisasi, payload.Catatan, kaderId)

		if err != nil {
			log.Printf("ERROR inserting riwayat imunisasi by kader %d: %v", kaderId, err)
			if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23503" {
				// Cek constraint FK untuk id_anak dan id_master_imunisasi
				if pgErr.ConstraintName == "riwayat_imunisasi_id_anak_fkey" {
					c.JSON(http.StatusNotFound, gin.H{"error": "ID Anak tidak ditemukan."})
				} else if pgErr.ConstraintName == "riwayat_imunisasi_id_master_imunisasi_fkey" {
					c.JSON(http.StatusNotFound, gin.H{"error": "ID Master Imunisasi tidak ditemukan."})
				} else {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan: Relasi data tidak valid."})
				}
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan."})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"message": "Riwayat imunisasi berhasil dicatat!"})
	}
}

// GetRiwayatImunisasiHandler menangani pengambilan daftar riwayat imunisasi
func GetRiwayatImunisasiHandler(dbpool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		var daftarRiwayat []models.RiwayatImunisasi
		searchQuery := c.Query("search")
		idAnakQuery := c.Query("id_anak") // <-- TAMBAHAN BARU

		baseQuery := `
            SELECT
                r.id, r.id_anak, r.id_master_imunisasi, r.id_kader_pencatat, r.id_kader_updater,
                r.tanggal_imunisasi, r.catatan, r.created_at, r.updated_at,
                a.nama_anak, a.nik_anak,
                m.nama_imunisasi,
                kp.nama_lengkap AS nama_kader,
                ku.nama_lengkap AS nama_kader_updater
            FROM riwayat_imunisasi r
            JOIN anak a ON r.id_anak = a.id
            JOIN master_imunisasi m ON r.id_master_imunisasi = m.id
            LEFT JOIN kader kp ON r.id_kader_pencatat = kp.id
            LEFT JOIN kader ku ON r.id_kader_updater = ku.id`

		var args []interface{}
		var conditions []string
		argCounter := 1
		query := baseQuery

		if searchQuery != "" {
			conditions = append(conditions, fmt.Sprintf("(a.nama_anak ILIKE $%d OR a.nik_anak ILIKE $%d OR m.nama_imunisasi ILIKE $%d)", argCounter, argCounter, argCounter))
			args = append(args, fmt.Sprintf("%%%s%%", searchQuery))
			argCounter++
		}

		// <-- BLOK TAMBAHAN BARU ---
		if idAnakQuery != "" {
			idAnak, err := strconv.Atoi(idAnakQuery)
			if err == nil && idAnak > 0 {
				conditions = append(conditions, fmt.Sprintf("r.id_anak = $%d", argCounter))
				args = append(args, idAnak)
				argCounter++
			}
		}
		// --- END BLOK TAMBAHAN ---

		if len(conditions) > 0 {
			query += " WHERE " + strings.Join(conditions, " AND ")
		}

		query += " ORDER BY r.tanggal_imunisasi DESC, a.nama_anak ASC"

		rows, err := dbpool.Query(context.Background(), query, args...)
		// ... (sisa fungsi tetap sama) ...
		if err != nil {
			log.Printf("ERROR querying riwayat_imunisasi: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data."})
			return
		}
		defer rows.Close()

		for rows.Next() {
			var r models.RiwayatImunisasi
			if err := rows.Scan(
				&r.ID, &r.IdAnak, &r.IdMasterImunisasi, &r.IdKaderPencatat, &r.IdKaderUpdater,
				&r.TanggalDiberikan, &r.Catatan, &r.CreatedAt, &r.UpdatedAt,
				&r.NamaAnak, &r.NikAnak,
				&r.NamaImunisasi,
				&r.NamaKader, &r.NamaKaderUpdater,
			); err != nil {
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
	}
}

// GetRiwayatImunisasiByIdHandler menangani pengambilan riwayat imunisasi berdasarkan ID
func GetRiwayatImunisasiByIdHandler(dbpool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
			return
		}

		var r models.RiwayatImunisasi
		query := `
            SELECT
                r.id, r.id_anak, r.id_master_imunisasi, r.id_kader_pencatat, r.id_kader_updater,
                r.tanggal_imunisasi, r.catatan, r.created_at, r.updated_at,
                a.nama_anak, a.nik_anak,
                m.nama_imunisasi,
                kp.nama_lengkap AS nama_kader,
                ku.nama_lengkap AS nama_kader_updater
            FROM riwayat_imunisasi r
            JOIN anak a ON r.id_anak = a.id
            JOIN master_imunisasi m ON r.id_master_imunisasi = m.id
            LEFT JOIN kader kp ON r.id_kader_pencatat = kp.id
            LEFT JOIN kader ku ON r.id_kader_updater = ku.id
            WHERE r.id = $1`

		err = dbpool.QueryRow(context.Background(), query, id).Scan(
			&r.ID, &r.IdAnak, &r.IdMasterImunisasi, &r.IdKaderPencatat, &r.IdKaderUpdater,
			&r.TanggalDiberikan, &r.Catatan, &r.CreatedAt, &r.UpdatedAt,
			&r.NamaAnak, &r.NikAnak,
			&r.NamaImunisasi,
			&r.NamaKader, &r.NamaKaderUpdater,
		)

		if err != nil {
			if err.Error() == "no rows in result set" {
				c.JSON(http.StatusNotFound, gin.H{"error": "Data tidak ditemukan."})
			} else {
				log.Printf("ERROR querying riwayat_imunisasi by ID %d: %v", id, err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data."})
			}
			return
		}
		c.JSON(http.StatusOK, r)
	}
}

// UpdateRiwayatImunisasiHandler menangani pembaruan riwayat imunisasi
func UpdateRiwayatImunisasiHandler(dbpool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
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

		var payload models.UpdateRiwayatPayload
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Data tidak lengkap."})
			return
		}

		tglImunisasi, err := time.Parse("2006-01-02", payload.TanggalDiberikan)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Format tanggal salah (YYYY-MM-DD)."})
			return
		}

		_, err = dbpool.Exec(context.Background(),
			`UPDATE riwayat_imunisasi SET id_anak = $1, id_master_imunisasi = $2, tanggal_imunisasi = $3, catatan = $4, id_kader_updater = $5, updated_at = NOW() WHERE id = $6`,
			payload.IdAnak, payload.IdMasterImunisasi, tglImunisasi, payload.Catatan, kaderId, id)

		if err != nil {
			log.Printf("ERROR updating riwayat_imunisasi ID %d by kader %d: %v", id, kaderId, err)
			if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23503" {
				// Cek constraint FK untuk id_anak dan id_master_imunisasi
				if pgErr.ConstraintName == "riwayat_imunisasi_id_anak_fkey" {
					c.JSON(http.StatusNotFound, gin.H{"error": "ID Anak tidak ditemukan."})
				} else if pgErr.ConstraintName == "riwayat_imunisasi_id_master_imunisasi_fkey" {
					c.JSON(http.StatusNotFound, gin.H{"error": "ID Master Imunisasi tidak ditemukan."})
				} else {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update: Relasi data tidak valid."})
				}
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update."})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Riwayat imunisasi berhasil diperbarui!"})
	}
}

// DeleteRiwayatImunisasiHandler menangani penghapusan riwayat imunisasi
func DeleteRiwayatImunisasiHandler(dbpool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
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
	}
}
