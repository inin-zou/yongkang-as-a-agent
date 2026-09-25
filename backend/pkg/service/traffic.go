package service

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/model"
)

// TrafficStore persists page views and aggregates them for ADMIN.md.
type TrafficStore interface {
	RecordVisit(v model.PageVisit) error
	GetTraffic(since time.Time) (*model.TrafficReport, error)
}

// ErrInvalidVisit rejects a track request that can't be a page of this site.
var ErrInvalidVisit = errors.New("invalid page view")

// Visitor describes the request behind a page view. Only the country, the
// device class and a daily hash of IP + user agent are kept.
type Visitor struct {
	IP        string
	UserAgent string
	Country   string
}

// TrafficService records where visitors and crawlers come from.
type TrafficService struct {
	store TrafficStore
	salt  string
	now   func() time.Time
}

// NewTrafficService creates the service; a nil store records nothing. The salt
// must stay secret: it keeps visitor hashes from being reversed to IPs.
func NewTrafficService(store TrafficStore, salt string) *TrafficService {
	return &TrafficService{store: store, salt: salt, now: time.Now}
}

// Paris days: the visitor salt and the daily series turn over at local midnight.
var paris = mustLocation("Europe/Paris")

func mustLocation(name string) *time.Location {
	loc, err := time.LoadLocation(name)
	if err != nil {
		return time.UTC
	}
	return loc
}

// TrackPageView records a page view reported by the SPA. Crawlers that run JS
// are skipped here; the page handler already counts them.
func (s *TrafficService) TrackPageView(req model.TrackRequest, v Visitor) error {
	path, ok := cleanPath(req.Path)
	if !ok {
		return ErrInvalidVisit
	}
	if s.store == nil || BotName(v.UserAgent) != "" || strings.HasPrefix(path, "/files/admin") {
		return nil
	}
	visit := model.PageVisit{
		Path:    path,
		Landing: req.Landing,
		Country: cleanCountry(v.Country),
		Device:  DeviceClass(v.UserAgent),
		Visitor: s.visitorHash(v),
	}
	if req.Landing {
		visit.Referrer = ReferrerHost(req.Referrer)
		visit.UTMSource = clip(req.UTMSource, 100)
		visit.UTMMedium = clip(req.UTMMedium, 100)
		visit.UTMCampaign = clip(req.UTMCampaign, 100)
	}
	return s.store.RecordVisit(visit)
}

// RecordCrawl records a page served to a known crawler; other requests are ignored.
func (s *TrafficService) RecordCrawl(path, userAgent, country string) error {
	bot := BotName(userAgent)
	if s.store == nil || bot == "" {
		return nil
	}
	clean, ok := cleanPath(path)
	if !ok {
		return nil
	}
	return s.store.RecordVisit(model.PageVisit{Path: clean, Bot: bot, Country: cleanCountry(country)})
}

// GetTraffic reports the last days days (1–365), including today.
func (s *TrafficService) GetTraffic(days int) (*model.TrafficReport, error) {
	if days < 1 || days > 365 {
		days = 30
	}
	if s.store == nil {
		return &model.TrafficReport{Days: days}, nil
	}
	now := s.now().In(paris)
	since := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, paris).AddDate(0, 0, -(days - 1))
	report, err := s.store.GetTraffic(since)
	if err != nil {
		return nil, err
	}
	report.Days = days
	return report, nil
}

func (s *TrafficService) visitorHash(v Visitor) string {
	day := s.now().In(paris).Format("2006-01-02")
	sum := sha256.Sum256([]byte(s.salt + "\x00" + day + "\x00" + v.IP + "\x00" + v.UserAgent))
	return hex.EncodeToString(sum[:8])
}

func cleanPath(p string) (string, bool) {
	if p == "" || p[0] != '/' || strings.HasPrefix(p, "//") || len(p) > 300 || strings.HasPrefix(p, "/api/") {
		return "", false
	}
	if i := strings.IndexAny(p, "?#"); i >= 0 {
		p = p[:i]
	}
	if p != "/" {
		p = strings.TrimRight(p, "/")
	}
	return p, true
}

var countryCode = regexp.MustCompile(`^[A-Z]{2}$`)

func cleanCountry(c string) string {
	c = strings.ToUpper(strings.TrimSpace(c))
	if countryCode.MatchString(c) {
		return c
	}
	return ""
}

func clip(s string, max int) string {
	s = strings.TrimSpace(s)
	if len(s) > max {
		return s[:max]
	}
	return s
}

// ownHosts are this site's hosts; a referrer from them is internal navigation.
var ownHosts = []string{"yongkang.dev", "localhost", "127.0.0.1"}

// referrerAliases fold a service's many hosts into one source name.
var referrerAliases = map[string]string{
	"t.co": "x.com", "twitter.com": "x.com",
	"lnkd.in":        "linkedin.com",
	"l.facebook.com": "facebook.com", "lm.facebook.com": "facebook.com", "m.facebook.com": "facebook.com",
	"out.reddit.com": "reddit.com", "old.reddit.com": "reddit.com",
	"news.ycombinator.com": "hacker news",
	"chatgpt.com":          "chatgpt", "chat.openai.com": "chatgpt",
	"claude.ai": "claude", "perplexity.ai": "perplexity", "gemini.google.com": "gemini",
}

// ReferrerHost reduces a referrer URL to a source name: its host without
// "www." or a mobile prefix, with search engines and big services folded
// together. "" means direct, internal or unknown.
func ReferrerHost(referrer string) string {
	u, err := url.Parse(strings.TrimSpace(referrer))
	if err != nil || u.Hostname() == "" || (u.Scheme != "http" && u.Scheme != "https" && u.Scheme != "android-app") {
		return ""
	}
	host := strings.ToLower(u.Hostname())
	if u.Scheme == "android-app" {
		// Android apps send their package name: com.linkedin.android → linkedin.com.
		if parts := strings.Split(host, "."); len(parts) >= 2 {
			host = parts[1] + "." + parts[0]
		}
	}
	for _, own := range ownHosts {
		if host == own || strings.HasSuffix(host, "."+own) {
			return ""
		}
	}
	if strings.HasSuffix(host, ".vercel.app") {
		return ""
	}
	if alias, ok := referrerAliases[host]; ok {
		return alias
	}
	host = strings.TrimPrefix(strings.TrimPrefix(host, "www."), "m.")
	if alias, ok := referrerAliases[host]; ok {
		return alias
	}
	if strings.HasPrefix(host, "google.") || strings.Contains(host, ".google.") {
		return "google"
	}
	if strings.HasPrefix(host, "bing.") || strings.HasPrefix(host, "duckduckgo.") || strings.HasPrefix(host, "baidu.") {
		return strings.SplitN(host, ".", 2)[0]
	}
	if strings.HasSuffix(host, "linkedin.com") {
		return "linkedin.com"
	}
	return clip(host, 100)
}

// crawlers maps user-agent substrings (lower case) to a crawler name. AI
// crawlers first, then search engines and link unfurlers.
var crawlers = []struct{ match, name string }{
	{"gptbot", "GPTBot"}, {"chatgpt-user", "ChatGPT-User"}, {"oai-searchbot", "OAI-SearchBot"},
	{"claudebot", "ClaudeBot"}, {"claude-user", "Claude-User"}, {"claude-searchbot", "Claude-SearchBot"}, {"anthropic-ai", "anthropic-ai"},
	{"perplexitybot", "PerplexityBot"}, {"perplexity-user", "Perplexity-User"},
	{"google-extended", "Google-Extended"}, {"googleother", "GoogleOther"},
	{"ccbot", "CCBot"}, {"bytespider", "Bytespider"}, {"meta-externalagent", "Meta-ExternalAgent"},
	{"amazonbot", "Amazonbot"}, {"applebot", "Applebot"}, {"mistralai-user", "MistralAI-User"},
	{"cohere-ai", "cohere-ai"}, {"youbot", "YouBot"}, {"diffbot", "Diffbot"},
	{"googlebot", "Googlebot"}, {"bingbot", "Bingbot"}, {"duckduckbot", "DuckDuckBot"},
	{"baiduspider", "Baiduspider"}, {"yandex", "YandexBot"}, {"petalbot", "PetalBot"},
	{"linkedinbot", "LinkedInBot"}, {"twitterbot", "Twitterbot"}, {"facebookexternalhit", "facebookexternalhit"},
	{"slackbot", "Slackbot"}, {"discordbot", "Discordbot"}, {"telegrambot", "TelegramBot"},
	{"whatsapp", "WhatsApp"}, {"micromessenger", ""}, // WeChat's in-app browser is a person
	{"ahrefsbot", "AhrefsBot"}, {"semrushbot", "SemrushBot"},
}

var genericBot = regexp.MustCompile(`(?i)(bot|crawler|spider|scraper)\b|\b(headless|python-requests|curl|wget|go-http-client|axios|node-fetch)`)

// BotName names the crawler behind a user agent, or returns "" for a browser.
func BotName(userAgent string) string {
	ua := strings.ToLower(userAgent)
	if ua == "" {
		return "unknown"
	}
	for _, c := range crawlers {
		if strings.Contains(ua, c.match) {
			return c.name
		}
	}
	if m := genericBot.FindString(ua); m != "" {
		return "other (" + strings.ToLower(m) + ")"
	}
	return ""
}

// DeviceClass buckets a browser user agent.
func DeviceClass(userAgent string) string {
	ua := strings.ToLower(userAgent)
	switch {
	case strings.Contains(ua, "ipad") || strings.Contains(ua, "tablet") || (strings.Contains(ua, "android") && !strings.Contains(ua, "mobile")):
		return "tablet"
	case strings.Contains(ua, "mobi") || strings.Contains(ua, "iphone"):
		return "mobile"
	default:
		return "desktop"
	}
}
