package app

import (
	"net/http"
	"net/http/httptest"
	"reflect"
	"sort"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
)

// This literal snapshot is the union of the original entry points.
var wantRoutes = []string{
	"DELETE /api/admin/comments/{id}",
	"DELETE /api/admin/experience/{id}",
	"DELETE /api/admin/feedback/{id}",
	"DELETE /api/admin/hackathons/{id}",
	"DELETE /api/admin/music-tracks/{id}",
	"DELETE /api/admin/posts/{id}",
	"DELETE /api/admin/project-statuses/{id}",
	"DELETE /api/admin/skills/{id}",
	"GET /api/admin/feedback",
	"GET /api/admin/notifications",
	"GET /api/admin/notifications/unread",
	"GET /api/experience",
	"GET /api/github-contributions",
	"GET /api/guestbook",
	"GET /api/hackathons",
	"GET /api/health",
	"GET /api/music",
	"GET /api/music-tracks",
	"GET /api/pages/{id}",
	"GET /api/posts",
	"GET /api/posts/{slug}",
	"GET /api/posts/{slug}/comments",
	"GET /api/posts/{slug}/stats",
	"GET /api/project-statuses",
	"GET /api/projects",
	"GET /api/projects/{slug}",
	"GET /api/skills",
	"GET /api/views",
	"POST /api/admin/experience",
	"POST /api/admin/generate-draft",
	"POST /api/admin/hackathons",
	"POST /api/admin/music-tracks",
	"POST /api/admin/posts",
	"POST /api/admin/project-statuses",
	"POST /api/admin/refine-draft",
	"POST /api/admin/skills",
	"POST /api/contact",
	"POST /api/feedback",
	"POST /api/guestbook",
	"POST /api/posts/{slug}/comments",
	"POST /api/posts/{slug}/like",
	"PUT /api/admin/experience/{id}",
	"PUT /api/admin/hackathons/{id}",
	"PUT /api/admin/music-tracks/{id}",
	"PUT /api/admin/notifications/read-all",
	"PUT /api/admin/notifications/{id}/read",
	"PUT /api/admin/pages/{id}",
	"PUT /api/admin/posts/{id}",
	"PUT /api/admin/posts/{id}/archive",
	"PUT /api/admin/project-statuses/{id}",
	"PUT /api/admin/skills/{id}",
}

func TestRateLimits(t *testing.T) {
	h, closeApp := New(Config{})
	defer closeApp()
	for _, tc := range []struct {
		path  string
		limit int
	}{
		{"/api/posts/example/like", 30},
		{"/api/posts/example/comments", 20},
		{"/api/contact", 3},
		{"/api/feedback", 10},
		{"/api/guestbook", 10},
	} {
		t.Run(tc.path, func(t *testing.T) {
			for i := 0; i <= tc.limit; i++ {
				w := httptest.NewRecorder()
				req := httptest.NewRequest(http.MethodPost, tc.path, strings.NewReader("{}"))
				req.RemoteAddr = "192.0.2.1:1234"
				h.ServeHTTP(w, req)
				if got, want := w.Code == http.StatusTooManyRequests, i == tc.limit; got != want {
					t.Fatalf("request %d: status %d, rate limited want %v", i+1, w.Code, want)
				}
			}
		})
	}
}

func TestCORSAndFallback(t *testing.T) {
	for _, cfg := range []Config{
		{FrontendURL: "*"},
		{FrontendURL: "http://localhost:5173", DataDir: "../../data"},
		{FrontendURL: "https://example.com"},
	} {
		h, closeApp := New(cfg)
		defer closeApp()
		for _, tc := range []struct {
			method, path string
			status       int
		}{
			{http.MethodGet, "/api/health", http.StatusOK},
			{http.MethodGet, "/api/skills", http.StatusOK},
			{http.MethodOptions, "/api/admin/refine-draft", http.StatusNoContent},
		} {
			w := httptest.NewRecorder()
			h.ServeHTTP(w, httptest.NewRequest(tc.method, tc.path, nil))
			if w.Code != tc.status {
				t.Errorf("%s %s: got %d, want %d", tc.method, tc.path, w.Code, tc.status)
			}
			if got := w.Header().Get("Access-Control-Allow-Origin"); got != cfg.FrontendURL {
				t.Errorf("CORS origin = %q, want %q", got, cfg.FrontendURL)
			}
		}
	}
}

func TestRouteTable(t *testing.T) {
	for _, dataDir := range []string{"", "../../data"} {
		t.Run("dataDir="+dataDir, func(t *testing.T) {
			h, closeApp := New(Config{DataDir: dataDir})
			defer closeApp()
			var got []string
			err := chi.Walk(h.(chi.Routes), func(method, path string, handler http.Handler, middlewares ...func(http.Handler) http.Handler) error {
				got = append(got, method+" "+path)
				if strings.HasPrefix(path, "/api/admin/") {
					w := httptest.NewRecorder()
					h.ServeHTTP(w, httptest.NewRequest(method, path, nil))
					if w.Code != http.StatusUnauthorized {
						t.Errorf("%s %s: unauthenticated status = %d", method, path, w.Code)
					}
				}
				return nil
			})
			if err != nil {
				t.Fatal(err)
			}
			sort.Strings(got)
			if !reflect.DeepEqual(got, wantRoutes) {
				t.Fatalf("route table mismatch\n got: %v\nwant: %v", got, wantRoutes)
			}
		})
	}
}
