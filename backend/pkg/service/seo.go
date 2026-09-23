package service

import (
	"bytes"
	"encoding/xml"
	"fmt"
	"net/http"
	"regexp"
	"sort"
	"strings"
	"unicode/utf8"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/model"
)

// SiteURL is the canonical origin for every URL the SEO layer emits.
const SiteURL = "https://yongkang.dev"

// DefaultDescription is the site-wide description; frontend/index.html carries
// the same text as its static default.
const DefaultDescription = "AI Engineer in Paris. My way of learning: BFS → DFS — try everything that interests me, then build solid projects real users depend on."

// DefaultImage is the Open Graph card rendered from frontend/og/og-card.html.
const DefaultImage = SiteURL + "/og-image.png"

// Person is the author entity shared by the page JSON-LD. The static copy in
// frontend/index.html must describe the same person.
var Person = map[string]any{
	"@type":         "Person",
	"name":          "Yongkang Zou",
	"alternateName": "inhibitor",
	"jobTitle":      "AI Engineer",
	"url":           SiteURL,
}

// SEOContent is what the SEO layer needs to know which pages exist.
type SEOContent interface {
	GetBlogPosts() ([]model.BlogPost, error)
	GetMusicTracks() ([]model.MusicTrack, error)
}

// PageMeta is the head of one page.
type PageMeta struct {
	Title       string
	Description string
	Canonical   string
	Image       string
	Type        string // "website" or "article"
	NoIndex     bool
	JSONLD      map[string]any // optional page-specific structured data
}

// PageResolution says how the server should answer a page URL.
type PageResolution struct {
	Status   int    // 200, 301 or 404
	Location string // redirect target for 301
	Meta     PageMeta
}

// SEOService maps URLs to page metadata and builds the sitemap.
type SEOService struct {
	content SEOContent
}

// NewSEOService creates the SEO service.
func NewSEOService(content SEOContent) *SEOService {
	return &SEOService{content: content}
}

// Writing categories the MEMORY.md page always recognises, even without posts.
var memoryCategories = []string{"hackathon", "technical", "research"}

func page(title, description, path string) PageMeta {
	if description == "" {
		description = DefaultDescription
	}
	return PageMeta{Title: title, Description: description, Canonical: SiteURL + path, Image: DefaultImage, Type: "website"}
}

func redirect(to string) PageResolution {
	return PageResolution{Status: http.StatusMovedPermanently, Location: to}
}

func notFound(path string) PageResolution {
	meta := page("Not found — Yongkang Zou", "", path)
	meta.NoIndex = true
	return PageResolution{Status: http.StatusNotFound, Meta: meta}
}

func ok(meta PageMeta) PageResolution {
	return PageResolution{Status: http.StatusOK, Meta: meta}
}

// Resolve classifies a page path (no query string) the same way the SPA router
// does: known pages are 200, the SPA's legacy redirects are 301, anything the
// app would only bounce away from is 404.
func (s *SEOService) Resolve(path string) PageResolution {
	if path != "/" {
		path = strings.TrimRight(path, "/")
	}
	parts := strings.Split(strings.TrimPrefix(path, "/"), "/")

	switch {
	case path == "/":
		return ok(page("Yongkang Zou — AI Engineer", "", "/"))
	case path == "/lab/intro":
		meta := page("Journey — Yongkang Zou", "", path)
		meta.NoIndex = true
		return ok(meta)
	case path == "/admin":
		return redirect("/files/admin")
	case path == "/files":
		return redirect("/files/soul")
	case parts[0] != "files" || len(parts) > 4:
		return notFound(path)
	}

	tab := parts[1]
	item, sub := "", ""
	if len(parts) > 2 {
		item = parts[2]
	}
	if len(parts) > 3 {
		sub = parts[3]
	}

	switch tab {
	case "soul":
		return s.resolveSoul(path, item, sub)
	case "skill":
		return resolveSkill(path, item, sub)
	case "memory":
		return s.resolveMemory(path, item, sub)
	case "music":
		return s.resolveMusic(path, item, sub)
	case "contact":
		switch {
		case item == "" && sub == "":
			return ok(page("Contact — Yongkang Zou", "Email, GitHub and LinkedIn, or leave a message.", path))
		case item == "message" && sub == "":
			return ok(page("Leave a message — Yongkang Zou", "Send Yongkang Zou a message.", path))
		}
	case "admin":
		meta := page("Admin — yongkang.dev", "", path)
		meta.NoIndex = true
		return ok(meta)
	}
	return notFound(path)
}

func (s *SEOService) resolveSoul(path, item, sub string) PageResolution {
	if sub != "" {
		return notFound(path)
	}
	switch item {
	case "":
		return ok(page("Yongkang Zou — AI Engineer", "", path))
	case "graph":
		return ok(page("KnowledgeGraph — Yongkang Zou", "A force-directed map of the skills, tools, companies and hackathons behind Yongkang Zou's work.", path))
	case "commits":
		return ok(page("Commits — Yongkang Zou", "Yongkang Zou's GitHub contribution activity.", path))
	case "projects":
		return redirect("/files/soul#work")
	case "journey", "in-progress":
		return redirect("/files/soul")
	}
	return notFound(path)
}

func resolveSkill(path, item, sub string) PageResolution {
	if sub != "" {
		return notFound(path)
	}
	switch item {
	case "":
		return ok(page("Skills — Yongkang Zou", "Skill domains, tools and the projects that tested them.", path))
	case "experience":
		return ok(page("Experience — Yongkang Zou", "Where Yongkang Zou has worked, and what shipped there.", path))
	case "cv":
		return ok(page("CV — Yongkang Zou", "Yongkang Zou's CV in English and Chinese, as PDF and LaTeX source.", path))
	case "hackathons":
		return ok(page("Hackathons — Yongkang Zou", "Hackathons Yongkang Zou has built at, and what came out of them.", path))
	case "resume":
		return redirect("/files/skill/experience")
	}
	return notFound(path)
}

func (s *SEOService) resolveMemory(path, item, sub string) PageResolution {
	switch {
	case item == "":
		return ok(page("Writing — Yongkang Zou", "Notes on agents, research and hackathons by Yongkang Zou.", path))
	case item == "guestbook" && sub == "":
		return ok(page("Guestbook — Yongkang Zou", "Notes left by visitors, signed with GitHub.", path))
	case item == "feedback" && sub == "":
		return redirect("/files/memory/guestbook")
	}

	posts, err := s.content.GetBlogPosts()
	if err != nil {
		// Unknown is not missing: never 404 a page because the lookup failed.
		return ok(page("Writing — Yongkang Zou", "", path))
	}
	if sub != "" {
		for _, p := range posts {
			if p.Slug != sub {
				continue
			}
			if p.Category != item {
				return redirect(postPath(p))
			}
			return ok(postMeta(p))
		}
		return notFound(path)
	}

	if isCategory(item, posts) {
		return ok(page(titleCase(item)+" writing — Yongkang Zou", "", path))
	}
	// Legacy direct post URLs (/files/memory/<slug>) move to their category path.
	for _, p := range posts {
		if p.Slug == item {
			return redirect(postPath(p))
		}
	}
	return notFound(path)
}

func (s *SEOService) resolveMusic(path, item, sub string) PageResolution {
	if sub != "" {
		return notFound(path)
	}
	if item == "" {
		return ok(page("Music — inhibitor", "inhibitor: alternative RnB and lo-fi, written and sung by Yongkang Zou.", path))
	}
	tracks, err := s.content.GetMusicTracks()
	if err != nil {
		return ok(page("Music — inhibitor", "", path))
	}
	for _, t := range tracks {
		if t.Slug == item {
			desc := "A track by inhibitor (Yongkang Zou)."
			if t.Genre != "" {
				desc = t.Genre + ". " + desc
			}
			return ok(page(t.Name+" — inhibitor", desc, path))
		}
	}
	return notFound(path)
}

func isCategory(item string, posts []model.BlogPost) bool {
	for _, c := range memoryCategories {
		if c == item {
			return true
		}
	}
	for _, p := range posts {
		if p.Category == item {
			return true
		}
	}
	return false
}

func postPath(p model.BlogPost) string {
	return "/files/memory/" + p.Category + "/" + p.Slug
}

var firstImage = regexp.MustCompile(`(?i)<img[^>]+src=["'](https://[^"']+)["']`)

func postMeta(p model.BlogPost) PageMeta {
	meta := page(p.Title+" — Yongkang Zou", truncate(p.Preview, 200), postPath(p))
	meta.Type = "article"
	if m := firstImage.FindStringSubmatch(p.Content); m != nil {
		meta.Image = m[1]
	}
	article := map[string]any{
		"@context":         "https://schema.org",
		"@type":            "BlogPosting",
		"headline":         p.Title,
		"description":      meta.Description,
		"url":              meta.Canonical,
		"mainEntityOfPage": meta.Canonical,
		"image":            meta.Image,
		"author":           Person,
	}
	if d := dateOnly(p.PublishedAt); d != "" {
		article["datePublished"] = d
	}
	if d := dateOnly(p.UpdatedAt); d != "" {
		article["dateModified"] = d
	}
	meta.JSONLD = article
	return meta
}

func dateOnly(ts string) string {
	if len(ts) >= 10 {
		return ts[:10]
	}
	return ""
}

func truncate(s string, max int) string {
	s = strings.Join(strings.Fields(s), " ")
	if utf8.RuneCountInString(s) <= max {
		return s
	}
	r := []rune(s)[:max-1]
	return strings.TrimRight(string(r), " ,.;:") + "…"
}

func titleCase(s string) string {
	if s == "" {
		return s
	}
	return strings.ToUpper(s[:1]) + s[1:]
}

type sitemapURL struct {
	Loc     string `xml:"loc"`
	LastMod string `xml:"lastmod,omitempty"`
}

type urlSet struct {
	XMLName xml.Name     `xml:"urlset"`
	Xmlns   string       `xml:"xmlns,attr"`
	URLs    []sitemapURL `xml:"url"`
}

// Sitemap lists every public page: the fixed pages, writing categories and
// non-archived posts (with lastmod), and music tracks. Admin is excluded.
func (s *SEOService) Sitemap() ([]byte, error) {
	posts, err := s.content.GetBlogPosts()
	if err != nil {
		return nil, fmt.Errorf("sitemap posts: %w", err)
	}
	tracks, err := s.content.GetMusicTracks()
	if err != nil {
		return nil, fmt.Errorf("sitemap tracks: %w", err)
	}

	fixed := []string{
		"/", "/files/soul", "/files/soul/graph", "/files/soul/commits",
		"/files/memory", "/files/memory/guestbook",
		"/files/music",
		"/files/skill", "/files/skill/experience", "/files/skill/cv", "/files/skill/hackathons",
		"/files/contact",
	}
	set := urlSet{Xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9"}
	for _, p := range fixed {
		set.URLs = append(set.URLs, sitemapURL{Loc: SiteURL + p})
	}

	categories := map[string]bool{}
	var live []model.BlogPost
	for _, p := range posts {
		if p.Archived {
			continue
		}
		categories[p.Category] = true
		live = append(live, p)
	}
	names := make([]string, 0, len(categories))
	for c := range categories {
		names = append(names, c)
	}
	sort.Strings(names)
	for _, c := range names {
		set.URLs = append(set.URLs, sitemapURL{Loc: SiteURL + "/files/memory/" + c})
	}
	for _, p := range live {
		mod := dateOnly(p.UpdatedAt)
		if mod == "" {
			mod = dateOnly(p.PublishedAt)
		}
		set.URLs = append(set.URLs, sitemapURL{Loc: SiteURL + postPath(p), LastMod: mod})
	}
	for _, t := range tracks {
		set.URLs = append(set.URLs, sitemapURL{Loc: SiteURL + "/files/music/" + t.Slug})
	}

	var buf bytes.Buffer
	buf.WriteString(xml.Header)
	enc := xml.NewEncoder(&buf)
	enc.Indent("", "  ")
	if err := enc.Encode(set); err != nil {
		return nil, fmt.Errorf("sitemap encode: %w", err)
	}
	buf.WriteString("\n")
	return buf.Bytes(), nil
}
