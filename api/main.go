// main.go
package main

import (
	"log"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	// Import package baru Anda
	"github.com/nadhifhafizp/api/db"       // Sesuaikan path import
	"github.com/nadhifhafizp/api/handlers" // Sesuaikan path import
	// Jika Anda membuat package utils:
	// "github.com/nadhifhafizp/api/utils"
)

func main() {
	// --- Setup Database ---
	dbpool := db.ConnectDB() // Panggil fungsi koneksi DB
	defer dbpool.Close()     // Pastikan pool ditutup saat aplikasi berhenti

	// --- Setup Gin Router ---
	router := gin.Default()

	// --- Setup CORS ---
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"}, // Pastikan frontend Anda diizinkan
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))
	// --- Rute Publik ---
	router.POST("/api/login", handlers.LoginHandler(dbpool))

	// Rute GET Publik untuk Cek Perkembangan (dipindahkan dari grup 'authenticated')
	router.GET("/api/anak", handlers.GetAnakHandler(dbpool))                          // Untuk pencarian anak
	router.GET("/api/anak/:id", handlers.GetAnakByIdHandler(dbpool))                  // Untuk detail biodata anak
	router.GET("/api/perkembangan", handlers.GetPerkembanganHandler(dbpool))          // Untuk riwayat pemeriksaan
	router.GET("/api/riwayat-imunisasi", handlers.GetRiwayatImunisasiHandler(dbpool)) // Untuk riwayat vaksin

	// Rute registrasi kader bisa publik atau dipindah ke grup 'authenticated' jika perlu login
	// Kita anggap registrasi kader HANYA bisa dilakukan oleh kader lain yang sudah login
	// router.POST("/api/kader", handlers.RegisterKaderHandler(dbpool)) // Dihapus dari publik

	// --- Rute Terproteksi ---
	authenticated := router.Group("/api")
	authenticated.Use(handlers.AuthMiddleware()) // Gunakan middleware dari handlers
	{
		// Kader Routes
		authenticated.POST("/kader", handlers.RegisterKaderHandler(dbpool)) // Dipindah ke sini
		authenticated.GET("/kader", handlers.GetKaderHandler(dbpool))
		authenticated.PUT("/kader/:id", handlers.UpdateKaderHandler(dbpool))
		authenticated.PUT("/kader/:id/password", handlers.ChangePasswordHandler(dbpool))
		authenticated.DELETE("/kader/:id", handlers.DeleteKaderHandler(dbpool))

		// Ibu Routes
		authenticated.POST("/ibu", handlers.TambahIbuHandler(dbpool))
		authenticated.GET("/ibu", handlers.GetIbuHandler(dbpool))
		authenticated.GET("/ibu/simple", handlers.GetIbuSimpleHandler(dbpool))
		authenticated.GET("/ibu/:id", handlers.GetIbuByIdHandler(dbpool))
		authenticated.PUT("/ibu/:id", handlers.UpdateIbuHandler(dbpool))
		authenticated.DELETE("/ibu/:id", handlers.DeleteIbuHandler(dbpool))

		// Anak Routes (Hanya CUD, R sudah publik)
		authenticated.POST("/anak", handlers.TambahAnakHandler(dbpool))
		authenticated.GET("/anak/simple", handlers.GetAnakSimpleHandler(dbpool))
		// authenticated.GET("/anak", ...) // Sudah publik
		// authenticated.GET("/anak/:id", ...) // Sudah publik
		authenticated.PUT("/anak/:id", handlers.UpdateAnakHandler(dbpool))
		authenticated.DELETE("/anak/:id", handlers.DeleteAnakHandler(dbpool))

		// Perkembangan Routes (Hanya CUD, R sudah publik)
		authenticated.POST("/perkembangan", handlers.TambahPerkembanganHandler(dbpool))
		// authenticated.GET("/perkembangan", ...) // Sudah publik
		authenticated.GET("/perkembangan/:id", handlers.GetPerkembanganByIdHandler(dbpool)) // GET by ID tetap butuh auth
		authenticated.PUT("/perkembangan/:id", handlers.UpdatePerkembanganHandler(dbpool))
		authenticated.DELETE("/perkembangan/:id", handlers.DeletePerkembanganHandler(dbpool))

		// Master Imunisasi Routes (Tetap perlu Auth)
		authenticated.POST("/master-imunisasi", handlers.TambahMasterImunisasiHandler(dbpool))
		authenticated.GET("/master-imunisasi", handlers.GetMasterImunisasiHandler(dbpool))
		// Perhatikan: Menambahkan /simple di sini juga, agar konsisten
		authenticated.GET("/master-imunisasi/simple", handlers.GetMasterImunisasiSimpleHandler(dbpool))
		authenticated.GET("/master-imunisasi/:id", handlers.GetMasterImunisasiByIdHandler(dbpool))
		authenticated.PUT("/master-imunisasi/:id", handlers.UpdateMasterImunisasiHandler(dbpool))
		authenticated.DELETE("/master-imunisasi/:id", handlers.DeleteMasterImunisasiHandler(dbpool))

		// Riwayat Imunisasi Routes (Hanya CUD, R sudah publik)
		authenticated.POST("/riwayat-imunisasi", handlers.TambahRiwayatImunisasiHandler(dbpool))
		// authenticated.GET("/riwayat-imunisasi", ...) // Sudah publik
		authenticated.GET("/riwayat-imunisasi/:id", handlers.GetRiwayatImunisasiByIdHandler(dbpool)) // GET by ID tetap butuh auth
		authenticated.PUT("/riwayat-imunisasi/:id", handlers.UpdateRiwayatImunisasiHandler(dbpool))
		authenticated.DELETE("/riwayat-imunisasi/:id", handlers.DeleteRiwayatImunisasiHandler(dbpool))

		// Laporan Route
		authenticated.GET("/laporan/:tipe", handlers.GetLaporanHandler(dbpool))
	}

	// --- Jalankan Server ---
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // Default port
	}
	log.Printf("Server starting on http://localhost:%s...", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Server failed to run: %v", err)
	}
	// log.Fatal(http.ListenAndServe(":"+port, nil)) // Baris ini duplikat dengan router.Run, jadi saya komentari
}
