package service

import (
	"fmt"
	"strings"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/model"
)

// GetPostStats returns like count, comment count, and whether a user liked the post.
func (s *PortfolioService) GetPostStats(postSlug string, githubUsername string) (*model.PostStats, error) {
	if s.stores.Engagement == nil {
		return &model.PostStats{}, nil
	}
	stats, err := s.stores.Engagement.GetPostStats(postSlug, githubUsername)
	if err == nil {
		return stats, nil
	}

	// Preserve the existing repository error contract and do not mask query
	// failures. Only an absent blog row can be a music page without a backing post.
	trackSlug, isMusic := strings.CutPrefix(postSlug, "music-")
	if !isMusic || trackSlug == "" || err.Error() != fmt.Sprintf("blog post with slug %q not found", postSlug) {
		return nil, err
	}
	tracks, trackErr := s.GetMusicTracks()
	if trackErr != nil {
		return nil, trackErr
	}
	for _, track := range tracks {
		if track.Slug == trackSlug {
			// Likes and comments reference blog_posts.id, not music_tracks.id.
			// With no backing post there can be no persisted engagement counts.
			return &model.PostStats{}, nil
		}
	}
	return nil, err
}
