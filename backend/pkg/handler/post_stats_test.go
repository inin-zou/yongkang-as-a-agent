package handler

import (
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/model"
	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/service"
)

type statsEngagementStore struct {
	service.EngagementStore
	stats      *model.PostStats
	err        error
	slug, user string
}

func (s *statsEngagementStore) GetPostStats(slug, user string) (*model.PostStats, error) {
	s.slug, s.user = slug, user
	return s.stats, s.err
}

type statsMusicStore struct {
	service.MusicStore
	tracks []model.MusicTrack
	err    error
}

func (s *statsMusicStore) GetMusicTracks() ([]model.MusicTrack, error) {
	return s.tracks, s.err
}

func TestPostStatsMusicAndBlogResponses(t *testing.T) {
	for _, tc := range []struct {
		name, slug         string
		stats              *model.PostStats
		statsErr, musicErr error
		tracks             []model.MusicTrack
		status             int
		body               string
	}{
		{name: "music without blog backing row", slug: "music-nocturne", tracks: []model.MusicTrack{{Slug: "nocturne"}}, status: http.StatusOK, body: `{"likeCount":0,"commentCount":0,"userLiked":false}`},
		{name: "music with blog backing row preserves counts", slug: "music-nocturne", stats: &model.PostStats{LikeCount: 3, CommentCount: 2, UserLiked: true}, musicErr: errors.New("must not need music lookup"), status: http.StatusOK, body: `{"likeCount":3,"commentCount":2,"userLiked":true}`},
		{name: "ordinary post", slug: "hello", stats: &model.PostStats{LikeCount: 1}, status: http.StatusOK, body: `{"likeCount":1,"commentCount":0,"userLiked":false}`},
		{name: "unknown blog remains missing", slug: "missing", tracks: []model.MusicTrack{{Slug: "missing"}}, status: http.StatusNotFound, body: `{"error":"blog post with slug \"missing\" not found"}`},
		{name: "unknown music remains missing", slug: "music-unknown", tracks: []model.MusicTrack{{Slug: "nocturne"}}, status: http.StatusNotFound, body: `{"error":"blog post with slug \"music-unknown\" not found"}`},
		{name: "music matching is exact", slug: "music-nocturne-extra", tracks: []model.MusicTrack{{Slug: "nocturne"}}, status: http.StatusNotFound, body: `{"error":"blog post with slug \"music-nocturne-extra\" not found"}`},
		{name: "empty music slug remains missing", slug: "music-", tracks: []model.MusicTrack{{Slug: ""}}, status: http.StatusNotFound, body: `{"error":"blog post with slug \"music-\" not found"}`},
		{name: "engagement failure is not masked", slug: "music-nocturne", statsErr: errors.New("stats database unavailable"), tracks: []model.MusicTrack{{Slug: "nocturne"}}, status: http.StatusInternalServerError, body: `{"error":"stats database unavailable"}`},
		{name: "music lookup failure", slug: "music-nocturne", musicErr: errors.New("music database unavailable"), status: http.StatusInternalServerError, body: `{"error":"music database unavailable"}`},
	} {
		t.Run(tc.name, func(t *testing.T) {
			engagement := &statsEngagementStore{stats: tc.stats, err: tc.statsErr}
			if engagement.stats == nil && engagement.err == nil {
				engagement.err = fmt.Errorf("blog post with slug %q not found", tc.slug)
			}
			svc := service.NewPortfolioService(nil, service.PortfolioStores{
				Engagement: engagement,
				Music:      &statsMusicStore{tracks: tc.tracks, err: tc.musicErr},
			})
			h := NewAPIHandler(svc, nil, nil)
			router := chi.NewRouter()
			router.Get("/api/posts/{slug}/stats", h.HandleGetPostStats)
			response := httptest.NewRecorder()
			router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/posts/"+tc.slug+"/stats?user=listener", nil))
			if response.Code != tc.status || response.Body.String() != tc.body+"\n" {
				t.Fatalf("response = %d %s, want %d %s", response.Code, response.Body.String(), tc.status, tc.body)
			}
			if engagement.slug != tc.slug || engagement.user != "listener" {
				t.Fatalf("engagement target = %q/%q", engagement.slug, engagement.user)
			}
			if response.Header().Get("Content-Type") != "application/json" {
				t.Fatalf("Content-Type = %q", response.Header().Get("Content-Type"))
			}
			for key, expected := range map[string]string{
				"Cache-Control":            "public, max-age=10",
				"CDN-Cache-Control":        "public, s-maxage=60, stale-while-revalidate=2",
				"Vercel-CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=2",
			} {
				if tc.status != http.StatusOK {
					expected = ""
				}
				if got := response.Header().Get(key); got != expected {
					t.Errorf("%s = %q, want %q", key, got, expected)
				}
			}
		})
	}
}
