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
	// Where the built SPA shell (frontend/dist/index.html) is read from for
	// server-rendered page heads: bundled files first, then IndexHTMLURL.
	IndexHTMLFiles []string
	IndexHTMLURL   string
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
	}
	if mode == Vercel {
		cfg.FrontendURL = envOrDefault("FRONTEND_URL", "*")
		// vercel.json bundles frontend/dist/index.html with the function.
		cfg.IndexHTMLFiles = []string{"frontend/dist/index.html", "/var/task/frontend/dist/index.html"}
		cfg.IndexHTMLURL = envOrDefault("INDEX_HTML_URL", "https://yongkang.dev/index.html")
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
