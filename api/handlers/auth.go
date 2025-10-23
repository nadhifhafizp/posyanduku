// handlers/auth.go
package handlers

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nadhifhafizp/api/models" // Sesuaikan path import
	"github.com/nadhifhafizp/api/utils"  // Sesuaikan path import
	"golang.org/x/crypto/bcrypt"
)

// LoginHandler handles kader login
func LoginHandler(dbpool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		var payload models.LoginPayload
		var kader models.Kader
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Username dan Password wajib diisi"})
			return
		}

		err := dbpool.QueryRow(context.Background(),
			"SELECT id, nama_lengkap, nik, no_telepon, password, username, created_at, updated_at FROM kader WHERE username = $1", payload.Username).Scan(
			&kader.ID, &kader.NamaLengkap, &kader.NIK, &kader.NoTelepon, &kader.Password, &kader.Username, &kader.CreatedAt, &kader.UpdatedAt)

		if err != nil {
			log.Printf("INFO: Login attempt failed for username %s: %v", payload.Username, err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Username atau Password salah"})
			return
		}

		err = bcrypt.CompareHashAndPassword([]byte(kader.Password), []byte(payload.Password))
		if err != nil {
			log.Printf("INFO: Invalid password for username %s", payload.Username)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Username atau Password salah"})
			return
		}

		token, err := utils.GenerateJWT(kader.ID) // Menggunakan utils.GenerateJWT
		if err != nil {
			log.Printf("ERROR generating JWT for user %s: %v", payload.Username, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses login."})
			return
		}

		log.Printf("INFO: User %s (ID: %d) logged in successfully", payload.Username, kader.ID)
		c.JSON(http.StatusOK, gin.H{
			"message": "Login berhasil!",
			"user":    gin.H{"id": kader.ID, "nama_lengkap": kader.NamaLengkap, "username": kader.Username},
			"token":   token,
		})
	}
}

// AuthMiddleware validates the JWT token
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

		token, err := jwt.ParseWithClaims(tokenString, &models.AuthClaims{}, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(secretKey), nil
		})

		if err != nil {
			log.Printf("Token validation error: %v", err)
			errorMsg := "Token tidak valid."
			if errors.Is(err, jwt.ErrTokenMalformed) {
				errorMsg = "Token tidak berformat benar."
			} else if errors.Is(err, jwt.ErrTokenExpired) || errors.Is(err, jwt.ErrTokenNotValidYet) {
				errorMsg = "Token sudah kadaluarsa atau belum aktif."
			} else if errors.Is(err, jwt.ErrTokenSignatureInvalid) {
				errorMsg = "Signature token tidak valid."
			}
			c.JSON(http.StatusUnauthorized, gin.H{"error": errorMsg})
			c.Abort()
			return
		}

		if claims, ok := token.Claims.(*models.AuthClaims); ok && token.Valid {
			c.Set("kaderId", claims.KaderID) // Simpan kaderId di context
			log.Printf("INFO: Authenticated request for Kader ID: %d", claims.KaderID)
			c.Next() // Lanjutkan ke handler berikutnya
		} else {
			log.Printf("Token claims invalid or token invalid after parsing.")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token tidak dapat diproses."})
			c.Abort()
		}
	}
}
