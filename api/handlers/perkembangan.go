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
	"github.com/nadhifhafizp/api/models"
)

// TambahPerkembanganHandler menangani penambahan data perkembangan baru
func TambahPerkembanganHandler(dbpool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		kaderIdInterface, exists := c.Get("kaderId")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid."})
			return
		}
		kaderId := kaderIdInterface.(int)

		var payload models.TambahPerkembanganPayload
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Data tidak lengkap atau format salah."})
			return
		}

		tglPemeriksaan, err := time.Parse("2006-01-02", payload.TanggalPemeriksaan)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Format tanggal salah (YYYY-MM-DD)."})
			return
		}

		_, err = dbpool.Exec(context.Background(),
			`INSERT INTO perkembangan (id_anak, tanggal_pemeriksaan, bb_kg, tb_cm, lk_cm, ll_cm, status_gizi, saran, id_kader_pencatat) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
			payload.IdAnak, tglPemeriksaan, payload.BbKg, payload.TbCm, payload.LkCm, payload.LlCm, payload.StatusGizi, payload.Saran, kaderId)

		if err != nil {
			log.Printf("ERROR inserting perkembangan by kader %d: %v", kaderId, err)
			if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23503" {
				if pgErr.ConstraintName == "perkembangan_id_anak_fkey" {
					c.JSON(http.StatusNotFound, gin.H{"error": "ID Anak tidak ditemukan."})
					return
				}
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan data perkembangan."})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"message": "Data perkembangan berhasil dicatat!"})
	}
}

// GetPerkembanganHandler menangani pengambilan daftar perkembangan
func GetPerkembanganHandler(dbpool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		var daftarPerkembangan []models.Perkembangan
		searchQuery := c.Query("search")
		idAnakQuery := c.Query("id_anak")

		baseQuery := `SELECT p.id, p.id_anak, p.tanggal_pemeriksaan, p.bb_kg, p.tb_cm, p.lk_cm, p.ll_cm, p.status_gizi, p.saran, p.id_kader_pencatat, p.created_at, p.updated_at, a.nama_anak, k.nama_lengkap AS nama_kader, a.nik_anak, i.nama_lengkap AS nama_ibu FROM perkembangan p JOIN anak a ON p.id_anak = a.id JOIN ibu i ON a.id_ibu = i.id LEFT JOIN kader k ON p.id_kader_pencatat = k.id`

		var args []interface{}
		var conditions []string
		argCounter := 1
		query := baseQuery

		if searchQuery != "" {
			conditions = append(conditions, fmt.Sprintf("(a.nama_anak ILIKE $%d OR a.nik_anak ILIKE $%d OR k.nama_lengkap ILIKE $%d OR i.nama_lengkap ILIKE $%d)", argCounter, argCounter, argCounter, argCounter))
			args = append(args, fmt.Sprintf("%%%s%%", searchQuery))
			argCounter++
		}

		if idAnakQuery != "" {
			idAnak, err := strconv.Atoi(idAnakQuery)
			if err == nil && idAnak > 0 {
				conditions = append(conditions, fmt.Sprintf("p.id_anak = $%d", argCounter))
				args = append(args, idAnak)
				argCounter++
			}
		}

		if len(conditions) > 0 {
			query += " WHERE " + strings.Join(conditions, " AND ")
		}

		query += " ORDER BY p.tanggal_pemeriksaan DESC, a.nama_anak ASC"

		rows, err := dbpool.Query(context.Background(), query, args...)
		if err != nil {
			log.Printf("ERROR querying perkembangan: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data perkembangan."})
			return
		}
		defer rows.Close()

		for rows.Next() {
			var p models.Perkembangan
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
	}
}

// GetPerkembanganByIdHandler menangani pengambilan data perkembangan berdasarkan ID
func GetPerkembanganByIdHandler(dbpool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
			return
		}

		var p models.Perkembangan
		query := `SELECT p.id, p.id_anak, p.tanggal_pemeriksaan, p.bb_kg, p.tb_cm, p.lk_cm, p.ll_cm, p.status_gizi, p.saran, p.id_kader_pencatat, p.created_at, p.updated_at, a.nama_anak, k.nama_lengkap AS nama_kader, a.nik_anak, i.nama_lengkap AS nama_ibu FROM perkembangan p JOIN anak a ON p.id_anak = a.id JOIN ibu i ON a.id_ibu = i.id LEFT JOIN kader k ON p.id_kader_pencatat = k.id WHERE p.id = $1`
		err = dbpool.QueryRow(context.Background(), query, id).Scan(&p.ID, &p.IdAnak, &p.TanggalPemeriksaan, &p.BbKg, &p.TbCm, &p.LkCm, &p.LlCm, &p.StatusGizi, &p.Saran, &p.IdKaderPencatat, &p.CreatedAt, &p.UpdatedAt, &p.NamaAnak, &p.NamaKader, &p.NikAnak, &p.NamaIbu)

		if err != nil {
			if err.Error() == "no rows in result set" {
				c.JSON(http.StatusNotFound, gin.H{"error": "Data tidak ditemukan."})
			} else {
				log.Printf("ERROR querying perkembangan by ID %d: %v", id, err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data."})
			}
			return
		}
		c.JSON(http.StatusOK, p)
	}
}

// UpdatePerkembanganHandler menangani pembaruan data perkembangan
func UpdatePerkembanganHandler(dbpool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
			return
		}

		var payload models.UpdatePerkembanganPayload
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Data tidak lengkap."})
			return
		}

		tglPemeriksaan, err := time.Parse("2006-01-02", payload.TanggalPemeriksaan)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Format tanggal salah (YYYY-MM-DD)."})
			return
		}

		_, err = dbpool.Exec(context.Background(),
			`UPDATE perkembangan SET id_anak = $1, tanggal_pemeriksaan = $2, bb_kg = $3, tb_cm = $4, lk_cm = $5, ll_cm = $6, status_gizi = $7, saran = $8, updated_at = NOW() WHERE id = $9`,
			payload.IdAnak, tglPemeriksaan, payload.BbKg, payload.TbCm, payload.LkCm, payload.LlCm, payload.StatusGizi, payload.Saran, id)

		if err != nil {
			log.Printf("ERROR updating perkembangan ID %d: %v", id, err)
			if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23503" {
				if pgErr.ConstraintName == "perkembangan_id_anak_fkey" {
					c.JSON(http.StatusNotFound, gin.H{"error": "ID Anak tidak ditemukan."})
					return
				}
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update."})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Data perkembangan berhasil diperbarui!"})
	}
}

// DeletePerkembanganHandler menangani penghapusan data perkembangan
func DeletePerkembanganHandler(dbpool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
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
	}
}
