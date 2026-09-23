package repository

import (
	"database/sql"
	"fmt"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/model"
	"strings"
)

// GetPostStats returns like count, comment count, and whether a specific user liked the post.
func (r *SupabaseRepository) GetPostStats(postSlug string, githubUsername string) (*model.PostStats, error) {
	var stats model.PostStats

	err := r.db.QueryRow(`
		SELECT
			(SELECT COUNT(*) FROM post_likes WHERE post_id = bp.id),
			(SELECT COUNT(*) FROM post_comments WHERE post_id = bp.id)
		FROM blog_posts bp
		WHERE bp.slug = $1
	`, postSlug).Scan(&stats.LikeCount, &stats.CommentCount)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("blog post with slug %q not found", postSlug)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get post stats: %w", err)
	}

	if githubUsername != "" {
		var exists bool
		err = r.db.QueryRow(`
			SELECT EXISTS(
				SELECT 1 FROM post_likes
				WHERE post_id = (SELECT id FROM blog_posts WHERE slug = $1)
				AND github_username = $2
			)
		`, postSlug, githubUsername).Scan(&exists)
		if err != nil {
			return nil, fmt.Errorf("failed to check user like: %w", err)
		}
		stats.UserLiked = exists
	}

	return &stats, nil
}

// ToggleLike adds or removes a like. Returns true if liked, false if unliked.
func (r *SupabaseRepository) ToggleLike(postSlug string, githubUsername string) (bool, error) {
	_, err := r.db.Exec(`
		INSERT INTO post_likes (post_id, github_username)
		SELECT id, $2 FROM blog_posts WHERE slug = $1
	`, postSlug, githubUsername)
	if err != nil {
		// Check if it's a unique constraint violation
		if strings.Contains(err.Error(), "unique") || strings.Contains(err.Error(), "duplicate") {
			_, delErr := r.db.Exec(`
				DELETE FROM post_likes
				WHERE post_id = (SELECT id FROM blog_posts WHERE slug = $1)
				AND github_username = $2
			`, postSlug, githubUsername)
			if delErr != nil {
				return false, fmt.Errorf("failed to remove like: %w", delErr)
			}
			return false, nil
		}
		return false, fmt.Errorf("failed to toggle like: %w", err)
	}
	return true, nil
}

// GetComments returns all comments for a post by slug, newest first.
func (r *SupabaseRepository) GetComments(postSlug string) ([]model.PostComment, error) {
	rows, err := r.db.Query(`
		SELECT pc.id, pc.post_id, pc.github_username, pc.github_avatar_url, pc.github_profile_url, pc.message, pc.created_at
		FROM post_comments pc
		JOIN blog_posts bp ON bp.id = pc.post_id
		WHERE bp.slug = $1
		ORDER BY pc.created_at DESC
	`, postSlug)
	if err != nil {
		return nil, fmt.Errorf("failed to query comments: %w", err)
	}
	defer rows.Close()

	var comments []model.PostComment
	for rows.Next() {
		var c model.PostComment
		if err := rows.Scan(&c.ID, &c.PostID, &c.GitHubUsername, &c.GitHubAvatarURL, &c.GitHubProfileURL, &c.Message, &c.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan comment: %w", err)
		}
		comments = append(comments, c)
	}

	return comments, rows.Err()
}

// CreateComment adds a comment to a post by slug.
func (r *SupabaseRepository) CreateComment(postSlug string, username, avatarURL, profileURL, message string) (*model.PostComment, error) {
	var c model.PostComment
	err := r.db.QueryRow(`
		INSERT INTO post_comments (post_id, github_username, github_avatar_url, github_profile_url, message)
		SELECT id, $2, $3, $4, $5 FROM blog_posts WHERE slug = $1
		RETURNING id, post_id, github_username, github_avatar_url, github_profile_url, message, created_at
	`, postSlug, username, avatarURL, profileURL, message).Scan(
		&c.ID, &c.PostID, &c.GitHubUsername, &c.GitHubAvatarURL, &c.GitHubProfileURL, &c.Message, &c.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create comment: %w", err)
	}
	return &c, nil
}

// DeleteComment deletes a comment by ID (admin only).
func (r *SupabaseRepository) DeleteComment(id string) error {
	result, err := r.db.Exec(`DELETE FROM post_comments WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to delete comment: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("comment with id %q not found", id)
	}
	return nil
}
