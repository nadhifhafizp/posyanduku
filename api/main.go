// main.go
package main

import (
	"log"
	"net/http"
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
		AllowOrigins:     []string{"https://posyanduku-frontend.vercel.app", "http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))
	// --- Rute Publik ---
	router.POST("/api/login", handlers.LoginHandler(dbpool))
	// Rute registrasi kader bisa publik atau dipindah ke grup 'authenticated' jika perlu login
	router.POST("/api/kader", handlers.RegisterKaderHandler(dbpool))

	// --- Rute Terproteksi ---
	authenticated := router.Group("/api")
	authenticated.Use(handlers.AuthMiddleware()) // Gunakan middleware dari handlers
	{
		// Kader Routes
		authenticated.GET("/kader", handlers.GetKaderHandler(dbpool))
		authenticated.PUT("/kader/:id", handlers.UpdateKaderHandler(dbpool))
		authenticated.PUT("/kader/:id/password", handlers.ChangePasswordHandler(dbpool))
		authenticated.DELETE("/kader/:id", handlers.DeleteKaderHandler(dbpool))

		// Ibu Routes
		authenticated.POST("/ibu", handlers.TambahIbuHandler(dbpool))          // Pastikan nama fungsi sesuai
		authenticated.GET("/ibu", handlers.GetIbuHandler(dbpool))              // Pastikan nama fungsi sesuai
		authenticated.GET("/ibu/simple", handlers.GetIbuSimpleHandler(dbpool)) // Pastikan nama fungsi sesuai
		authenticated.GET("/ibu/:id", handlers.GetIbuByIdHandler(dbpool))      // Pastikan nama fungsi sesuai
		authenticated.PUT("/ibu/:id", handlers.UpdateIbuHandler(dbpool))       // Pastikan nama fungsi sesuai
		authenticated.DELETE("/ibu/:id", handlers.DeleteIbuHandler(dbpool))    // Pastikan nama fungsi sesuai

		// Anak Routes
		authenticated.POST("/anak", handlers.TambahAnakHandler(dbpool))          // Pastikan nama fungsi sesuai
		authenticated.GET("/anak", handlers.GetAnakHandler(dbpool))              // Pastikan nama fungsi sesuai
		authenticated.GET("/anak/simple", handlers.GetAnakSimpleHandler(dbpool)) // Pastikan nama fungsi sesuai
		authenticated.GET("/anak/:id", handlers.GetAnakByIdHandler(dbpool))      // Pastikan nama fungsi sesuai
		authenticated.PUT("/anak/:id", handlers.UpdateAnakHandler(dbpool))       // Pastikan nama fungsi sesuai
		authenticated.DELETE("/anak/:id", handlers.DeleteAnakHandler(dbpool))    // Pastikan nama fungsi sesuai

		// Perkembangan Routes
		authenticated.POST("/perkembangan", handlers.TambahPerkembanganHandler(dbpool))       // Pastikan nama fungsi sesuai
		authenticated.GET("/perkembangan", handlers.GetPerkembanganHandler(dbpool))           // Pastikan nama fungsi sesuai
		authenticated.GET("/perkembangan/:id", handlers.GetPerkembanganByIdHandler(dbpool))   // Pastikan nama fungsi sesuai
		authenticated.PUT("/perkembangan/:id", handlers.UpdatePerkembanganHandler(dbpool))    // Pastikan nama fungsi sesuai
		authenticated.DELETE("/perkembangan/:id", handlers.DeletePerkembanganHandler(dbpool)) // Pastikan nama fungsi sesuai

		// Master Imunisasi Routes
		authenticated.POST("/master-imunisasi", handlers.TambahMasterImunisasiHandler(dbpool))       // Pastikan nama fungsi sesuai
		authenticated.GET("/master-imunisasi", handlers.GetMasterImunisasiHandler(dbpool))           // Pastikan nama fungsi sesuai
		authenticated.GET("/master-imunisasi/:id", handlers.GetMasterImunisasiByIdHandler(dbpool))   // Pastikan nama fungsi sesuai
		authenticated.PUT("/master-imunisasi/:id", handlers.UpdateMasterImunisasiHandler(dbpool))    // Pastikan nama fungsi sesuai
		authenticated.DELETE("/master-imunisasi/:id", handlers.DeleteMasterImunisasiHandler(dbpool)) // Pastikan nama fungsi sesuai

		// Riwayat Imunisasi Routes
		authenticated.POST("/riwayat-imunisasi", handlers.TambahRiwayatImunisasiHandler(dbpool))       // Pastikan nama fungsi sesuai
		authenticated.GET("/riwayat-imunisasi", handlers.GetRiwayatImunisasiHandler(dbpool))           // Pastikan nama fungsi sesuai
		authenticated.GET("/riwayat-imunisasi/:id", handlers.GetRiwayatImunisasiByIdHandler(dbpool))   // Pastikan nama fungsi sesuai
		authenticated.PUT("/riwayat-imunisasi/:id", handlers.UpdateRiwayatImunisasiHandler(dbpool))    // Pastikan nama fungsi sesuai
		authenticated.DELETE("/riwayat-imunisasi/:id", handlers.DeleteRiwayatImunisasiHandler(dbpool)) // Pastikan nama fungsi sesuai

		// Laporan Route
		authenticated.GET("/laporan/:tipe", handlers.GetLaporanHandler(dbpool)) // Pastikan nama fungsi sesuai
	}

	// --- Jalankan Server ---
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // Default port
	}
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
