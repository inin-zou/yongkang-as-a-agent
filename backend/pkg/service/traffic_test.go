package service

import (
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/model"
)

type trafficFake struct {
	visits []model.PageVisit
	since  time.Time
}

func (f *trafficFake) RecordVisit(v model.PageVisit) error {
	f.visits = append(f.visits, v)
	return nil
}
func (f *trafficFake) GetTraffic(since time.Time) (*model.TrafficReport, error) {
	f.since = since
	return &model.TrafficReport{Views: 3}, nil
}

const (
	chromeMac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36"
	iphone    = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
	wechat    = iphone + " MicroMessenger/8.0.50(0x18003237) NetType/WIFI Language/zh_CN"
)

func TestBotName(t *testing.T) {
	for ua, want := range map[string]string{
		chromeMac: "",
		iphone:    "",
		wechat:    "",
		"Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)": "GPTBot",
		"Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)":                                      "ClaudeBot",
		"Mozilla/5.0 (compatible; PerplexityBot/1.0)":                                                            "PerplexityBot",
		"Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)":                               "Googlebot",
		"LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)":                  "LinkedInBot",
		"Mozilla/5.0 (compatible; SomeNewBot/1.0)":                                                               "other (bot)",
		"curl/8.7.1":                     "other (curl)",
		"python-requests/2.32":           "other (python-requests)",
		"Mozilla/5.0 HeadlessChrome/140": "other (headless)",
		"":                               "unknown",
	} {
		if got := BotName(ua); got != want {
			t.Errorf("BotName(%q) = %q, want %q", ua, got, want)
		}
	}
}

func TestReferrerHost(t *testing.T) {
	for ref, want := range map[string]string{
		"":                                    "",
		"not a url":                           "",
		"https://yongkang.dev/files/soul":     "",
		"https://www.yongkang.dev/":           "",
		"http://localhost:5173/":              "",
		"https://x-git-main.vercel.app/":      "",
		"https://www.linkedin.com/feed/":      "linkedin.com",
		"https://lnkd.in/abc":                 "linkedin.com",
		"https://t.co/xyz":                    "x.com",
		"https://www.google.com/":             "google",
		"https://www.google.fr/":              "google",
		"https://github.com/inin-zou":         "github.com",
		"https://news.ycombinator.com/item":   "hacker news",
		"https://chatgpt.com/":                "chatgpt",
		"https://m.facebook.com/":             "facebook.com",
		"android-app://com.linkedin.android/": "linkedin.com",
		"javascript:alert(1)":                 "",
	} {
		if got := ReferrerHost(ref); got != want {
			t.Errorf("ReferrerHost(%q) = %q, want %q", ref, got, want)
		}
	}
}

func TestDeviceClass(t *testing.T) {
	ipad := "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15"
	androidTablet := "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 Chrome/140 Safari/537.36"
	for ua, want := range map[string]string{chromeMac: "desktop", iphone: "mobile", ipad: "tablet", androidTablet: "tablet"} {
		if got := DeviceClass(ua); got != want {
			t.Errorf("DeviceClass(%q) = %q, want %q", ua, got, want)
		}
	}
}

func TestTrackPageView(t *testing.T) {
	store := &trafficFake{}
	s := NewTrafficService(store, "secret")
	day := time.Date(2026, 9, 25, 12, 0, 0, 0, time.UTC)
	s.now = func() time.Time { return day }
	person := Visitor{IP: "203.0.113.7", UserAgent: iphone, Country: "fr"}

	landing := model.TrackRequest{Path: "/files/soul/?utm=x#work", Landing: true, Referrer: "https://www.linkedin.com/feed/",
		UTMSource: " linkedin ", UTMMedium: "social", UTMCampaign: strings.Repeat("c", 150)}
	if err := s.TrackPageView(landing, person); err != nil {
		t.Fatal(err)
	}
	// Later views of the same visit carry no source.
	if err := s.TrackPageView(model.TrackRequest{Path: "/files/memory", Referrer: "https://google.com/", UTMSource: "x"}, person); err != nil {
		t.Fatal(err)
	}
	// Not counted: admin pages and crawlers running JS.
	_ = s.TrackPageView(model.TrackRequest{Path: "/files/admin/traffic", Landing: true}, person)
	_ = s.TrackPageView(model.TrackRequest{Path: "/files/soul", Landing: true}, Visitor{UserAgent: "Mozilla/5.0 (compatible; GPTBot/1.2)"})

	if len(store.visits) != 2 {
		t.Fatalf("recorded %d visits, want 2: %+v", len(store.visits), store.visits)
	}
	first, second := store.visits[0], store.visits[1]
	if first.Path != "/files/soul" || !first.Landing || first.Referrer != "linkedin.com" || first.UTMSource != "linkedin" ||
		first.UTMMedium != "social" || len(first.UTMCampaign) != 100 || first.Country != "FR" || first.Device != "mobile" || first.Bot != "" {
		t.Fatalf("landing visit: %+v", first)
	}
	if second.Referrer != "" || second.UTMSource != "" || second.Landing {
		t.Fatalf("follow-up view kept source fields: %+v", second)
	}
	if first.Visitor == "" || first.Visitor != second.Visitor || strings.Contains(first.Visitor, "203.0.113") {
		t.Fatalf("visitor hash: %q / %q", first.Visitor, second.Visitor)
	}

	// The hash rotates daily and depends on the salt.
	s.now = func() time.Time { return day.AddDate(0, 0, 1) }
	_ = s.TrackPageView(model.TrackRequest{Path: "/"}, person)
	other := NewTrafficService(store, "other-secret")
	other.now = func() time.Time { return day }
	_ = other.TrackPageView(model.TrackRequest{Path: "/"}, person)
	if store.visits[2].Visitor == first.Visitor || store.visits[3].Visitor == first.Visitor {
		t.Fatal("visitor hash must change with the day and the salt")
	}

	for _, bad := range []string{"", "files", "//evil.com", "/api/posts", "/" + strings.Repeat("a", 300)} {
		if err := s.TrackPageView(model.TrackRequest{Path: bad}, person); !errors.Is(err, ErrInvalidVisit) {
			t.Errorf("path %q: err = %v, want ErrInvalidVisit", bad, err)
		}
	}
}

func TestRecordCrawlAndReport(t *testing.T) {
	store := &trafficFake{}
	s := NewTrafficService(store, "secret")
	_ = s.RecordCrawl("/files/soul/", "Mozilla/5.0 (compatible; ClaudeBot/1.0)", "US")
	_ = s.RecordCrawl("/files/soul", chromeMac, "FR") // people are counted by the SPA
	if len(store.visits) != 1 || store.visits[0] != (model.PageVisit{Path: "/files/soul", Bot: "ClaudeBot", Country: "US"}) {
		t.Fatalf("crawls: %+v", store.visits)
	}

	// Seven days = today plus the six before it, from Paris midnight.
	s.now = func() time.Time { return time.Date(2026, 9, 25, 23, 30, 0, 0, time.UTC) } // 01:30 on the 26th in Paris
	report, err := s.GetTraffic(7)
	if err != nil || report.Days != 7 || report.Views != 3 {
		t.Fatalf("report: %+v, %v", report, err)
	}
	if want := time.Date(2026, 9, 20, 0, 0, 0, 0, paris); !store.since.Equal(want) {
		t.Fatalf("since = %v, want %v", store.since, want)
	}
	if report, _ := s.GetTraffic(0); report.Days != 30 {
		t.Fatalf("default days = %d", report.Days)
	}

	empty := NewTrafficService(nil, "secret")
	if err := empty.TrackPageView(model.TrackRequest{Path: "/"}, Visitor{UserAgent: chromeMac}); err != nil {
		t.Fatal(err)
	}
	if report, err := empty.GetTraffic(7); err != nil || report.Days != 7 {
		t.Fatalf("no store: %+v, %v", report, err)
	}
}
