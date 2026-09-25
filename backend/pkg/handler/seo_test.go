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
func (seoContent) GetHackathons() ([]model.Hackathon, error)   { return nil, nil }
func (seoContent) GetExperience() ([]model.Experience, error)  { return nil, nil }
func (seoContent) GetSkills() ([]model.SkillDomain, error)     { return nil, nil }
func (seoContent) GetPage(string) (json.RawMessage, error)     { return nil, nil }

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
	var gotCookie, gotBypass, gotPath string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fetches++
		gotCookie, gotBypass, gotPath = r.Header.Get("Cookie"), r.Header.Get("X-Vercel-Protection-Bypass"), r.URL.Path
		_, _ = w.Write([]byte(strings.Replace(shell, "index-abc", "index-remote", 1)))
	}))
	defer srv.Close()
	host := strings.TrimPrefix(srv.URL, "http://")
	req := func() *http.Request {
		r := httptest.NewRequest(http.MethodGet, "/files/soul", nil)
		r.Host = host
		r.Header.Set("Cookie", "_vercel_jwt=abc")
		r.Header.Set("X-Vercel-Protection-Bypass", "secret")
		return r
	}

	// A local file wins and never hits the network.
	got, err := NewPageTemplate([]string{filepath.Join(dir, "missing.html"), file}, []string{"*"}).Load(req())
	if err != nil || !strings.Contains(got, "index-abc") || fetches != 0 {
		t.Fatalf("file: err=%v fetches=%d", err, fetches)
	}

	// Otherwise the request host's /index.html, with the visitor's access forwarded.
	tpl := NewPageTemplate(nil, []string{"127.0.0.1:*"})
	tpl.scheme = "http"
	for i := 0; i < 3; i++ {
		if got, err = tpl.Load(req()); err != nil || !strings.Contains(got, "index-remote") {
			t.Fatalf("host fetch: %v", err)
		}
	}
	if fetches != 1 || gotPath != "/index.html" || gotCookie != "_vercel_jwt=abc" || gotBypass != "secret" {
		t.Fatalf("fetches=%d path=%q cookie=%q bypass=%q", fetches, gotPath, gotCookie, gotBypass)
	}
	entry := tpl.byHost[host]
	entry.fetchedAt = time.Now().Add(-2 * time.Minute)
	tpl.byHost[host] = entry
	if _, err = tpl.Load(req()); err != nil || fetches != 2 {
		t.Fatalf("refresh after TTL: err=%v fetches=%d", err, fetches)
	}

	// A failing host keeps serving the last good copy.
	srv.Close()
	entry = tpl.byHost[host]
	entry.fetchedAt = time.Now().Add(-2 * time.Minute)
	tpl.byHost[host] = entry
	if got, err = tpl.Load(req()); err != nil || !strings.Contains(got, "index-remote") {
		t.Fatalf("stale fallback: %v", err)
	}

	// Hosts outside the allow-list are never fetched.
	evil := httptest.NewRequest(http.MethodGet, "/files/soul", nil)
	evil.Host = "attacker.example"
	if _, err := NewPageTemplate(nil, []string{"yongkang.dev", "yongkang-as-a-agent-*.vercel.app"}).Load(evil); err == nil {
		t.Fatal("non-allow-listed host must not be fetched")
	}
}

func TestHandlePageLoaderShellWhenNoTemplate(t *testing.T) {
	h := seoServer(NewPageTemplate(nil, []string{"yongkang.dev"}))
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/files/soul", nil)
	r.Host = "localhost:1"
	h.HandlePage(w, r)
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

const shellWithContent = `<!doctype html>
<html lang="en">
  <head>
    <!-- seo:start -->
    <title>Default</title>
    <!-- seo:end -->
  </head>
  <body><div id="root"><!-- content:start --><!-- content:end --></div><script type="module" src="/assets/index-abc.js"></script></body>
</html>`

func TestHandlePagePutsContentInRoot(t *testing.T) {
	h := seoServer(NewStaticPageTemplate(shellWithContent))
	get := func(path string) string {
		w := httptest.NewRecorder()
		h.HandlePage(w, httptest.NewRequest(http.MethodGet, path, nil))
		return w.Body.String()
	}

	body := get("/files/memory/hackathon/jam")
	root := regexp.MustCompile(`(?s)<div id="root"><!-- content:start -->(.*)<!-- content:end --></div>`).FindStringSubmatch(body)
	if root == nil || !strings.Contains(root[1], `<div class="prerender">`) {
		t.Fatalf("post content not inside #root:\n%s", body)
	}
	if strings.Contains(root[1], "<script>alert(1)</script>") || !strings.Contains(root[1], "<h1>Say &#34;hi&#34; &lt;/title&gt;&lt;script&gt;") {
		t.Fatalf("post title not escaped in content:\n%s", root[1])
	}

	for _, path := range []string{"/definitely/not/here", "/files/admin"} {
		if b := get(path); !strings.Contains(b, `<div id="root"><!-- content:start --><!-- content:end --></div>`) {
			t.Fatalf("%s: 404 and noindex pages must not carry content:\n%s", path, b)
		}
	}
}

func TestHandleLLMs(t *testing.T) {
	w := httptest.NewRecorder()
	seoServer(NewStaticPageTemplate(shell)).HandleLLMs(w, httptest.NewRequest(http.MethodGet, "/llms.txt", nil))
	if w.Code != 200 || w.Header().Get("Content-Type") != "text/markdown; charset=utf-8" {
		t.Fatalf("llms.txt: %d %q", w.Code, w.Header().Get("Content-Type"))
	}
	if !strings.HasPrefix(w.Body.String(), "# Yongkang Zou\n") || !strings.Contains(w.Body.String(), "https://yongkang.dev/files/memory/hackathon/jam") {
		t.Fatalf("llms.txt body:\n%s", w.Body.String())
	}
}
