package service

import (
	"encoding/json"
	"errors"
	"strings"
	"testing"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/model"
)

var contentFake = seoFake{
	posts: append([]model.BlogPost{{
		Slug: "voice", Title: "Voice <agents>", Category: "technical", Tags: []string{"voice"},
		Preview: "Latency notes.", PublishedAt: "2026-03-01T00:00:00Z",
		Content: `<h2>Why</h2><p onclick="steal()">Round trips.</p><script>alert(1)</script><iframe src="https://x"></iframe>`,
	}}, seoPosts...),
	tracks: seoTracks,
	hackathons: []model.Hackathon{
		{Date: "2026.09", Name: "Privacy Hack", City: "Paris", Country: "France", ProjectName: "HUD", ProjectURL: "https://github.com/x/hud", Result: "Agentic AI track winner"},
		{Date: "2026.05", Name: "KernelGen", IsRemote: true, ProjectName: "Kernels", Result: "1st place"},
		{Date: "2025.11", Name: "VC Hack", City: "Berlin", ProjectName: "Pitch", Result: "Finalist (VC phase)"},
		{Date: "2025.10", Name: "Game Jam", City: "Paris", ProjectName: "Debate"},
	},
	experience: []model.Experience{
		{Role: "Intern", Company: "Old Co", StartDate: "2022-07", EndDate: "2022-09", Highlights: []string{"Built models"}},
		{Role: "AI Engineer", Company: "New & Co", Location: "Paris", StartDate: "2025-03", SkillAssembled: "Shipping agents"},
	},
	skills: []model.SkillDomain{{Title: "Agent Orchestration", Skills: []string{"LangGraph", "MCP"}, BattleTested: []string{"BuzzLab"},
		Subcategories: []model.SkillSubcategory{{Name: "Voice", Skills: []string{"LiveKit"}}}}},
	soul: json.RawMessage(`{"bio":["Stored bio <b>."],"currently":"Agent Eval"}`),
}

func TestBodyProfile(t *testing.T) {
	body := NewSEOService(contentFake).Body("/files/soul/")
	for _, want := range []string{
		`<div class="prerender">`,
		"<h1>Yongkang Zou — AI Engineer in Paris</h1>",
		"<p>Stored bio &lt;b&gt;.</p>",
		"Currently: Agent Eval",
		"Languages: Chinese (native)", // default kept when the stored page omits it
		"4 hackathons, 2 wins.",       // no result and Finalist are not wins
		`<a href="https://github.com/inin-zou/Clio">Clio</a>`,
		`<a href="/files/memory/technical/voice">Voice &lt;agents&gt;</a> (2026-03-01)`,
		"MSc Computer Science",
		`<a href="mailto:yongkang.zou.ai@gmail.com">`,
		`<a href="/files/skill/hackathons">Hackathons</a>`, // site nav
	} {
		if !strings.Contains(body, want) {
			t.Errorf("profile body missing %q\n%s", want, body)
		}
	}
	if strings.Contains(body, "Old note") {
		t.Error("archived post listed on the profile")
	}
	if NewSEOService(contentFake).Body("/") != body {
		t.Error("/ and /files/soul should share the profile body")
	}
}

func TestBodyPages(t *testing.T) {
	s := NewSEOService(contentFake)
	for _, tc := range []struct {
		path string
		want []string
		not  []string
	}{
		{"/files/skill/experience", []string{"<h2>AI Engineer — New &amp; Co</h2>", "Paris · 2025-03 – Present", "<li>Built models</li>"}, nil},
		{"/files/skill/hackathons", []string{"4 hackathons, 2 wins.", `2026.09 · Privacy Hack (Paris, France) — <a href="https://github.com/x/hud">HUD</a> — Agentic AI track winner`, "KernelGen (remote)"}, nil},
		{"/files/skill", []string{"<h2>Agent Orchestration</h2>", "LangGraph, MCP, LiveKit", "Used in: BuzzLab"}, nil},
		{"/files/memory", []string{"Voice &lt;agents&gt;", "Game &#34;Jam&#34; &lt;Edition&gt;", "Latency notes."}, []string{"Old note"}},
		{"/files/memory/technical", []string{"<h1>Technical writing — Yongkang Zou</h1>", "Voice &lt;agents&gt;"}, []string{"Game &#34;Jam&#34;"}},
		{"/files/memory/technical/voice", []string{"<h1>Voice &lt;agents&gt;</h1>", "Yongkang Zou · 2026-03-01 · technical · voice", "<h2>Why</h2>", "<p>Round trips.</p>"},
			[]string{"<script", "alert(1)", "<iframe", "onclick", "steal()"}},
		{"/files/music", []string{`<a href="/files/music/soft-spot">Soft Spot</a> — Lo-Fi RnB`}, nil},
		{"/files/skill/cv", []string{"/cv/yongkang-zou-cv-en.pdf"}, nil},
	} {
		body := s.Body(tc.path)
		for _, want := range tc.want {
			if !strings.Contains(body, want) {
				t.Errorf("%s: missing %q\n%s", tc.path, want, body)
			}
		}
		for _, bad := range tc.not {
			if strings.Contains(body, bad) {
				t.Errorf("%s: should not contain %q", tc.path, bad)
			}
		}
	}
}

func TestBodyEmptyWhenNothingToShow(t *testing.T) {
	s := NewSEOService(contentFake)
	for _, path := range []string{"/files/admin", "/files/soul/graph", "/files/memory/guestbook", "/nope", "/files/memory/technical/missing"} {
		if body := s.Body(path); body != "" {
			t.Errorf("%s: want no body, got %q", path, body)
		}
	}
	broken := NewSEOService(seoFake{err: errors.New("down")})
	if body := broken.Body("/files/skill/experience"); body != "" {
		t.Errorf("failed lookups should render nothing, got %q", body)
	}
	if body := broken.Body("/files/soul"); !strings.Contains(body, "BFS -&gt; DFS") {
		t.Errorf("profile should fall back to the default bio, got %q", body)
	}
}

func TestLLMs(t *testing.T) {
	out := string(NewSEOService(contentFake).LLMs())
	for _, want := range []string{
		"# Yongkang Zou\n\n> AI Engineer in Paris.",
		"Stored bio <b>.",
		"- Hackathons: 4, with 2 wins",
		"- [GitHub](https://github.com/inin-zou)",
		"- [Codex Privacy HUD](https://github.com/inin-zou/codex-privacy-hud): ",
		"- [Voice <agents>](https://yongkang.dev/files/memory/technical/voice) (2026-03-01): Latency notes.",
		"## Optional",
	} {
		if !strings.Contains(out, want) {
			t.Errorf("llms.txt missing %q\n%s", want, out)
		}
	}
	if strings.Contains(out, "Old note") {
		t.Error("archived post in llms.txt")
	}
}
