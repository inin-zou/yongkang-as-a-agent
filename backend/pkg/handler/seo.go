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
	"path"
	"strings"
	"sync"
	"time"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/service"
)

// SEOPages resolves page URLs and builds the sitemap.
type SEOPages interface {
	Resolve(path string) service.PageResolution
	Sitemap() ([]byte, error)
	Body(path string) string
	LLMs() []byte
}

// CrawlRecorder counts pages served to known crawlers.
type CrawlRecorder interface {
	RecordCrawl(path, userAgent, country string) error
}

// SEOHandler serves sitemap.xml and every SPA page URL with its own <head>.
type SEOHandler struct {
	pages    SEOPages
	template *PageTemplate
	crawls   CrawlRecorder
}

// RecordCrawlsTo counts every page, sitemap and llms.txt served to a crawler.
// People are counted by the SPA instead (POST /api/track).
func (h *SEOHandler) RecordCrawlsTo(c CrawlRecorder) *SEOHandler {
	h.crawls = c
	return h
}

func (h *SEOHandler) recordCrawl(r *http.Request) {
	if h.crawls == nil || r.Method != http.MethodGet {
		return
	}
	if err := h.crawls.RecordCrawl(r.URL.Path, r.UserAgent(), r.Header.Get("X-Vercel-Ip-Country")); err != nil {
		log.Printf("record crawl: %v", err)
	}
}

// NewSEOHandler creates the SEO handler.
func NewSEOHandler(pages SEOPages, template *PageTemplate) *SEOHandler {
	return &SEOHandler{pages: pages, template: template}
}

// HandleSitemap serves /sitemap.xml.
func (h *SEOHandler) HandleSitemap(w http.ResponseWriter, r *http.Request) {
	h.recordCrawl(r)
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

// HandleLLMs serves /llms.txt, a Markdown summary of the site for AI agents.
func (h *SEOHandler) HandleLLMs(w http.ResponseWriter, r *http.Request) {
	h.recordCrawl(r)
	setCDNCache(w, 3600, 600)
	w.Header().Set("Content-Type", "text/markdown; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(h.pages.LLMs())
}

// HandlePage answers a page URL: 301 for the SPA's legacy redirects, otherwise
// the SPA shell with that page's title, description, canonical, Open Graph,
// Twitter and JSON-LD, and 404 for paths the app does not have.
func (h *SEOHandler) HandlePage(w http.ResponseWriter, r *http.Request) {
	res := h.pages.Resolve(r.URL.Path)
	if !res.Meta.NoIndex || res.Status == http.StatusNotFound {
		h.recordCrawl(r)
	}
	if res.Status == http.StatusMovedPermanently {
		to := res.Location
		if r.URL.RawQuery != "" && !strings.Contains(to, "#") {
			to += "?" + r.URL.RawQuery
		}
		setCDNCache(w, 3600, 600)
		http.Redirect(w, r, to, http.StatusMovedPermanently)
		return
	}

	if res.Status == http.StatusOK && !res.Meta.NoIndex && r.Method != http.MethodHead {
		res.Meta.Body = h.pages.Body(r.URL.Path)
	}
	tpl, err := h.template.Load(r)
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
	seoStart     = "<!-- seo:start -->"
	seoEnd       = "<!-- seo:end -->"
	contentStart = "<!-- content:start -->"
	contentEnd   = "<!-- content:end -->"
)

// RenderPage replaces the block between the seo markers in the SPA shell with
// the page's head tags, and the block between the content markers (inside
// #root) with its crawler-readable body. Missing markers are left alone.
func RenderPage(tpl string, meta service.PageMeta) string {
	tpl = replaceBetween(tpl, seoStart, seoEnd, "\n"+HeadTags(meta)+"    ")
	return replaceBetween(tpl, contentStart, contentEnd, meta.Body)
}

func replaceBetween(s, startMarker, endMarker, with string) string {
	start := strings.Index(s, startMarker)
	end := strings.Index(s, endMarker)
	if start < 0 || end < start {
		return s
	}
	return s[:start+len(startMarker)] + with + s[end:]
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
		"  </head>\n  <body>\n" + meta.Body + "\n    <script>fetch('/index.html',{cache:'no-store'}).then(function(r){return r.text()}).then(function(t){document.open();document.write(t);document.close()})</script>\n  </body>\n</html>\n"
}

// PageTemplate loads the built SPA shell (frontend/dist/index.html).
//
// On Vercel the Go function is built separately from the frontend, so the shell
// can't be bundled with it. Instead it is fetched from the host the visitor
// used: that host's /index.html is a static file of the very deployment
// serving this function, so the asset hashes always match, even right after a
// deploy. Preview deployments are protected, so the visitor's Vercel auth
// cookie / bypass header is forwarded. Only allow-listed hosts are fetched.
// Local files (dev) win when present.
type PageTemplate struct {
	files  []string
	hosts  []string // path.Match patterns, e.g. "yongkang-as-a-agent-*.vercel.app"
	scheme string
	client *http.Client
	ttl    time.Duration

	mu     sync.Mutex
	file   string
	byHost map[string]cachedShell
}

type cachedShell struct {
	body      string
	fetchedAt time.Time
}

// NewPageTemplate tries files in order, then the request host if it matches hosts.
func NewPageTemplate(files, hosts []string) *PageTemplate {
	return &PageTemplate{files: files, hosts: hosts, scheme: "https", client: &http.Client{Timeout: 3 * time.Second},
		ttl: time.Minute, byHost: map[string]cachedShell{}}
}

// NewStaticPageTemplate serves a fixed shell (tests).
func NewStaticPageTemplate(tpl string) *PageTemplate {
	return &PageTemplate{file: tpl}
}

// Load returns the SPA shell for this request.
func (t *PageTemplate) Load(r *http.Request) (string, error) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.file != "" {
		return t.file, nil
	}
	for _, f := range t.files {
		if data, err := os.ReadFile(f); err == nil && isShell(string(data)) {
			t.file = string(data)
			log.Printf("page template: file %s", f)
			return t.file, nil
		}
	}

	host := r.Host
	if !t.allowed(host) {
		return "", fmt.Errorf("no shell file and host %q is not allow-listed", host)
	}
	cached, ok := t.byHost[host]
	if ok && time.Since(cached.fetchedAt) < t.ttl {
		return cached.body, nil
	}
	body, err := t.fetch(host, r)
	if err != nil {
		if ok {
			return cached.body, nil // stale beats nothing
		}
		return "", err
	}
	t.byHost[host] = cachedShell{body: body, fetchedAt: time.Now()}
	return body, nil
}

func (t *PageTemplate) allowed(host string) bool {
	for _, pattern := range t.hosts {
		if ok, _ := path.Match(pattern, host); ok {
			return true
		}
	}
	return false
}

func (t *PageTemplate) fetch(host string, r *http.Request) (string, error) {
	req, err := http.NewRequest(http.MethodGet, t.scheme+"://"+host+"/index.html", nil)
	if err != nil {
		return "", err
	}
	// Protected preview deployments: pass the visitor's own access through.
	for _, h := range []string{"Cookie", "X-Vercel-Protection-Bypass"} {
		if v := r.Header.Get(h); v != "" {
			req.Header.Set(h, v)
		}
	}
	resp, err := t.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("fetch shell: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("fetch shell: status %d", resp.StatusCode)
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return "", fmt.Errorf("fetch shell: %w", err)
	}
	if !isShell(string(data)) {
		return "", errors.New("fetch shell: not the SPA shell")
	}
	return string(data), nil
}

func isShell(s string) bool {
	return strings.Contains(s, `<div id="root">`)
}
