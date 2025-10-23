// handlers/laporan.go
package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nadhifhafizp/api/models" // Sesuaikan path import
)

// GetLaporanHandler menangani pengambilan data laporan berdasarkan tipe dan filter tanggal
func GetLaporanHandler(dbpool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		tipeLaporan := c.Param("tipe")
		tanggalMulai := c.Query("start") // YYYY-MM-DD
		tanggalAkhir := c.Query("end")   // YYYY-MM-DD

		var startDate, endDate time.Time
		var errStart, errEnd error
		layout := "2006-01-02"

		if tanggalMulai != "" {
			startDate, errStart = time.Parse(layout, tanggalMulai)
		}
		if tanggalAkhir != "" {
			// Tambahkan 1 hari ke tanggal akhir agar inklusif sampai akhir hari tersebut
			endDate, errEnd = time.Parse(layout, tanggalAkhir)
			if errEnd == nil {
				endDate = endDate.AddDate(0, 0, 1) // Menjadi awal hari berikutnya
			}
		}

		if errStart != nil || errEnd != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Format tanggal tidak valid (YYYY-MM-DD)"})
			return
		}
		log.Printf("Fetching report type: %s, Start: %s, End: %s", tipeLaporan, tanggalMulai, tanggalAkhir)

		switch tipeLaporan {
		case "wali":
			handleLaporanWali(c, dbpool, startDate, endDate)
		case "anak":
			handleLaporanAnak(c, dbpool, startDate, endDate)
		case "perkembangan":
			handleLaporanPerkembangan(c, dbpool, startDate, endDate)
		case "imunisasi":
			handleLaporanImunisasi(c, dbpool, startDate, endDate)
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Tipe laporan tidak valid."})
		}
	}
}

// handleLaporanWali mengambil data laporan wali
func handleLaporanWali(c *gin.Context, dbpool *pgxpool.Pool, startDate, endDate time.Time) {
	var daftarIbu []models.Ibu
	query := `SELECT id, nama_lengkap, nik, no_telepon, alamat, id_kader_pendaftar, created_at, updated_at FROM ibu`
	var args []interface{}
	var conditions []string
	argCounter := 1

	// Filter berdasarkan created_at
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
	query += " ORDER BY created_at DESC" // Urutkan berdasarkan tanggal daftar terbaru

	rows, err := dbpool.Query(context.Background(), query, args...)
	if err != nil {
		log.Printf("ERROR querying report ibu: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data."})
		return
	}
	defer rows.Close()

	for rows.Next() {
		var i models.Ibu
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
}

// handleLaporanAnak mengambil data laporan anak
func handleLaporanAnak(c *gin.Context, dbpool *pgxpool.Pool, startDate, endDate time.Time) {
	var daftarAnak []models.Anak
	query := `SELECT a.id, a.id_ibu, a.nama_anak, a.nik_anak, a.tanggal_lahir, a.jenis_kelamin, a.anak_ke, a.berat_lahir_kg, a.tinggi_lahir_cm, a.created_at, a.updated_at, i.nama_lengkap AS nama_ibu FROM anak a LEFT JOIN ibu i ON a.id_ibu = i.id`
	var args []interface{}
	var conditions []string
	argCounter := 1

	// Filter berdasarkan created_at
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
	query += " ORDER BY a.created_at DESC" // Urutkan berdasarkan tanggal daftar terbaru

	rows, err := dbpool.Query(context.Background(), query, args...)
	if err != nil {
		log.Printf("ERROR querying report anak: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data."})
		return
	}
	defer rows.Close()

	for rows.Next() {
		var a models.Anak
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
}

// handleLaporanPerkembangan mengambil data laporan perkembangan
func handleLaporanPerkembangan(c *gin.Context, dbpool *pgxpool.Pool, startDate, endDate time.Time) {
	var daftarPerkembangan []models.LaporanPerkembangan // Menggunakan struct LaporanPerkembangan
	query := `SELECT
                p.id, p.id_anak, p.tanggal_pemeriksaan, p.bb_kg, p.tb_cm, p.lk_cm, p.ll_cm,
                p.status_gizi, p.saran, p.id_kader_pencatat, p.created_at, p.updated_at,
                a.nama_anak, k.nama_lengkap AS nama_kader, a.nik_anak, i.nama_lengkap AS nama_ibu,
                i.nik AS nik_ibu
            FROM perkembangan p
            JOIN anak a ON p.id_anak = a.id
            JOIN ibu i ON a.id_ibu = i.id
            LEFT JOIN kader k ON p.id_kader_pencatat = k.id`
	var args []interface{}
	var conditions []string
	argCounter := 1

	// Filter berdasarkan tanggal_pemeriksaan
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
		var p models.LaporanPerkembangan // Gunakan struct baru
		// Sesuaikan Scan untuk menyertakan nik_ibu di akhir
		if err := rows.Scan(
			&p.ID, &p.IdAnak, &p.TanggalPemeriksaan, &p.BbKg, &p.TbCm, &p.LkCm, &p.LlCm,
			&p.StatusGizi, &p.Saran, &p.IdKaderPencatat, &p.CreatedAt, &p.UpdatedAt,
			&p.NamaAnak, &p.NamaKader, &p.NikAnak, &p.NamaIbu,
			&p.NikIbu, // Scan NIK Ibu
		); err != nil {
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
}

// handleLaporanImunisasi mengambil data laporan imunisasi
func handleLaporanImunisasi(c *gin.Context, dbpool *pgxpool.Pool, startDate, endDate time.Time) {
	var daftarImunisasi []models.LaporanImunisasi // Menggunakan struct LaporanImunisasi
	query := `SELECT
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

	// Filter berdasarkan tanggal_imunisasi
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
		var r models.LaporanImunisasi // Gunakan struct baru
		if err := rows.Scan(
			&r.ID, &r.IdAnak, &r.IdMasterImunisasi, &r.IdKaderPencatat, &r.IdKaderUpdater,
			&r.TanggalDiberikan, &r.Catatan, &r.CreatedAt, &r.UpdatedAt,
			&r.NamaAnak, &r.NikAnak,
			&r.NamaImunisasi,
			&r.NamaKader, &r.NamaKaderUpdater,
		); err != nil {
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
}
