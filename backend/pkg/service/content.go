package service

import (
	"encoding/json"
	"fmt"
	"html"
	"regexp"
	"sort"
	"strings"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/model"
)

// Crawler-readable page content.
//
// Non-JS clients (search crawlers, AI agents' fetch tools, link unfurlers)
// only ever see the SPA shell. Body renders the facts a page shows as plain
// semantic HTML; the handler puts it inside #root, where React replaces it on
// mount, so people never see it. LLMs renders the same facts as /llms.txt.

// Facts the SPA hard-codes in frontend/src/components/soul/SoulReadmeContent.tsx
// and selectedWork.tsx. Change them together.
const (
	profileEmail     = "yongkang.zou.ai@gmail.com"
	profilePrevious  = "Previously at Epiminds and Mozart AI. I also make music as inhibitor."
	profileEducation = "MSc Computer Science · Université Paris Dauphine–PSL"
	profileOrigin    = "From Nanjing to France, from economics to computer science."
)

type profileLink struct{ Label, URL string }

var profileLinks = []profileLink{
	{"GitHub", "https://github.com/inin-zou"},
	{"LinkedIn", "https://www.linkedin.com/in/yongkang-zou"},
	{"Hugging Face", "https://huggingface.co/YongkangZOU"},
	{"CV (PDF, English)", SiteURL + "/cv/yongkang-zou-cv-en.pdf"},
	{"CV (PDF, Chinese)", SiteURL + "/cv/yongkang-zou-cv-zh.pdf"},
}

type workItem struct{ Title, Meta, Date, Description, URL string }

var selectedWork = []workItem{
	{"Codex Privacy HUD", "OpenAI Privacy Hackathon Paris · Winner · 100+ GitHub stars", "2026.09 – now",
		"A runtime privacy and audit plugin for OpenAI Codex: tracks sensitive data crossing agent boundaries, with a session disclosure ledger and a Codex CLI status line.",
		"https://github.com/inin-zou/codex-privacy-hud"},
	{"Clio", "Big Berlin Hack · Inca Track winner", "2026",
		"A full-duplex speech-to-speech voice agent for insurance claims on real phone lines (Twilio / LiveKit), with ~450–650 ms round-trip latency.",
		"https://github.com/inin-zou/Clio"},
	{"KernelGen", "GOSIM KernelGen 2026 · 1st, Sparse Attention track", "2026.05",
		"Triton / FlagTree kernels for dynamic sparse attention and DeepSeek mHC across five AI accelerator backends: 1.97× average speedup on sparse attention, 71.85× on mHC.",
		"https://github.com/inin-zou/kernelgen-challenge"},
}

type backgroundRow struct{ Company, URL, Role, Years string }

var background = []backgroundRow{
	{"Epiminds", "https://epiminds.com/", "Founding AI Engineer", "2026"},
	{"Mozart AI", "https://mozartai.com/", "AI Engineer", "2025–2026"},
}

// soulPage is the editable part of SOUL.md (pages.soul), with the SPA's defaults.
type soulPage struct {
	Bio       []string `json:"bio"`
	Currently string   `json:"currently"`
	Languages string   `json:"languages"`
}

func defaultSoul() soulPage {
	return soulPage{
		Bio: []string{
			"AI Engineer. My way of learning: BFS -> DFS",
			"BFS: I try everything that interests me, don't want to become boring.\nDFS: building solid projects that real users depend on.",
		},
		Currently: "Agent Runtime · Context Engineering · Agent Eval",
		Languages: "Chinese (native) · French (DALF C2) · English (IELTS 7.0)",
	}
}

func (s *SEOService) soul() soulPage {
	page := defaultSoul()
	raw, err := s.content.GetPage("soul")
	if err != nil || len(raw) == 0 {
		return page
	}
	var stored soulPage
	if json.Unmarshal(raw, &stored) != nil {
		return page
	}
	if len(stored.Bio) > 0 {
		page.Bio = stored.Bio
	}
	if stored.Currently != "" {
		page.Currently = stored.Currently
	}
	if stored.Languages != "" {
		page.Languages = stored.Languages
	}
	return page
}

var finalist = regexp.MustCompile(`(?i)finalist`)

// hackathonWins counts results that are not Finalist, the same rule as the
// hand-written totals on the Hackathons and Skills pages.
func hackathonWins(hackathons []model.Hackathon) int {
	wins := 0
	for _, h := range hackathons {
		if h.Result != "" && !finalist.MatchString(h.Result) {
			wins++
		}
	}
	return wins
}

func livePosts(posts []model.BlogPost) []model.BlogPost {
	var live []model.BlogPost
	for _, p := range posts {
		if !p.Archived {
			live = append(live, p)
		}
	}
	sort.SliceStable(live, func(i, j int) bool { return live[i].PublishedAt > live[j].PublishedAt })
	return live
}

// htmlDoc accumulates escaped markup.
type htmlDoc struct{ b strings.Builder }

func (d *htmlDoc) raw(s string) { d.b.WriteString(s) }

func (d *htmlDoc) el(tag, text string) {
	fmt.Fprintf(&d.b, "<%s>%s</%s>\n", tag, esc(text), tag)
}

func (d *htmlDoc) link(label, href string) string {
	return fmt.Sprintf(`<a href="%s">%s</a>`, esc(href), esc(label))
}

func esc(s string) string { return html.EscapeString(s) }

// Body returns the crawler-readable content for a page path, or "" when the
// page has nothing beyond its head (admin, graphs, unknown paths).
func (s *SEOService) Body(path string) string {
	if path != "/" {
		path = strings.TrimRight(path, "/")
	}
	parts := strings.Split(strings.TrimPrefix(path, "/"), "/")
	var d htmlDoc
	switch {
	case path == "/" || path == "/files/soul":
		s.writeProfile(&d)
	case path == "/files/skill":
		s.writeSkills(&d)
	case path == "/files/skill/experience":
		s.writeExperience(&d)
	case path == "/files/skill/hackathons":
		s.writeHackathons(&d)
	case path == "/files/skill/cv":
		d.el("h1", "CV — Yongkang Zou")
		writeLinks(&d)
	case path == "/files/music" || (len(parts) == 3 && parts[1] == "music"):
		s.writeMusic(&d)
	case path == "/files/contact":
		d.el("h1", "Contact — Yongkang Zou")
		writeLinks(&d)
	case path == "/files/memory" || (len(parts) == 3 && parts[1] == "memory" && parts[2] != "guestbook"):
		category := ""
		if len(parts) == 3 {
			category = parts[2]
		}
		s.writePostList(&d, category)
	case len(parts) == 4 && parts[1] == "memory":
		s.writePost(&d, parts[2], parts[3])
	default:
		return ""
	}
	if d.b.Len() == 0 {
		return ""
	}
	writeSiteNav(&d)
	return `<div class="prerender">` + "\n" + d.b.String() + "</div>"
}

func writeLinks(d *htmlDoc) {
	d.raw("<ul>\n")
	d.raw("<li>" + d.link("Email: "+profileEmail, "mailto:"+profileEmail) + "</li>\n")
	for _, l := range profileLinks {
		d.raw("<li>" + d.link(l.Label, l.URL) + "</li>\n")
	}
	d.raw("</ul>\n")
}

func writeSiteNav(d *htmlDoc) {
	d.raw("<nav><ul>\n")
	for _, l := range []profileLink{
		{"About", "/files/soul"}, {"Writing", "/files/memory"}, {"Skills", "/files/skill"},
		{"Experience", "/files/skill/experience"}, {"Hackathons", "/files/skill/hackathons"},
		{"CV", "/files/skill/cv"}, {"Music", "/files/music"}, {"Contact", "/files/contact"},
	} {
		d.raw("<li>" + d.link(l.Label, l.URL) + "</li>\n")
	}
	d.raw("</ul></nav>\n")
}

func (s *SEOService) writeProfile(d *htmlDoc) {
	soul := s.soul()
	d.el("h1", "Yongkang Zou — AI Engineer in Paris")
	for _, p := range soul.Bio {
		d.el("p", p)
	}
	d.el("p", profilePrevious)
	d.el("p", "Currently: "+soul.Currently)
	if hackathons, err := s.content.GetHackathons(); err == nil && len(hackathons) > 0 {
		d.el("p", fmt.Sprintf("%d hackathons, %d wins.", len(hackathons), hackathonWins(hackathons)))
	}
	d.el("p", "Languages: "+soul.Languages)
	writeLinks(d)

	d.el("h2", "Selected work")
	for _, w := range selectedWork {
		d.raw("<article><h3>" + d.link(w.Title, w.URL) + "</h3>\n")
		d.el("p", w.Description)
		d.el("p", w.Meta+" · "+w.Date)
		d.raw("</article>\n")
	}

	if posts, err := s.content.GetBlogPosts(); err == nil {
		live := livePosts(posts)
		if len(live) > 3 {
			live = live[:3]
		}
		if len(live) > 0 {
			d.el("h2", "Writing")
			d.raw("<ul>\n")
			for _, p := range live {
				d.raw("<li>" + d.link(p.Title, postPath(p)) + " (" + esc(dateOnly(p.PublishedAt)) + ")</li>\n")
			}
			d.raw("</ul>\n")
		}
	}

	d.el("h2", "Background")
	d.raw("<ul>\n")
	for _, r := range background {
		d.raw("<li>" + d.link(r.Company, r.URL) + " — " + esc(r.Role) + ", " + esc(r.Years) + "</li>\n")
	}
	d.raw("<li>" + esc(profileEducation) + "</li>\n</ul>\n")
	d.el("p", profileOrigin)

	d.el("h2", "Music")
	d.el("p", "Yongkang Zou also writes and sings alternative RnB and lo-fi as inhibitor.")
}

func (s *SEOService) writeSkills(d *htmlDoc) {
	skills, err := s.content.GetSkills()
	if err != nil || len(skills) == 0 {
		return
	}
	d.el("h1", "Skills — Yongkang Zou")
	for _, domain := range skills {
		d.el("h2", domain.Title)
		var names []string
		names = append(names, domain.Skills...)
		for _, sub := range domain.Subcategories {
			names = append(names, sub.Skills...)
		}
		if len(names) > 0 {
			d.el("p", strings.Join(names, ", "))
		}
		if len(domain.BattleTested) > 0 {
			d.el("p", "Used in: "+strings.Join(domain.BattleTested, ", "))
		}
	}
}

func (s *SEOService) writeExperience(d *htmlDoc) {
	experience, err := s.content.GetExperience()
	if err != nil || len(experience) == 0 {
		return
	}
	sort.SliceStable(experience, func(i, j int) bool { return experience[i].StartDate > experience[j].StartDate })
	d.el("h1", "Experience — Yongkang Zou")
	for _, e := range experience {
		end := e.EndDate
		if end == "" {
			end = "Present"
		}
		d.raw("<article>\n")
		d.el("h2", e.Role+" — "+e.Company)
		d.el("p", strings.Join(nonEmpty(e.Location, e.StartDate+" – "+end), " · "))
		if e.SkillAssembled != "" {
			d.el("p", e.SkillAssembled)
		}
		if len(e.Highlights) > 0 {
			d.raw("<ul>\n")
			for _, h := range e.Highlights {
				d.el("li", h)
			}
			d.raw("</ul>\n")
		}
		d.raw("</article>\n")
	}
}

func (s *SEOService) writeHackathons(d *htmlDoc) {
	hackathons, err := s.content.GetHackathons()
	if err != nil || len(hackathons) == 0 {
		return
	}
	d.el("h1", "Hackathons — Yongkang Zou")
	d.el("p", fmt.Sprintf("%d hackathons, %d wins.", len(hackathons), hackathonWins(hackathons)))
	d.raw("<ul>\n")
	for _, h := range hackathons {
		project := esc(h.ProjectName)
		if h.ProjectURL != "" {
			project = d.link(h.ProjectName, h.ProjectURL)
		}
		place := "remote"
		if !h.IsRemote {
			place = strings.Join(nonEmpty(h.City, h.Country), ", ")
		}
		line := esc(h.Date) + " · " + esc(h.Name)
		if place != "" {
			line += " (" + esc(place) + ")"
		}
		if project != "" {
			line += " — " + project
		}
		if h.Result != "" {
			line += " — " + esc(h.Result)
		}
		d.raw("<li>" + line + "</li>\n")
	}
	d.raw("</ul>\n")
}

func (s *SEOService) writeMusic(d *htmlDoc) {
	tracks, err := s.content.GetMusicTracks()
	if err != nil {
		return
	}
	d.el("h1", "Music — inhibitor")
	d.el("p", "inhibitor: alternative RnB and lo-fi, written and sung by Yongkang Zou.")
	d.raw("<ul>\n")
	for _, t := range tracks {
		line := d.link(t.Name, "/files/music/"+t.Slug)
		if details := strings.Join(nonEmpty(t.Genre, t.Original), " · "); details != "" {
			line += " — " + esc(details)
		}
		d.raw("<li>" + line + "</li>\n")
	}
	d.raw("</ul>\n")
}

func (s *SEOService) writePostList(d *htmlDoc, category string) {
	posts, err := s.content.GetBlogPosts()
	if err != nil {
		return
	}
	title := "Writing — Yongkang Zou"
	if category != "" {
		title = titleCase(category) + " writing — Yongkang Zou"
	}
	d.el("h1", title)
	d.raw("<ul>\n")
	for _, p := range livePosts(posts) {
		if category != "" && p.Category != category {
			continue
		}
		line := d.link(p.Title, postPath(p)) + " (" + esc(dateOnly(p.PublishedAt)) + ")"
		if preview := truncate(p.Preview, 200); preview != "" {
			line += " — " + esc(preview)
		}
		d.raw("<li>" + line + "</li>\n")
	}
	d.raw("</ul>\n")
}

// Post HTML is authored in ADMIN.md; drop what a static reader can't use.
var (
	unsafeBlocks = regexp.MustCompile(`(?is)<(script|style|iframe|noscript)\b.*?</(script|style|iframe|noscript)\s*>`)
	eventAttrs   = regexp.MustCompile(`(?i)\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)`)
)

func (s *SEOService) writePost(d *htmlDoc, category, slug string) {
	posts, err := s.content.GetBlogPosts()
	if err != nil {
		return
	}
	for _, p := range posts {
		if p.Slug != slug || p.Category != category {
			continue
		}
		d.raw("<article>\n")
		d.el("h1", p.Title)
		meta := []string{"Yongkang Zou", dateOnly(p.PublishedAt), p.Category}
		meta = append(meta, p.Tags...)
		d.el("p", strings.Join(nonEmpty(meta...), " · "))
		d.raw(eventAttrs.ReplaceAllString(unsafeBlocks.ReplaceAllString(p.Content, ""), ""))
		d.raw("\n</article>\n")
		return
	}
}

func nonEmpty(values ...string) []string {
	var out []string
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			out = append(out, v)
		}
	}
	return out
}

// LLMs renders /llms.txt: who Yongkang Zou is, in Markdown, from the same data
// as the site (https://llmstxt.org).
func (s *SEOService) LLMs() []byte {
	var b strings.Builder
	line := func(format string, args ...any) { fmt.Fprintf(&b, format+"\n", args...) }
	soul := s.soul()

	line("# Yongkang Zou")
	line("")
	line("> AI Engineer in Paris. Builds agents, voice agents and LLM infrastructure; hackathon regular; also makes music as inhibitor.")
	line("")
	for _, p := range soul.Bio {
		line("%s", strings.ReplaceAll(p, "\n", " "))
		line("")
	}
	line("%s", profilePrevious)
	line("")
	line("- Currently: %s", soul.Currently)
	if hackathons, err := s.content.GetHackathons(); err == nil && len(hackathons) > 0 {
		line("- Hackathons: %d, with %d wins", len(hackathons), hackathonWins(hackathons))
	}
	line("- Education: %s", profileEducation)
	line("- Languages: %s", soul.Languages)
	line("- Based in: Paris, France (%s)", profileOrigin)
	line("")

	line("## Links")
	line("")
	line("- [Website](%s/files/soul): About page", SiteURL)
	line("- [Email](mailto:%s)", profileEmail)
	for _, l := range profileLinks {
		line("- [%s](%s)", l.Label, l.URL)
	}
	line("")

	line("## Selected work")
	line("")
	for _, w := range selectedWork {
		line("- [%s](%s): %s (%s, %s)", w.Title, w.URL, w.Description, w.Meta, w.Date)
	}
	line("")

	line("## Experience")
	line("")
	for _, r := range background {
		line("- %s at [%s](%s), %s", r.Role, r.Company, r.URL, r.Years)
	}
	line("- Full history: [%s/files/skill/experience](%s/files/skill/experience)", SiteURL, SiteURL)
	line("")

	if posts, err := s.content.GetBlogPosts(); err == nil {
		if live := livePosts(posts); len(live) > 0 {
			line("## Writing")
			line("")
			for _, p := range live {
				desc := truncate(p.Preview, 160)
				if desc != "" {
					desc = ": " + desc
				}
				line("- [%s](%s%s) (%s)%s", p.Title, SiteURL, postPath(p), dateOnly(p.PublishedAt), desc)
			}
			line("")
		}
	}

	line("## Optional")
	line("")
	line("- [Hackathons](%s/files/skill/hackathons): every hackathon, project and result", SiteURL)
	line("- [Skills](%s/files/skill): skill domains and the projects that used them", SiteURL)
	line("- [Music](%s/files/music): recordings by inhibitor", SiteURL)
	line("- [Sitemap](%s/sitemap.xml)", SiteURL)
	return []byte(b.String())
}
