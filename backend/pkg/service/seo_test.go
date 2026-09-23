package service

import (
	"encoding/xml"
	"errors"
	"net/http"
	"strings"
	"testing"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/model"
)

type seoFake struct {
	posts  []model.BlogPost
	tracks []model.MusicTrack
	err    error
}

func (f seoFake) GetBlogPosts() ([]model.BlogPost, error)     { return f.posts, f.err }
func (f seoFake) GetMusicTracks() ([]model.MusicTrack, error) { return f.tracks, f.err }

var seoPosts = []model.BlogPost{
	{Slug: "game-jam", Title: `Game "Jam" <Edition>`, Category: "hackathon", Preview: "We built a debate game.",
		Content: `<p>x</p><img src="https://cdn.example.com/a.png">`, PublishedAt: "2025-01-28T00:00:00Z", UpdatedAt: "2026-04-11T00:00:00Z"},
	{Slug: "old-note", Title: "Old note", Category: "technical", Archived: true, PublishedAt: "2024-05-01T00:00:00Z"},
	{Slug: "essay", Title: "Essay", Category: "essays", PublishedAt: "2026-02-02T00:00:00Z"},
}

var seoTracks = []model.MusicTrack{{Slug: "soft-spot", Name: "Soft Spot", Genre: "Lo-Fi RnB"}}

func TestResolveStatuses(t *testing.T) {
	s := NewSEOService(seoFake{posts: seoPosts, tracks: seoTracks})
	for _, tc := range []struct {
		path, location string
		status         int
	}{
		{"/", "", 200},
		{"/files/soul", "", 200},
		{"/files/soul/", "", 200},
		{"/files/soul/graph", "", 200},
		{"/files/soul/commits", "", 200},
		{"/files/soul/projects", "/files/soul#work", 301},
		{"/files/soul/journey", "/files/soul", 301},
		{"/files/soul/in-progress", "/files/soul", 301},
		{"/files/soul/nope", "", 404},
		{"/files", "/files/soul", 301},
		{"/admin", "/files/admin", 301},
		{"/files/admin", "", 200},
		{"/files/admin/posts", "", 200},
		{"/files/skill", "", 200},
		{"/files/skill/cv", "", 200},
		{"/files/skill/experience", "", 200},
		{"/files/skill/hackathons", "", 200},
		{"/files/skill/resume", "/files/skill/experience", 301},
		{"/files/skill/nope", "", 404},
		{"/files/memory", "", 200},
		{"/files/memory/guestbook", "", 200},
		{"/files/memory/feedback", "/files/memory/guestbook", 301},
		{"/files/memory/hackathon", "", 200},
		{"/files/memory/research", "", 200}, // known category, even with no posts
		{"/files/memory/essays", "", 200},   // category that exists only in data
		{"/files/memory/hackathon/game-jam", "", 200},
		{"/files/memory/technical/old-note", "", 200}, // archived posts stay reachable
		{"/files/memory/research/game-jam", "/files/memory/hackathon/game-jam", 301},
		{"/files/memory/game-jam", "/files/memory/hackathon/game-jam", 301},
		{"/files/memory/hackathon/missing", "", 404},
		{"/files/memory/nope", "", 404},
		{"/files/music", "", 200},
		{"/files/music/soft-spot", "", 200},
		{"/files/music/missing", "", 404},
		{"/files/contact", "", 200},
		{"/files/contact/message", "", 200},
		{"/files/contact/nope", "", 404},
		{"/files/nope", "", 404},
		{"/lab/intro", "", 200},
		{"/wp-login.php", "", 404},
		{"/files/soul/graph/x/y", "", 404},
	} {
		got := s.Resolve(tc.path)
		if got.Status != tc.status || got.Location != tc.location {
			t.Errorf("%s: got %d %q, want %d %q", tc.path, got.Status, got.Location, tc.status, tc.location)
		}
		if got.Status == http.StatusNotFound && !got.Meta.NoIndex {
			t.Errorf("%s: 404 must be noindex", tc.path)
		}
	}
}

func TestResolveMeta(t *testing.T) {
	s := NewSEOService(seoFake{posts: seoPosts, tracks: seoTracks})

	post := s.Resolve("/files/memory/hackathon/game-jam").Meta
	if post.Title != `Game "Jam" <Edition> — Yongkang Zou` || post.Type != "article" ||
		post.Canonical != "https://yongkang.dev/files/memory/hackathon/game-jam" ||
		post.Description != "We built a debate game." || post.Image != "https://cdn.example.com/a.png" {
		t.Fatalf("post meta: %+v", post)
	}
	if post.JSONLD["@type"] != "BlogPosting" || post.JSONLD["datePublished"] != "2025-01-28" || post.JSONLD["dateModified"] != "2026-04-11" {
		t.Fatalf("post JSON-LD: %+v", post.JSONLD)
	}

	track := s.Resolve("/files/music/soft-spot").Meta
	if track.Title != "Soft Spot — inhibitor" || !strings.HasPrefix(track.Description, "Lo-Fi RnB.") {
		t.Fatalf("track meta: %+v", track)
	}
	if home := s.Resolve("/files/soul").Meta; home.Description != DefaultDescription || home.Image != DefaultImage {
		t.Fatalf("soul meta: %+v", home)
	}
	if admin := s.Resolve("/files/admin").Meta; !admin.NoIndex {
		t.Fatal("admin must be noindex")
	}
}

func TestResolveFailsOpenWhenDataIsUnavailable(t *testing.T) {
	s := NewSEOService(seoFake{err: errors.New("db down")})
	for _, path := range []string{"/files/memory/hackathon/game-jam", "/files/memory/whatever", "/files/music/soft-spot"} {
		if got := s.Resolve(path); got.Status != http.StatusOK {
			t.Errorf("%s: got %d, want 200 while the lookup fails", path, got.Status)
		}
	}
}

func TestTruncate(t *testing.T) {
	long := strings.Repeat("word ", 100)
	got := truncate(long, 40)
	if len([]rune(got)) > 40 || !strings.HasSuffix(got, "…") {
		t.Fatalf("truncate: %q", got)
	}
	if truncate("  short\n text ", 40) != "short text" {
		t.Fatal("whitespace not collapsed")
	}
}

func TestSitemap(t *testing.T) {
	body, err := NewSEOService(seoFake{posts: seoPosts, tracks: seoTracks}).Sitemap()
	if err != nil {
		t.Fatal(err)
	}
	var set struct {
		URLs []struct {
			Loc     string `xml:"loc"`
			LastMod string `xml:"lastmod"`
		} `xml:"url"`
	}
	if err := xml.Unmarshal(body, &set); err != nil {
		t.Fatalf("invalid XML: %v\n%s", err, body)
	}
	locs := map[string]string{}
	for _, u := range set.URLs {
		locs[u.Loc] = u.LastMod
	}
	for loc, mod := range map[string]string{
		"https://yongkang.dev/":                                "",
		"https://yongkang.dev/files/soul":                      "",
		"https://yongkang.dev/files/skill/cv":                  "",
		"https://yongkang.dev/files/memory/hackathon":          "",
		"https://yongkang.dev/files/memory/essays":             "",
		"https://yongkang.dev/files/memory/hackathon/game-jam": "2026-04-11",
		"https://yongkang.dev/files/memory/essays/essay":       "2026-02-02",
		"https://yongkang.dev/files/music/soft-spot":           "",
	} {
		got, present := locs[loc]
		if !present || got != mod {
			t.Errorf("%s: present=%v lastmod=%q want %q", loc, present, got, mod)
		}
	}
	for loc := range locs {
		if strings.Contains(loc, "old-note") || strings.Contains(loc, "/files/memory/technical") || strings.Contains(loc, "admin") {
			t.Errorf("sitemap must not list %s", loc)
		}
	}
}
