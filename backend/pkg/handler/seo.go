package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/service"
)

// SEOPages resolves page URLs and builds the sitemap.
type SEOPages interface {
	Resolve(path string) service.PageResolution
	Sitemap() ([]byte, error)
}

// SEOHandler serves sitemap.xml and every SPA page URL with its own <head>.
type SEOHandler struct {
	pages    SEOPages
	template *PageTemplate
}

// NewSEOHandler creates the SEO handler.
func NewSEOHandler(pages SEOPages, template *PageTemplate) *SEOHandler {
	return &SEOHandler{pages: pages, template: template}
}

// HandleSitemap serves /sitemap.xml.
func (h *SEOHandler) HandleSitemap(w http.ResponseWriter, r *http.Request) {
	body, err := h.pages.Sitemap()
	if err != nil {
		log.Printf("sitemap: %v", err)
		http.Error(w, "sitemap unavailable", http.StatusServiceUnavailable)
		return
	}
	setCDNCache(w, 3600, 600)
	w.Header().Set("Content-Type", "application/xml; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(body)
}

// HandlePage answers a page URL: 301 for the SPA's legacy redirects, otherwise
// the SPA shell with that page's title, description, canonical, Open Graph,
// Twitter and JSON-LD, and 404 for paths the app does not have.
func (h *SEOHandler) HandlePage(w http.ResponseWriter, r *http.Request) {
	res := h.pages.Resolve(r.URL.Path)
	if res.Status == http.StatusMovedPermanently {
		to := res.Location
		if r.URL.RawQuery != "" && !strings.Contains(to, "#") {
			to += "?" + r.URL.RawQuery
		}
		setCDNCache(w, 3600, 600)
		http.Redirect(w, r, to, http.StatusMovedPermanently)
		return
	}

	tpl, err := h.template.Load()
	var body string
	if err != nil {
		// Last resort: a working page without the prebuilt shell. Never cached,
		// so the next request can pick the real template up again.
		log.Printf("page template unavailable, serving loader shell: %v", err)
		body = loaderShell(res.Meta)
		w.Header().Set("Cache-Control", "no-store")
	} else {
		body = RenderPage(tpl, res.Meta)
		if res.Status == http.StatusOK {
			setCDNCache(w, 300, 3600)
		} else {
			setCDNCache(w, 60, 60)
		}
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(res.Status)
	if r.Method != http.MethodHead {
		_, _ = io.WriteString(w, body)
	}
}

// setCDNCache lets Vercel's edge cache a response briefly while browsers always
// revalidate (HTML must never outlive the deployment's hashed assets).
func setCDNCache(w http.ResponseWriter, sMaxAge, swr int) {
	cdn := fmt.Sprintf("public, s-maxage=%d, stale-while-revalidate=%d", sMaxAge, swr)
	w.Header().Set("Vercel-CDN-Cache-Control", cdn)
	w.Header().Set("CDN-Cache-Control", cdn)
	w.Header().Set("Cache-Control", "public, max-age=0, must-revalidate")
}

const (
	seoStart = "<!-- seo:start -->"
	seoEnd   = "<!-- seo:end -->"
)

// RenderPage replaces the block between the seo markers in the SPA shell with
// the page's head tags. A shell without markers is returned unchanged.
func RenderPage(tpl string, meta service.PageMeta) string {
	start := strings.Index(tpl, seoStart)
	end := strings.Index(tpl, seoEnd)
	if start < 0 || end < start {
		return tpl
	}
	return tpl[:start+len(seoStart)] + "\n" + HeadTags(meta) + "    " + tpl[end:]
}

// HeadTags renders the per-page head block. Every value is HTML-escaped; JSON-LD
// goes through encoding/json, which escapes <, > and & inside strings.
func HeadTags(meta service.PageMeta) string {
	e := html.EscapeString
	var b strings.Builder
	line := func(format string, args ...any) {
		b.WriteString("    ")
		fmt.Fprintf(&b, format, args...)
		b.WriteString("\n")
	}
	line("<title>%s</title>", e(meta.Title))
	line(`<meta name="description" content="%s" />`, e(meta.Description))
	line(`<link rel="canonical" href="%s" />`, e(meta.Canonical))
	if meta.NoIndex {
		line(`<meta name="robots" content="noindex" />`)
	}
	line(`<meta property="og:type" content="%s" />`, e(meta.Type))
	line(`<meta property="og:site_name" content="Yongkang Zou" />`)
	line(`<meta property="og:title" content="%s" />`, e(meta.Title))
	line(`<meta property="og:description" content="%s" />`, e(meta.Description))
	line(`<meta property="og:url" content="%s" />`, e(meta.Canonical))
	line(`<meta property="og:image" content="%s" />`, e(meta.Image))
	if meta.Image == service.DefaultImage {
		line(`<meta property="og:image:width" content="1200" />`)
		line(`<meta property="og:image:height" content="630" />`)
		line(`<meta property="og:image:alt" content="Yongkang Zou — AI Engineer, Paris" />`)
	}
	line(`<meta name="twitter:card" content="summary_large_image" />`)
	line(`<meta name="twitter:title" content="%s" />`, e(meta.Title))
	line(`<meta name="twitter:description" content="%s" />`, e(meta.Description))
	line(`<meta name="twitter:image" content="%s" />`, e(meta.Image))
	if meta.JSONLD != nil {
		if data, err := json.Marshal(meta.JSONLD); err == nil {
			line(`<script type="application/ld+json">%s</script>`, data)
		}
	}
	return b.String()
}

// loaderShell is served only when no SPA shell can be loaded: it carries the
// page head for crawlers and pulls the real shell in for people.
func loaderShell(meta service.PageMeta) string {
	return "<!doctype html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"UTF-8\" />\n" +
		HeadTags(meta) +
		"  </head>\n  <body>\n    <script>fetch('/index.html',{cache:'no-store'}).then(function(r){return r.text()}).then(function(t){document.open();document.write(t);document.close()})</script>\n  </body>\n</html>\n"
}

// PageTemplate loads the built SPA shell (frontend/dist/index.html). Bundled
// files win and are cached for the life of the instance; the URL fallback is
// re-fetched every minute so it can't outlive a deployment's asset hashes.
type PageTemplate struct {
	files  []string
	url    string
	client *http.Client
	ttl    time.Duration

	mu        sync.Mutex
	cached    string
	permanent bool
	fetchedAt time.Time
	logged    bool
}

// NewPageTemplate tries files in order, then url (may be empty).
func NewPageTemplate(files []string, url string) *PageTemplate {
	return &PageTemplate{files: files, url: url, client: &http.Client{Timeout: 3 * time.Second}, ttl: time.Minute}
}

// NewStaticPageTemplate serves a fixed shell (tests).
func NewStaticPageTemplate(tpl string) *PageTemplate {
	return &PageTemplate{cached: tpl, permanent: true}
}

// Load returns the SPA shell.
func (t *PageTemplate) Load() (string, error) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.permanent {
		return t.cached, nil
	}
	for _, f := range t.files {
		data, err := os.ReadFile(f)
		if err == nil && isShell(string(data)) {
			t.cached, t.permanent = string(data), true
			log.Printf("page template: bundled file %s", f)
			return t.cached, nil
		}
	}
	if t.cached != "" && time.Since(t.fetchedAt) < t.ttl {
		return t.cached, nil
	}
	if t.url == "" {
		return "", errors.New("no bundled index.html and no fallback URL")
	}
	body, err := t.fetch()
	if err != nil {
		if t.cached != "" {
			return t.cached, nil // stale beats nothing
		}
		return "", err
	}
	t.cached, t.fetchedAt = body, time.Now()
	if !t.logged {
		log.Printf("page template: fetched %s", t.url)
		t.logged = true
	}
	return body, nil
}

func (t *PageTemplate) fetch() (string, error) {
	resp, err := t.client.Get(t.url)
	if err != nil {
		return "", fmt.Errorf("fetch index.html: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("fetch index.html: status %d", resp.StatusCode)
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return "", fmt.Errorf("fetch index.html: %w", err)
	}
	if !isShell(string(data)) {
		return "", errors.New("fetch index.html: not the SPA shell")
	}
	return string(data), nil
}

func isShell(s string) bool {
	return strings.Contains(s, `<div id="root">`)
}
