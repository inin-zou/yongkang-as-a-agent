package app

import (
	"reflect"
	"testing"
)

func TestLoadConfig(t *testing.T) {
	for _, key := range []string{"PORT", "DATA_DIR", "FRONTEND_URL", "ADMIN_EMAIL", "DATABASE_URL", "SUPABASE_URL", "SUPABASE_ANON_KEY", "GEMINI_API_KEY", "GITHUB_TOKEN", "INDEX_HTML_URL"} {
		t.Setenv(key, "")
	}
	local := Config{Port: "8080", DataDir: "./data", FrontendURL: "http://localhost:5173", AdminEmail: "yongkang.zou.ai@gmail.com",
		IndexHTMLFiles: []string{"../frontend/dist/index.html", "frontend/dist/index.html"}}
	vercel := local
	vercel.DataDir = ""
	vercel.FrontendURL = "*"
	vercel.IndexHTMLFiles = []string{"frontend/dist/index.html", "/var/task/frontend/dist/index.html"}
	vercel.IndexHTMLURL = "https://yongkang.dev/index.html"
	for mode, want := range map[Mode]Config{Local: local, Vercel: vercel} {
		if got := LoadConfig(mode); !reflect.DeepEqual(got, want) {
			t.Errorf("mode %d: got %+v, want %+v", mode, got, want)
		}
	}
	t.Setenv("DATA_DIR", "custom-data")
	t.Setenv("FRONTEND_URL", "https://example.com")
	t.Setenv("PORT", "18080")
	local.DataDir = "custom-data"
	local.FrontendURL = "https://example.com"
	local.Port = "18080"
	vercel.FrontendURL = local.FrontendURL
	vercel.Port = local.Port
	for mode, want := range map[Mode]Config{Local: local, Vercel: vercel} {
		if got := LoadConfig(mode); !reflect.DeepEqual(got, want) {
			t.Errorf("mode %d overrides: got %+v, want %+v", mode, got, want)
		}
	}
}
