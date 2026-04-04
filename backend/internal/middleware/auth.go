package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// contextKey is an unexported type for context keys in this package.
type contextKey string

const userEmailKey contextKey = "userEmail"

// UserEmailFromContext extracts the authenticated user's email from the request context.
func UserEmailFromContext(ctx context.Context) string {
	if v, ok := ctx.Value(userEmailKey).(string); ok {
		return v
	}
	return ""
}

// supabaseUserResponse is the shape of the JSON returned by Supabase's /auth/v1/user endpoint.
type supabaseUserResponse struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}

// AdminOnly returns middleware that verifies the request carries a valid Supabase
// access token belonging to the admin user identified by adminEmail.
//
// It calls Supabase's /auth/v1/user endpoint to validate the token and extract the
// user's email. If the token is missing or invalid the handler responds with 401;
// if the email does not match adminEmail it responds with 403.
func AdminOnly(supabaseURL, anonKey, adminEmail string) func(http.Handler) http.Handler {
	// Trim trailing slash once so callers don't have to worry about it.
	supabaseURL = strings.TrimRight(supabaseURL, "/")

	client := &http.Client{Timeout: 10 * time.Second}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Extract Bearer token.
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				writeAuthError(w, http.StatusUnauthorized, "missing authorization header")
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
				writeAuthError(w, http.StatusUnauthorized, "invalid authorization header format")
				return
			}
			token := parts[1]

			// Verify token with Supabase.
			email, err := verifyToken(client, supabaseURL, anonKey, token)
			if err != nil {
				writeAuthError(w, http.StatusUnauthorized, fmt.Sprintf("invalid token: %v", err))
				return
			}

			// Check admin email.
			if !strings.EqualFold(email, adminEmail) {
				writeAuthError(w, http.StatusForbidden, "admin access required")
				return
			}

			// Store email in context and continue.
			ctx := context.WithValue(r.Context(), userEmailKey, email)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// verifyToken calls Supabase's /auth/v1/user to validate the access token and
// returns the user's email on success.
func verifyToken(client *http.Client, supabaseURL, anonKey, token string) (string, error) {
	req, err := http.NewRequest(http.MethodGet, supabaseURL+"/auth/v1/user", nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("apikey", anonKey)

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to reach Supabase: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("supabase returned status %d", resp.StatusCode)
	}

	var user supabaseUserResponse
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	if user.Email == "" {
		return "", fmt.Errorf("no email in token")
	}

	return user.Email, nil
}

// writeAuthError writes a JSON error response for auth middleware.
func writeAuthError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}
