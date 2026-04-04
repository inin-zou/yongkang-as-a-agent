package repository

import (
	"database/sql"
	"fmt"
	"strings"

	_ "github.com/lib/pq"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/model"
)

// SupabaseRepository handles dynamic data stored in Supabase/PostgreSQL.
type SupabaseRepository struct {
	db *sql.DB
}

// NewSupabaseRepository connects to Supabase and returns a repository.
func NewSupabaseRepository(databaseURL string) (*SupabaseRepository, error) {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)

	return &SupabaseRepository{db: db}, nil
}

// Close closes the database connection.
func (r *SupabaseRepository) Close() error {
	return r.db.Close()
}

// GetBlogPosts returns all published blog posts, newest first.
func (r *SupabaseRepository) GetBlogPosts() ([]model.BlogPost, error) {
	rows, err := r.db.Query(`
		SELECT id, slug, title, content, preview, published_at
		FROM blog_posts
		ORDER BY published_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query blog posts: %w", err)
	}
	defer rows.Close()

	var posts []model.BlogPost
	for rows.Next() {
		var p model.BlogPost
		if err := rows.Scan(&p.ID, &p.Slug, &p.Title, &p.Content, &p.Preview, &p.PublishedAt); err != nil {
			return nil, fmt.Errorf("failed to scan blog post: %w", err)
		}
		posts = append(posts, p)
	}

	return posts, rows.Err()
}

// GetBlogPostBySlug returns a single blog post by slug.
func (r *SupabaseRepository) GetBlogPostBySlug(slug string) (*model.BlogPost, error) {
	var p model.BlogPost
	err := r.db.QueryRow(`
		SELECT id, slug, title, content, preview, published_at
		FROM blog_posts
		WHERE slug = $1
	`, slug).Scan(&p.ID, &p.Slug, &p.Title, &p.Content, &p.Preview, &p.PublishedAt)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("blog post with slug %q not found", slug)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to query blog post: %w", err)
	}

	return &p, nil
}

// CreateFeedback inserts a new feedback entry.
func (r *SupabaseRepository) CreateFeedback(name, message string) error {
	_, err := r.db.Exec(`
		INSERT INTO feedback (name, message) VALUES ($1, $2)
	`, name, message)
	if err != nil {
		return fmt.Errorf("failed to insert feedback: %w", err)
	}
	return nil
}

// CreateContactSubmission persists a contact form submission.
func (r *SupabaseRepository) CreateContactSubmission(name, email, message string) error {
	_, err := r.db.Exec(`
		INSERT INTO contact_submissions (name, email, message) VALUES ($1, $2, $3)
	`, name, email, strings.TrimSpace(message))
	if err != nil {
		return fmt.Errorf("failed to insert contact submission: %w", err)
	}
	return nil
}

// CreateBlogPost creates a new blog post and returns it.
func (r *SupabaseRepository) CreateBlogPost(slug, title, content, preview string) (*model.BlogPost, error) {
	var p model.BlogPost
	err := r.db.QueryRow(`
		INSERT INTO blog_posts (slug, title, content, preview)
		VALUES ($1, $2, $3, $4)
		RETURNING id, slug, title, content, preview, published_at
	`, slug, title, content, preview).Scan(&p.ID, &p.Slug, &p.Title, &p.Content, &p.Preview, &p.PublishedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create blog post: %w", err)
	}
	return &p, nil
}

// UpdateBlogPost updates an existing blog post and returns it.
func (r *SupabaseRepository) UpdateBlogPost(id, slug, title, content, preview string) (*model.BlogPost, error) {
	var p model.BlogPost
	err := r.db.QueryRow(`
		UPDATE blog_posts
		SET slug = $2, title = $3, content = $4, preview = $5
		WHERE id = $1
		RETURNING id, slug, title, content, preview, published_at
	`, id, slug, title, content, preview).Scan(&p.ID, &p.Slug, &p.Title, &p.Content, &p.Preview, &p.PublishedAt)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("blog post with id %q not found", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update blog post: %w", err)
	}
	return &p, nil
}

// DeleteBlogPost deletes a blog post by ID.
func (r *SupabaseRepository) DeleteBlogPost(id string) error {
	result, err := r.db.Exec(`DELETE FROM blog_posts WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to delete blog post: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("blog post with id %q not found", id)
	}
	return nil
}

// GetFeedback returns all feedback entries, newest first.
func (r *SupabaseRepository) GetFeedback() ([]model.Feedback, error) {
	rows, err := r.db.Query(`
		SELECT id, name, message, created_at
		FROM feedback
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query feedback: %w", err)
	}
	defer rows.Close()

	var entries []model.Feedback
	for rows.Next() {
		var f model.Feedback
		if err := rows.Scan(&f.ID, &f.Name, &f.Message, &f.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan feedback: %w", err)
		}
		entries = append(entries, f)
	}
	return entries, rows.Err()
}

// DeleteFeedback deletes a feedback entry by ID.
func (r *SupabaseRepository) DeleteFeedback(id string) error {
	result, err := r.db.Exec(`DELETE FROM feedback WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to delete feedback: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("feedback with id %q not found", id)
	}
	return nil
}

// IncrementAndGetViews atomically increments the page view count and returns it.
func (r *SupabaseRepository) IncrementAndGetViews() (int64, error) {
	var count int64
	err := r.db.QueryRow(`
		UPDATE page_views SET count = count + 1 WHERE id = 1 RETURNING count
	`).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to increment views: %w", err)
	}
	return count, nil
}

// GetGuestbook returns all guestbook entries, newest first.
func (r *SupabaseRepository) GetGuestbook() ([]model.GuestbookEntry, error) {
	rows, err := r.db.Query(`
		SELECT id, github_username, github_avatar_url, github_profile_url, message, created_at
		FROM guestbook
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query guestbook: %w", err)
	}
	defer rows.Close()

	var entries []model.GuestbookEntry
	for rows.Next() {
		var e model.GuestbookEntry
		if err := rows.Scan(&e.ID, &e.GitHubUsername, &e.GitHubAvatarURL, &e.GitHubProfileURL, &e.Message, &e.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan guestbook entry: %w", err)
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}

// CreateGuestbookEntry adds a new guestbook comment.
func (r *SupabaseRepository) CreateGuestbookEntry(username, avatarURL, profileURL, message string) (*model.GuestbookEntry, error) {
	var e model.GuestbookEntry
	err := r.db.QueryRow(`
		INSERT INTO guestbook (github_username, github_avatar_url, github_profile_url, message)
		VALUES ($1, $2, $3, $4)
		RETURNING id, github_username, github_avatar_url, github_profile_url, message, created_at
	`, username, avatarURL, profileURL, message).Scan(&e.ID, &e.GitHubUsername, &e.GitHubAvatarURL, &e.GitHubProfileURL, &e.Message, &e.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create guestbook entry: %w", err)
	}
	return &e, nil
}

// DeleteGuestbookEntry deletes a guestbook entry by ID.
func (r *SupabaseRepository) DeleteGuestbookEntry(id string) error {
	result, err := r.db.Exec(`DELETE FROM guestbook WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to delete guestbook entry: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("guestbook entry with id %q not found", id)
	}
	return nil
}

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

// GetNotifications returns all admin notifications, newest first.
func (r *SupabaseRepository) GetNotifications() ([]model.AdminNotification, error) {
	rows, err := r.db.Query(`
		SELECT id, type, message, post_id, is_read, created_at
		FROM admin_notifications
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query notifications: %w", err)
	}
	defer rows.Close()

	var notifications []model.AdminNotification
	for rows.Next() {
		var n model.AdminNotification
		if err := rows.Scan(&n.ID, &n.Type, &n.Message, &n.PostID, &n.IsRead, &n.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan notification: %w", err)
		}
		notifications = append(notifications, n)
	}

	return notifications, rows.Err()
}

// GetUnreadNotificationCount returns count of unread notifications.
func (r *SupabaseRepository) GetUnreadNotificationCount() (int, error) {
	var count int
	err := r.db.QueryRow(`SELECT COUNT(*) FROM admin_notifications WHERE is_read = false`).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count unread notifications: %w", err)
	}
	return count, nil
}

// MarkNotificationRead marks a notification as read.
func (r *SupabaseRepository) MarkNotificationRead(id string) error {
	result, err := r.db.Exec(`UPDATE admin_notifications SET is_read = true WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to mark notification read: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("notification with id %q not found", id)
	}
	return nil
}

// MarkAllNotificationsRead marks all notifications as read.
func (r *SupabaseRepository) MarkAllNotificationsRead() error {
	_, err := r.db.Exec(`UPDATE admin_notifications SET is_read = true WHERE is_read = false`)
	if err != nil {
		return fmt.Errorf("failed to mark all notifications read: %w", err)
	}
	return nil
}

// GetViews returns the current page view count.
func (r *SupabaseRepository) GetViews() (int64, error) {
	var count int64
	err := r.db.QueryRow(`SELECT count FROM page_views WHERE id = 1`).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to get views: %w", err)
	}
	return count, nil
}
