// utils/jwt.go
package utils

import (
	"log"
	"os"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/nadhifhafizp/api/models" // Sesuaikan path import
)

// GenerateJWT creates a new JWT token for a kader
func GenerateJWT(kaderID int) (string, error) {
	secretKey := os.Getenv("JWT_SECRET_KEY")
	if secretKey == "" {
		log.Println("WARNING: JWT_SECRET_KEY environment variable is not set. Using default insecure key for development.")
		secretKey = "rahasia-banget-jangan-disebar" // Ganti di production
	}

	claims := models.AuthClaims{ // Menggunakan models.AuthClaims
		KaderID: kaderID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour * 24)), // Token berlaku 24 jam
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "posyanduku-api",
			Subject:   strconv.Itoa(kaderID),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secretKey))
}
