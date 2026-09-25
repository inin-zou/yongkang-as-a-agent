package app

import "os"

// Mode selects the existing entry point's defaults.
type Mode int

const (
	Local Mode = iota
	Vercel
)

// Config contains application configuration. DataDir is empty for embedded data.
type Config struct {
	Port            string
	DataDir         string
	FrontendURL     string
	AdminEmail      string
	DatabaseURL     string
	SupabaseURL     string
	SupabaseAnonKey string
	GeminiAPIKey    string
	GitHubToken     string
	// TrafficSalt keys the daily visitor hash (TRAFFIC_SALT, else the secret
	// DATABASE_URL), so hashes can't be reversed to IP addresses.
	TrafficSalt string
	// Where the built SPA shell (frontend/dist/index.html) comes from for
	// server-rendered page heads: local files first, then /index.html on the
	// request's host when it matches ShellHosts (path.Match patterns).
	IndexHTMLFiles []string
	ShellHosts     []string
}

// LoadConfig reads environment variables in one place while preserving each
// entry point's CORS and fallback-data defaults. Vercel ignores DATA_DIR.
func LoadConfig(mode Mode) Config {
	cfg := Config{
		Port:            envOrDefault("PORT", "8080"),
		AdminEmail:      envOrDefault("ADMIN_EMAIL", "yongkang.zou.ai@gmail.com"),
		DatabaseURL:     os.Getenv("DATABASE_URL"),
		SupabaseURL:     os.Getenv("SUPABASE_URL"),
		SupabaseAnonKey: os.Getenv("SUPABASE_ANON_KEY"),
		GeminiAPIKey:    os.Getenv("GEMINI_API_KEY"),
		GitHubToken:     os.Getenv("GITHUB_TOKEN"),
		TrafficSalt:     envOrDefault("TRAFFIC_SALT", os.Getenv("DATABASE_URL")),
	}
	if mode == Vercel {
		cfg.FrontendURL = envOrDefault("FRONTEND_URL", "*")
		cfg.ShellHosts = []string{"yongkang.dev", "www.yongkang.dev", "yongkang-as-a-agent-*.vercel.app"}
	} else {
		cfg.IndexHTMLFiles = []string{"../frontend/dist/index.html", "frontend/dist/index.html"}
		cfg.FrontendURL = envOrDefault("FRONTEND_URL", "http://localhost:5173")
		cfg.DataDir = envOrDefault("DATA_DIR", "./data")
	}
	return cfg
}

func envOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
