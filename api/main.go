package main

import (
	"log"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"github.com/nadhifhafizp/api/db"
	"github.com/nadhifhafizp/api/handlers"
)

func main() {
	// --- Setup Database ---
	dbpool := db.ConnectDB()
	defer dbpool.Close()

	// --- Setup Gin Router ---
	router := gin.Default()

	// --- Setup CORS ---
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// --- Rute Publik ---
	router.POST("/api/login", handlers.LoginHandler(dbpool))
	router.GET("/api/anak", handlers.GetAnakHandler(dbpool))
	router.GET("/api/anak/:id", handlers.GetAnakByIdHandler(dbpool))
	router.GET("/api/perkembangan", handlers.GetPerkembanganHandler(dbpool))
	router.GET("/api/riwayat-imunisasi", handlers.GetRiwayatImunisasiHandler(dbpool))

	// --- Rute Terproteksi ---
	authenticated := router.Group("/api")
	authenticated.Use(handlers.AuthMiddleware())
	{
		// Kader Routes
		authenticated.POST("/kader", handlers.RegisterKaderHandler(dbpool))
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

		// Anak Routes
		authenticated.POST("/anak", handlers.TambahAnakHandler(dbpool))
		authenticated.GET("/anak/simple", handlers.GetAnakSimpleHandler(dbpool))
		authenticated.PUT("/anak/:id", handlers.UpdateAnakHandler(dbpool))
		authenticated.DELETE("/anak/:id", handlers.DeleteAnakHandler(dbpool))

		// Perkembangan Routes
		authenticated.POST("/perkembangan", handlers.TambahPerkembanganHandler(dbpool))
		authenticated.GET("/perkembangan/:id", handlers.GetPerkembanganByIdHandler(dbpool))
		authenticated.PUT("/perkembangan/:id", handlers.UpdatePerkembanganHandler(dbpool))
		authenticated.DELETE("/perkembangan/:id", handlers.DeletePerkembanganHandler(dbpool))

		// Master Imunisasi Routes
		authenticated.POST("/master-imunisasi", handlers.TambahMasterImunisasiHandler(dbpool))
		authenticated.GET("/master-imunisasi", handlers.GetMasterImunisasiHandler(dbpool))
		authenticated.GET("/master-imunisasi/simple", handlers.GetMasterImunisasiSimpleHandler(dbpool))
		authenticated.GET("/master-imunisasi/:id", handlers.GetMasterImunisasiByIdHandler(dbpool))
		authenticated.PUT("/master-imunisasi/:id", handlers.UpdateMasterImunisasiHandler(dbpool))
		authenticated.DELETE("/master-imunisasi/:id", handlers.DeleteMasterImunisasiHandler(dbpool))

		// Riwayat Imunisasi Routes
		authenticated.POST("/riwayat-imunisasi", handlers.TambahRiwayatImunisasiHandler(dbpool))
		authenticated.GET("/riwayat-imunisasi/:id", handlers.GetRiwayatImunisasiByIdHandler(dbpool))
		authenticated.PUT("/riwayat-imunisasi/:id", handlers.UpdateRiwayatImunisasiHandler(dbpool))
		authenticated.DELETE("/riwayat-imunisasi/:id", handlers.DeleteRiwayatImunisasiHandler(dbpool))

		// Laporan Route
		authenticated.GET("/laporan/:tipe", handlers.GetLaporanHandler(dbpool))
	}

	// --- Jalankan Server ---
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Server starting on http://localhost:%s...", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Server failed to run: %v", err)
	}
}
