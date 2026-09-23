package service

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"sync"
	"testing"
	"time"
)

type externalTransport func(*http.Request) (*http.Response, error)

func (f externalTransport) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }
func externalResponse(body string) *http.Response {
	return &http.Response{StatusCode: 200, Header: make(http.Header), Body: io.NopCloser(strings.NewReader(body))}
}

func TestExternalTimeouts(t *testing.T) {
	g := NewGeminiService("")
	if g.fetchClient.Timeout != 30*time.Second || g.uploadClient.Timeout != 60*time.Second || g.generateClient.Timeout != 120*time.Second || NewGitHubService("").client.Timeout != 10*time.Second {
		t.Fatal("external API timeouts changed")
	}
}

func TestGitHubConcurrentCache(t *testing.T) {
	s := NewGitHubService("fake")
	calls := 0
	s.client.Transport = externalTransport(func(*http.Request) (*http.Response, error) {
		calls++
		return externalResponse(`{"data":{"user":{"contributionsCollection":{"contributionCalendar":{"weeks":[]}}}}}`), nil
	})
	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			body, err := s.Contributions()
			if err != nil || string(body) != `{"weeks":[]}` {
				t.Errorf("body=%s err=%v", body, err)
			}
		}()
	}
	wg.Wait()
	if calls != 1 {
		t.Fatalf("calls=%d", calls)
	}
}

func TestGeminiFailureResponses(t *testing.T) {
	for _, tc := range []struct {
		name, body, message string
		status              int
	}{
		{"invalid JSON", "{", "failed to parse AI response", 200},
		{"empty candidates", `{"candidates":[]}`, "AI returned empty response", 200},
		{"empty parts", `{"candidates":[{"content":{"parts":[]}}]}`, "AI returned empty response", 200},
		{"upstream", strings.Repeat("x", 250), "AI service returned 429: " + strings.Repeat("x", 200), 429},
	} {
		t.Run(tc.name, func(t *testing.T) {
			s := NewGeminiService("fake")
			s.generateClient.Transport = externalTransport(func(*http.Request) (*http.Response, error) {
				r := externalResponse(tc.body)
				r.StatusCode = tc.status
				return r, nil
			})
			for _, refine := range []bool{false, true} {
				var err error
				if refine {
					_, err = s.RefineDraft(RefineRequest{ExistingContent: "original"})
				} else {
					_, err = s.GenerateDraft(DraftRequest{RoughIdea: "idea"})
				}
				var external *ExternalError
				if !errors.As(err, &external) || external.StatusCode != 502 || external.Message != tc.message {
					t.Fatalf("err=%v", err)
				}
			}
		})
	}
}

func TestGitHubExpiredCacheAndFailures(t *testing.T) {
	for _, tc := range []struct {
		name, body, message string
		status              int
	}{
		{"http", "denied", "GitHub API returned 403", 403},
		{"invalid", "{", "failed to parse GitHub response", 200},
		{"missing", `{"data":{}}`, "failed to parse GitHub response", 200},
	} {
		t.Run(tc.name, func(t *testing.T) {
			s := NewGitHubService("fake")
			s.cache, s.cachedAt = []byte(`{"old":true}`), time.Now().Add(-2*time.Hour)
			s.client.Transport = externalTransport(func(*http.Request) (*http.Response, error) {
				r := externalResponse(tc.body)
				r.StatusCode = tc.status
				return r, nil
			})
			_, err := s.Contributions()
			var external *ExternalError
			if !errors.As(err, &external) || external.StatusCode != 502 || external.Message != tc.message {
				t.Fatalf("err=%v", err)
			}
		})
	}
	_, err := NewGitHubService("").Contributions()
	var external *ExternalError
	if !errors.As(err, &external) || external.StatusCode != 503 || external.Message != "GitHub token not configured" {
		t.Fatalf("err=%v", err)
	}
}

func TestGeminiUploadAndPoll(t *testing.T) {
	s := NewGeminiService("fake")
	calls, sleeps := 0, 0
	s.sleep = func(d time.Duration) {
		sleeps++
		if d != 5*time.Second {
			t.Fatalf("poll interval=%v", d)
		}
	}
	s.uploadClient.Transport = externalTransport(func(r *http.Request) (*http.Response, error) {
		calls++
		switch calls {
		case 1:
			if r.Header.Get("X-Goog-Upload-Command") != "start" || r.Header.Get("X-Goog-Upload-Header-Content-Length") != "3" || r.Header.Get("X-Goog-Upload-Header-Content-Type") != "image/png" {
				t.Fatalf("start headers=%v", r.Header)
			}
			resp := externalResponse(`{}`)
			resp.Header.Set("X-Goog-Upload-Url", "https://upload.example.test/file")
			return resp, nil
		case 2:
			b, err := io.ReadAll(r.Body)
			if err != nil {
				t.Fatal(err)
			}
			if string(b) != "png" || r.URL.Host != "upload.example.test" || r.Header.Get("X-Goog-Upload-Command") != "upload, finalize" {
				t.Fatalf("upload=%s %v", b, r)
			}
			return externalResponse(`{"file":{"name":"sample","uri":"gemini://sample","mimeType":"image/png","state":"PROCESSING"}}`), nil
		case 3:
			return externalResponse(`{"state":"PROCESSING"}`), nil
		case 4:
			if r.URL.Path != "/v1beta/files/sample" || r.Method != "GET" {
				t.Fatalf("poll=%v", r)
			}
			return externalResponse(`{"state":"ACTIVE"}`), nil
		default:
			t.Fatal("unexpected extra request")
			return nil, nil
		}
	})
	f, err := s.uploadToGeminiFileAPI([]byte("png"), "image/png", "sample")
	if err != nil || f.URI != "gemini://sample" || f.MIMEType != "image/png" || calls != 4 || sleeps != 2 {
		t.Fatalf("file=%+v err=%v calls=%d sleeps=%d", f, err, calls, sleeps)
	}
}

func TestGeminiRefineDeduplicatesMediaAndPreservesErrors(t *testing.T) {
	s := NewGeminiService("fake")
	fetches := 0
	s.fetchClient.Transport = externalTransport(func(*http.Request) (*http.Response, error) {
		fetches++
		r := externalResponse("unavailable")
		r.StatusCode = 404
		return r, nil
	})
	s.generateClient.Transport = externalTransport(func(r *http.Request) (*http.Response, error) {
		var payload struct {
			Contents []struct {
				Parts []map[string]string `json:"parts"`
			} `json:"contents"`
			Instruction struct {
				Parts []map[string]string `json:"parts"`
			} `json:"system_instruction"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatal(err)
		}
		parts := payload.Contents[0].Parts
		if len(parts) != 3 || !strings.Contains(parts[0]["text"], "1 media file(s)") || !strings.Contains(parts[2]["text"], "HTTP 404") || payload.Instruction.Parts[0]["text"] != refineSystemPrompt {
			t.Fatalf("payload=%+v", payload)
		}
		return externalResponse(`{"candidates":[{"content":{"parts":[{"text":"{\"content\":\"refined\",\"preview\":\"summary\",\"slug\":\"post\"}"}]}}]}`), nil
	})
	draft, err := s.RefineDraft(RefineRequest{ExistingContent: "original", MediaURLs: []string{"https://media.example.test/a.png", "https://media.example.test/a.png"}})
	if err != nil || draft.Content != "refined" || fetches != 1 {
		t.Fatalf("draft=%+v err=%v fetches=%d", draft, err, fetches)
	}
}

func TestGitHubCacheAndRequest(t *testing.T) {
	calls := 0
	svc := NewGitHubService("test-token")
	svc.client.Transport = externalTransport(func(r *http.Request) (*http.Response, error) {
		calls++
		if r.URL.String() != "https://api.github.com/graphql" || r.Header.Get("Authorization") != "Bearer test-token" || r.Header.Get("User-Agent") != "yongkang-portfolio" {
			t.Fatalf("unexpected request: %v", r)
		}
		return externalResponse(`{"data":{"user":{"contributionsCollection":{"contributionCalendar":{"totalContributions":42,"weeks":[]}}}}}`), nil
	})
	for i := 0; i < 2; i++ {
		result, err := svc.Contributions()
		if err != nil || string(result) != `{"totalContributions":42,"weeks":[]}` {
			t.Fatalf("result=%s err=%v", result, err)
		}
	}
	if calls != 1 {
		t.Fatalf("calls=%d", calls)
	}
}

func TestGeminiDraftRequestAndRawTextFallback(t *testing.T) {
	svc := NewGeminiService("test-key")
	svc.generateClient.Transport = externalTransport(func(r *http.Request) (*http.Response, error) {
		if r.Header.Get("x-goog-api-key") != "test-key" {
			t.Fatal("missing API key")
		}
		var payload map[string]json.RawMessage
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatal(err)
		}
		if !strings.Contains(string(payload["contents"]), `Category: technical\nTitle: My Draft\n\nRough idea:\nHello`) {
			t.Fatalf("unexpected prompt: %s", payload["contents"])
		}
		var instruction struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		}
		if err := json.Unmarshal(payload["system_instruction"], &instruction); err != nil {
			t.Fatal(err)
		}
		if instruction.Parts[0].Text != blogSystemPrompt {
			t.Fatal("system prompt changed")
		}
		return externalResponse(`{"candidates":[{"content":{"parts":[{"text":"plain draft"}]}}]}`), nil
	})
	draft, err := svc.GenerateDraft(DraftRequest{Title: "My Draft", Category: "technical", RoughIdea: "Hello"})
	if err != nil || draft.Content != "plain draft" || draft.Preview != "plain draft" || draft.Slug != "my-draft" {
		t.Fatalf("draft=%+v err=%v", draft, err)
	}
}
