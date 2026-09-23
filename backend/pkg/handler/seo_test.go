package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
	"time"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/model"
	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/service"
)

const shell = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <!-- seo:start -->
    <title>Default</title>
    <!-- seo:end -->
    <script type="application/ld+json">{"@type":"Person"}</script>
  </head>
  <body><div id="root"></div><script type="module" src="/assets/index-abc.js"></script></body>
</html>`

type seoContent struct{}

func (seoContent) GetBlogPosts() ([]model.BlogPost, error) {
	return []model.BlogPost{{Slug: "jam", Title: `Say "hi" </title><script>alert(1)</script>`, Category: "hackathon",
		Preview: `a & b <i>`, PublishedAt: "2025-01-28T00:00:00Z"}}, nil
}
func (seoContent) GetMusicTracks() ([]model.MusicTrack, error) { return nil, nil }

func seoServer(tpl *PageTemplate) *SEOHandler {
	return NewSEOHandler(service.NewSEOService(seoContent{}), tpl)
}

func TestHandlePageStatusesAndHead(t *testing.T) {
	h := seoServer(NewStaticPageTemplate(shell))
	for _, tc := range []struct {
		path     string
		status   int
		location string
	}{
		{"/files/soul", 200, ""},
		{"/files/memory/hackathon/jam", 200, ""},
		{"/files/skill/resume?x=1", 301, "/files/skill/experience?x=1"},
		{"/files/soul/projects", 301, "/files/soul#work"},
		{"/definitely/not/here", 404, ""},
	} {
		w := httptest.NewRecorder()
		h.HandlePage(w, httptest.NewRequest(http.MethodGet, tc.path, nil))
		if w.Code != tc.status || w.Header().Get("Location") != tc.location {
			t.Fatalf("%s: got %d %q", tc.path, w.Code, w.Header().Get("Location"))
		}
		if tc.status == 301 {
			continue
		}
		body := w.Body.String()
		if !strings.Contains(body, `<div id="root"></div>`) || !strings.Contains(body, `/assets/index-abc.js`) {
			t.Fatalf("%s: SPA shell not preserved", tc.path)
		}
		if strings.Contains(body, "<title>Default</title>") || strings.Count(body, "<title>") != 1 {
			t.Fatalf("%s: default head not replaced:\n%s", tc.path, body)
		}
		if !strings.Contains(body, `{"@type":"Person"}`) {
			t.Fatalf("%s: static Person JSON-LD lost", tc.path)
		}
		if w.Header().Get("Cache-Control") != "public, max-age=0, must-revalidate" {
			t.Fatalf("%s: browser cache %q", tc.path, w.Header().Get("Cache-Control"))
		}
		if noindex := strings.Contains(body, `content="noindex"`); noindex != (tc.status == 404) {
			t.Fatalf("%s: noindex=%v", tc.path, noindex)
		}
	}
}

func TestHeadTagsEscapeAndJSONLD(t *testing.T) {
	h := seoServer(NewStaticPageTemplate(shell))
	w := httptest.NewRecorder()
	h.HandlePage(w, httptest.NewRequest(http.MethodGet, "/files/memory/hackathon/jam", nil))
	body := w.Body.String()
	if strings.Contains(body, "<script>alert(1)</script>") || strings.Contains(body, `"hi" </title>`) {
		t.Fatalf("unescaped title:\n%s", body)
	}
	if !strings.Contains(body, `content="a &amp; b &lt;i&gt;"`) {
		t.Fatalf("description not escaped:\n%s", body)
	}
	if !strings.Contains(body, `<meta property="og:type" content="article" />`) {
		t.Fatal("post must be og:type article")
	}
	m := regexp.MustCompile(`<script type="application/ld\+json">(\{"@context".*?)</script>`).FindStringSubmatch(body)
	if m == nil {
		t.Fatalf("BlogPosting JSON-LD missing:\n%s", body)
	}
	if strings.Contains(m[1], "</") {
		t.Fatal("JSON-LD must not contain a raw </")
	}
	var doc map[string]any
	if err := json.Unmarshal([]byte(m[1]), &doc); err != nil {
		t.Fatalf("JSON-LD invalid: %v", err)
	}
	if doc["@type"] != "BlogPosting" || doc["datePublished"] != "2025-01-28" {
		t.Fatalf("JSON-LD: %v", doc)
	}
}

func TestHandlePageHeadHasNoBody(t *testing.T) {
	w := httptest.NewRecorder()
	seoServer(NewStaticPageTemplate(shell)).HandlePage(w, httptest.NewRequest(http.MethodHead, "/files/soul", nil))
	if w.Code != 200 || w.Body.Len() != 0 {
		t.Fatalf("HEAD: %d, %d bytes", w.Code, w.Body.Len())
	}
}

func TestPageTemplateSources(t *testing.T) {
	dir := t.TempDir()
	file := filepath.Join(dir, "index.html")
	if err := os.WriteFile(file, []byte(shell), 0o600); err != nil {
		t.Fatal(err)
	}
	fetches := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fetches++
		_, _ = w.Write([]byte(strings.Replace(shell, "index-abc", "index-remote", 1)))
	}))
	defer srv.Close()

	// A bundled file wins and never hits the network.
	got, err := NewPageTemplate([]string{filepath.Join(dir, "missing.html"), file}, srv.URL).Load()
	if err != nil || !strings.Contains(got, "index-abc") || fetches != 0 {
		t.Fatalf("bundled: err=%v fetches=%d", err, fetches)
	}

	// Without a file the URL is fetched, cached, and refreshed after the TTL.
	tpl := NewPageTemplate([]string{filepath.Join(dir, "missing.html")}, srv.URL)
	for i := 0; i < 3; i++ {
		if got, err = tpl.Load(); err != nil || !strings.Contains(got, "index-remote") {
			t.Fatalf("remote: %v", err)
		}
	}
	if fetches != 1 {
		t.Fatalf("fetches = %d, want 1 within the TTL", fetches)
	}
	tpl.fetchedAt = time.Now().Add(-2 * time.Minute)
	if _, err = tpl.Load(); err != nil || fetches != 2 {
		t.Fatalf("refresh: err=%v fetches=%d", err, fetches)
	}

	// A failing URL keeps serving the last good copy.
	srv.Close()
	tpl.fetchedAt = time.Now().Add(-2 * time.Minute)
	if got, err = tpl.Load(); err != nil || !strings.Contains(got, "index-remote") {
		t.Fatalf("stale fallback: %v", err)
	}
}

func TestHandlePageLoaderShellWhenNoTemplate(t *testing.T) {
	h := seoServer(NewPageTemplate(nil, "http://127.0.0.1:1/index.html"))
	w := httptest.NewRecorder()
	h.HandlePage(w, httptest.NewRequest(http.MethodGet, "/files/soul", nil))
	body := w.Body.String()
	if w.Code != 200 || w.Header().Get("Cache-Control") != "no-store" ||
		!strings.Contains(body, "fetch('/index.html'") || !strings.Contains(body, "<title>Yongkang Zou — AI Engineer</title>") {
		t.Fatalf("loader shell: %d %q\n%s", w.Code, w.Header().Get("Cache-Control"), body)
	}
}

func TestHandleSitemap(t *testing.T) {
	w := httptest.NewRecorder()
	seoServer(NewStaticPageTemplate(shell)).HandleSitemap(w, httptest.NewRequest(http.MethodGet, "/sitemap.xml", nil))
	if w.Code != 200 || !strings.HasPrefix(w.Header().Get("Content-Type"), "application/xml") ||
		!strings.Contains(w.Body.String(), "<loc>https://yongkang.dev/files/memory/hackathon/jam</loc>") {
		t.Fatalf("sitemap: %d %s\n%s", w.Code, w.Header().Get("Content-Type"), w.Body.String())
	}
}
