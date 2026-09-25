package handler

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/model"
	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/service"
)

type trafficSpy struct {
	tracked  []service.Visitor
	requests []model.TrackRequest
	crawls   []string
	trackErr error
	days     int
}

func (s *trafficSpy) TrackPageView(req model.TrackRequest, v service.Visitor) error {
	s.requests = append(s.requests, req)
	s.tracked = append(s.tracked, v)
	return s.trackErr
}
func (s *trafficSpy) RecordCrawl(path, userAgent, country string) error {
	s.crawls = append(s.crawls, path+" "+userAgent+" "+country)
	return nil
}
func (s *trafficSpy) GetTraffic(days int) (*model.TrafficReport, error) {
	s.days = days
	return &model.TrafficReport{Days: days, Views: 5}, nil
}

func TestHandleTrack(t *testing.T) {
	spy := &trafficSpy{}
	h := NewTrafficHandler(spy)
	req := httptest.NewRequest(http.MethodPost, "/api/track", strings.NewReader(`{"path":"/files/soul","landing":true,"referrer":"https://lnkd.in/x","utmSource":"linkedin"}`))
	req.Header.Set("X-Forwarded-For", "198.51.100.4, 10.0.0.1")
	req.Header.Set("X-Vercel-Ip-Country", "FR")
	req.Header.Set("User-Agent", "Mozilla/5.0 (iPhone)")
	w := httptest.NewRecorder()
	h.HandleTrack(w, req)
	if w.Code != http.StatusNoContent {
		t.Fatalf("track: %d", w.Code)
	}
	got := spy.tracked[0]
	if got != (service.Visitor{IP: "198.51.100.4", UserAgent: "Mozilla/5.0 (iPhone)", Country: "FR"}) {
		t.Fatalf("visitor: %+v", got)
	}
	if r := spy.requests[0]; r.Path != "/files/soul" || !r.Landing || r.Referrer != "https://lnkd.in/x" || r.UTMSource != "linkedin" {
		t.Fatalf("request: %+v", r)
	}

	for body, want := range map[string]int{`not json`: 400} {
		w := httptest.NewRecorder()
		h.HandleTrack(w, httptest.NewRequest(http.MethodPost, "/api/track", strings.NewReader(body)))
		if w.Code != want {
			t.Fatalf("%q: %d, want %d", body, w.Code, want)
		}
	}
	spy.trackErr = service.ErrInvalidVisit
	w = httptest.NewRecorder()
	h.HandleTrack(w, httptest.NewRequest(http.MethodPost, "/api/track", strings.NewReader(`{"path":"//x"}`)))
	if w.Code != http.StatusBadRequest {
		t.Fatalf("invalid path: %d", w.Code)
	}
	spy.trackErr = errors.New("db down") // storage errors never reach the visitor
	w = httptest.NewRecorder()
	h.HandleTrack(w, httptest.NewRequest(http.MethodPost, "/api/track", strings.NewReader(`{"path":"/"}`)))
	if w.Code != http.StatusNoContent {
		t.Fatalf("storage error: %d", w.Code)
	}
}

func TestHandleGetTraffic(t *testing.T) {
	spy := &trafficSpy{}
	w := httptest.NewRecorder()
	NewTrafficHandler(spy).HandleGetTraffic(w, httptest.NewRequest(http.MethodGet, "/api/admin/traffic?days=7", nil))
	if w.Code != 200 || spy.days != 7 || !strings.Contains(w.Body.String(), `"views":5`) || w.Header().Get("Cache-Control") != "no-store" {
		t.Fatalf("traffic: %d %q %s", w.Code, w.Header().Get("Cache-Control"), w.Body.String())
	}
}

func TestSEOHandlerRecordsCrawls(t *testing.T) {
	spy := &trafficSpy{}
	h := seoServer(NewStaticPageTemplate(shell)).RecordCrawlsTo(spy)
	get := func(method, path string) {
		req := httptest.NewRequest(method, path, nil)
		req.Header.Set("User-Agent", "GPTBot/1.2")
		h.HandlePage(httptest.NewRecorder(), req)
	}
	get(http.MethodGet, "/files/soul")
	get(http.MethodGet, "/nope")          // 404s are worth seeing too
	get(http.MethodGet, "/files/admin")   // noindex pages are not
	get(http.MethodHead, "/files/memory") // HEAD is a probe, not a read
	req := httptest.NewRequest(http.MethodGet, "/llms.txt", nil)
	req.Header.Set("User-Agent", "GPTBot/1.2")
	h.HandleLLMs(httptest.NewRecorder(), req)
	if strings.Join(spy.crawls, "|") != "/files/soul GPTBot/1.2 |/nope GPTBot/1.2 |/llms.txt GPTBot/1.2 " {
		t.Fatalf("crawls: %q", spy.crawls)
	}
}
