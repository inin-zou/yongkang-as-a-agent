package handler

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/service"
)

type githubStub struct {
	body []byte
	err  error
}

func (s githubStub) Contributions() ([]byte, error) { return s.body, s.err }

func TestContributionsHeadersAndErrors(t *testing.T) {
	for _, tc := range []struct {
		name   string
		github githubStub
		status int
		body   string
	}{
		{"success", githubStub{body: []byte(`{"weeks":[]}`)}, 200, `{"weeks":[]}`},
		{"error", githubStub{err: &service.ExternalError{StatusCode: 502, Message: "failed to parse GitHub response"}}, 502, "{\"error\":\"failed to parse GitHub response\"}\n"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			h := NewAPIHandler(nil, tc.github, nil)
			w := httptest.NewRecorder()
			h.HandleGetGitHubContributions(w, httptest.NewRequest(http.MethodGet, "/api/github-contributions", nil))
			if w.Code != tc.status || w.Body.String() != tc.body || w.Header().Get("Content-Type") != "application/json" {
				t.Fatalf("response=%d %q %v", w.Code, w.Body.String(), w.Header())
			}
			if tc.status == 200 {
				if w.Header().Get("Cache-Control") != "public, max-age=300" || w.Header().Get("CDN-Cache-Control") != "public, s-maxage=3600, stale-while-revalidate=600" || w.Header().Get("Vercel-CDN-Cache-Control") != w.Header().Get("CDN-Cache-Control") {
					t.Fatalf("headers=%v", w.Header())
				}
			} else if w.Header().Get("Cache-Control") != "" {
				t.Fatalf("error cached: %v", w.Header())
			}
		})
	}
}

func TestDraftValidationOrder(t *testing.T) {
	for _, tc := range []struct {
		name, key, body, message string
		refine                   bool
		status                   int
	}{
		{"generate unconfigured", "", "{", "AI drafting not configured", false, 503},
		{"refine unconfigured", "", "{", "AI drafting not configured", true, 503},
		{"generate malformed", "fake", "{", "invalid request body", false, 400},
		{"refine malformed", "fake", "{", "invalid request body", true, 400},
		{"generate empty", "fake", `{"roughIdea":" "}`, "roughIdea or mediaUrls required", false, 400},
		{"refine empty", "fake", `{"existingContent":" "}`, "existingContent is required", true, 400},
	} {
		t.Run(tc.name, func(t *testing.T) {
			h := NewAPIHandler(nil, nil, service.NewGeminiService(tc.key))
			w := httptest.NewRecorder()
			r := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(tc.body))
			if tc.refine {
				h.HandleRefineDraft(w, r)
			} else {
				h.HandleGenerateDraft(w, r)
			}
			if w.Code != tc.status || w.Body.String() != "{\"error\":\""+tc.message+"\"}\n" {
				t.Fatalf("response=%d %s", w.Code, w.Body.String())
			}
		})
	}
}
