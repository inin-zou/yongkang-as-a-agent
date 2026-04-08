package repository

import (
	"database/sql"
	"encoding/json"
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

// GetSkills returns all skill domains ordered by sort_order.
func (r *SupabaseRepository) GetSkills() ([]model.SkillDomain, error) {
	rows, err := r.db.Query(`
		SELECT id, title, slug, skills, battle_tested, sort_order
		FROM skills
		ORDER BY sort_order
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query skills: %w", err)
	}
	defer rows.Close()

	var domains []model.SkillDomain
	for rows.Next() {
		var d model.SkillDomain
		var slug sql.NullString
		var skillsRaw, battleTestedRaw []byte
		if err := rows.Scan(&d.ID, &d.Title, &slug, &skillsRaw, &battleTestedRaw, &d.SortOrder); err != nil {
			return nil, fmt.Errorf("failed to scan skill domain: %w", err)
		}
		if slug.Valid {
			d.Slug = slug.String
		}
		if len(skillsRaw) > 0 {
			if err := json.Unmarshal(skillsRaw, &d.Skills); err != nil {
				return nil, fmt.Errorf("failed to unmarshal skills: %w", err)
			}
		}
		if len(battleTestedRaw) > 0 {
			if err := json.Unmarshal(battleTestedRaw, &d.BattleTested); err != nil {
				return nil, fmt.Errorf("failed to unmarshal battle_tested: %w", err)
			}
		}
		domains = append(domains, d)
	}

	return domains, rows.Err()
}

// GetHackathons returns all hackathon entries from the hackathons table.
func (r *SupabaseRepository) GetHackathons() ([]model.Hackathon, error) {
	rows, err := r.db.Query(`
		SELECT id, date, name, city, country, lat, lng, is_remote, project_name, project_slug, project_url, result, solo, domain
		FROM hackathons
		ORDER BY date DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query hackathons: %w", err)
	}
	defer rows.Close()

	var hackathons []model.Hackathon
	for rows.Next() {
		var h model.Hackathon
		var city, country, projectSlug, projectURL, result sql.NullString
		var lat, lng sql.NullFloat64
		var isRemote, solo sql.NullBool
		if err := rows.Scan(
			&h.ID, &h.Date, &h.Name, &city, &country, &lat, &lng,
			&isRemote, &h.ProjectName, &projectSlug, &projectURL, &result, &solo, &h.Domain,
		); err != nil {
			return nil, fmt.Errorf("failed to scan hackathon: %w", err)
		}
		if city.Valid {
			h.City = city.String
		}
		if country.Valid {
			h.Country = country.String
		}
		if lat.Valid && lng.Valid {
			coords := [2]float64{lat.Float64, lng.Float64}
			h.Coordinates = &coords
		}
		if isRemote.Valid {
			h.IsRemote = isRemote.Bool
		}
		if projectSlug.Valid {
			h.ProjectSlug = projectSlug.String
		}
		if projectURL.Valid {
			h.ProjectURL = projectURL.String
		}
		if result.Valid {
			h.Result = result.String
		}
		if solo.Valid {
			h.Solo = solo.Bool
		}
		hackathons = append(hackathons, h)
	}

	return hackathons, rows.Err()
}

// GetExperience returns all experience entries ordered by sort_order.
func (r *SupabaseRepository) GetExperience() ([]model.Experience, error) {
	rows, err := r.db.Query(`
		SELECT id, role, company, location, start_date, end_date, skill_assembled, highlights, note, sort_order
		FROM experience
		ORDER BY sort_order
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query experience: %w", err)
	}
	defer rows.Close()

	var experiences []model.Experience
	for rows.Next() {
		var e model.Experience
		var endDate, note sql.NullString
		var highlightsRaw []byte
		if err := rows.Scan(
			&e.ID, &e.Role, &e.Company, &e.Location, &e.StartDate, &endDate,
			&e.SkillAssembled, &highlightsRaw, &note, &e.SortOrder,
		); err != nil {
			return nil, fmt.Errorf("failed to scan experience: %w", err)
		}
		if endDate.Valid {
			e.EndDate = endDate.String
		}
		if note.Valid {
			e.Note = note.String
		}
		if len(highlightsRaw) > 0 {
			if err := json.Unmarshal(highlightsRaw, &e.Highlights); err != nil {
				return nil, fmt.Errorf("failed to unmarshal highlights: %w", err)
			}
		}
		experiences = append(experiences, e)
	}

	return experiences, rows.Err()
}

// CreateSkill creates a new skill domain and returns it.
func (r *SupabaseRepository) CreateSkill(title, slug string, skills, battleTested []string, sortOrder int) (*model.SkillDomain, error) {
	skillsJSON, err := json.Marshal(skills)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal skills: %w", err)
	}
	battleTestedJSON, err := json.Marshal(battleTested)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal battle_tested: %w", err)
	}

	var d model.SkillDomain
	var slugNull sql.NullString
	var skillsRaw, battleTestedRaw []byte
	err = r.db.QueryRow(`
		INSERT INTO skills (title, slug, skills, battle_tested, sort_order)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, title, slug, skills, battle_tested, sort_order
	`, title, slug, skillsJSON, battleTestedJSON, sortOrder).Scan(&d.ID, &d.Title, &slugNull, &skillsRaw, &battleTestedRaw, &d.SortOrder)
	if err != nil {
		return nil, fmt.Errorf("failed to create skill: %w", err)
	}
	if slugNull.Valid {
		d.Slug = slugNull.String
	}
	if len(skillsRaw) > 0 {
		if err := json.Unmarshal(skillsRaw, &d.Skills); err != nil {
			return nil, fmt.Errorf("failed to unmarshal skills: %w", err)
		}
	}
	if len(battleTestedRaw) > 0 {
		if err := json.Unmarshal(battleTestedRaw, &d.BattleTested); err != nil {
			return nil, fmt.Errorf("failed to unmarshal battle_tested: %w", err)
		}
	}
	return &d, nil
}

// UpdateSkill updates an existing skill domain and returns it.
func (r *SupabaseRepository) UpdateSkill(id, title, slug string, skills, battleTested []string, sortOrder int) (*model.SkillDomain, error) {
	skillsJSON, err := json.Marshal(skills)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal skills: %w", err)
	}
	battleTestedJSON, err := json.Marshal(battleTested)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal battle_tested: %w", err)
	}

	var d model.SkillDomain
	var slugNull sql.NullString
	var skillsRaw, battleTestedRaw []byte
	err = r.db.QueryRow(`
		UPDATE skills
		SET title = $2, slug = $3, skills = $4, battle_tested = $5, sort_order = $6
		WHERE id = $1
		RETURNING id, title, slug, skills, battle_tested, sort_order
	`, id, title, slug, skillsJSON, battleTestedJSON, sortOrder).Scan(&d.ID, &d.Title, &slugNull, &skillsRaw, &battleTestedRaw, &d.SortOrder)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("skill with id %q not found", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update skill: %w", err)
	}
	if slugNull.Valid {
		d.Slug = slugNull.String
	}
	if len(skillsRaw) > 0 {
		if err := json.Unmarshal(skillsRaw, &d.Skills); err != nil {
			return nil, fmt.Errorf("failed to unmarshal skills: %w", err)
		}
	}
	if len(battleTestedRaw) > 0 {
		if err := json.Unmarshal(battleTestedRaw, &d.BattleTested); err != nil {
			return nil, fmt.Errorf("failed to unmarshal battle_tested: %w", err)
		}
	}
	return &d, nil
}

// DeleteSkill deletes a skill domain by ID.
func (r *SupabaseRepository) DeleteSkill(id string) error {
	result, err := r.db.Exec(`DELETE FROM skills WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to delete skill: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("skill with id %q not found", id)
	}
	return nil
}

// CreateHackathon creates a new hackathon entry and returns it.
func (r *SupabaseRepository) CreateHackathon(h model.Hackathon) (*model.Hackathon, error) {
	var lat, lng *float64
	if h.Coordinates != nil {
		lat = &h.Coordinates[0]
		lng = &h.Coordinates[1]
	} else if h.Lat != nil && h.Lng != nil {
		lat = h.Lat
		lng = h.Lng
	}

	var result model.Hackathon
	var city, country, projectSlug, projectURL, resultStr sql.NullString
	var latNull, lngNull sql.NullFloat64
	var isRemote, solo sql.NullBool
	err := r.db.QueryRow(`
		INSERT INTO hackathons (date, name, city, country, lat, lng, is_remote, project_name, project_slug, project_url, result, solo, domain)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING id, date, name, city, country, lat, lng, is_remote, project_name, project_slug, project_url, result, solo, domain
	`, h.Date, h.Name, nullStr(h.City), nullStr(h.Country), lat, lng,
		h.IsRemote, h.ProjectName, nullStr(h.ProjectSlug), nullStr(h.ProjectURL),
		nullStr(h.Result), h.Solo, h.Domain,
	).Scan(
		&result.ID, &result.Date, &result.Name, &city, &country, &latNull, &lngNull,
		&isRemote, &result.ProjectName, &projectSlug, &projectURL, &resultStr, &solo, &result.Domain,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create hackathon: %w", err)
	}
	if city.Valid {
		result.City = city.String
	}
	if country.Valid {
		result.Country = country.String
	}
	if latNull.Valid && lngNull.Valid {
		coords := [2]float64{latNull.Float64, lngNull.Float64}
		result.Coordinates = &coords
	}
	if isRemote.Valid {
		result.IsRemote = isRemote.Bool
	}
	if projectSlug.Valid {
		result.ProjectSlug = projectSlug.String
	}
	if projectURL.Valid {
		result.ProjectURL = projectURL.String
	}
	if resultStr.Valid {
		result.Result = resultStr.String
	}
	if solo.Valid {
		result.Solo = solo.Bool
	}
	return &result, nil
}

// UpdateHackathon updates an existing hackathon entry and returns it.
func (r *SupabaseRepository) UpdateHackathon(id string, h model.Hackathon) (*model.Hackathon, error) {
	var lat, lng *float64
	if h.Coordinates != nil {
		lat = &h.Coordinates[0]
		lng = &h.Coordinates[1]
	} else if h.Lat != nil && h.Lng != nil {
		lat = h.Lat
		lng = h.Lng
	}

	var result model.Hackathon
	var city, country, projectSlug, projectURL, resultStr sql.NullString
	var latNull, lngNull sql.NullFloat64
	var isRemote, solo sql.NullBool
	err := r.db.QueryRow(`
		UPDATE hackathons
		SET date = $2, name = $3, city = $4, country = $5, lat = $6, lng = $7,
		    is_remote = $8, project_name = $9, project_slug = $10, project_url = $11,
		    result = $12, solo = $13, domain = $14
		WHERE id = $1
		RETURNING id, date, name, city, country, lat, lng, is_remote, project_name, project_slug, project_url, result, solo, domain
	`, id, h.Date, h.Name, nullStr(h.City), nullStr(h.Country), lat, lng,
		h.IsRemote, h.ProjectName, nullStr(h.ProjectSlug), nullStr(h.ProjectURL),
		nullStr(h.Result), h.Solo, h.Domain,
	).Scan(
		&result.ID, &result.Date, &result.Name, &city, &country, &latNull, &lngNull,
		&isRemote, &result.ProjectName, &projectSlug, &projectURL, &resultStr, &solo, &result.Domain,
	)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("hackathon with id %q not found", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update hackathon: %w", err)
	}
	if city.Valid {
		result.City = city.String
	}
	if country.Valid {
		result.Country = country.String
	}
	if latNull.Valid && lngNull.Valid {
		coords := [2]float64{latNull.Float64, lngNull.Float64}
		result.Coordinates = &coords
	}
	if isRemote.Valid {
		result.IsRemote = isRemote.Bool
	}
	if projectSlug.Valid {
		result.ProjectSlug = projectSlug.String
	}
	if projectURL.Valid {
		result.ProjectURL = projectURL.String
	}
	if resultStr.Valid {
		result.Result = resultStr.String
	}
	if solo.Valid {
		result.Solo = solo.Bool
	}
	return &result, nil
}

// DeleteHackathon deletes a hackathon entry by ID.
func (r *SupabaseRepository) DeleteHackathon(id string) error {
	result, err := r.db.Exec(`DELETE FROM hackathons WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to delete hackathon: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("hackathon with id %q not found", id)
	}
	return nil
}

// CreateExperience creates a new experience entry and returns it.
func (r *SupabaseRepository) CreateExperience(e model.Experience) (*model.Experience, error) {
	highlightsJSON, err := json.Marshal(e.Highlights)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal highlights: %w", err)
	}

	var result model.Experience
	var endDate, note sql.NullString
	var highlightsRaw []byte
	err = r.db.QueryRow(`
		INSERT INTO experience (role, company, location, start_date, end_date, skill_assembled, highlights, note, sort_order)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, role, company, location, start_date, end_date, skill_assembled, highlights, note, sort_order
	`, e.Role, e.Company, e.Location, e.StartDate, nullStr(e.EndDate),
		e.SkillAssembled, highlightsJSON, nullStr(e.Note), e.SortOrder,
	).Scan(
		&result.ID, &result.Role, &result.Company, &result.Location, &result.StartDate,
		&endDate, &result.SkillAssembled, &highlightsRaw, &note, &result.SortOrder,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create experience: %w", err)
	}
	if endDate.Valid {
		result.EndDate = endDate.String
	}
	if note.Valid {
		result.Note = note.String
	}
	if len(highlightsRaw) > 0 {
		if err := json.Unmarshal(highlightsRaw, &result.Highlights); err != nil {
			return nil, fmt.Errorf("failed to unmarshal highlights: %w", err)
		}
	}
	return &result, nil
}

// UpdateExperience updates an existing experience entry and returns it.
func (r *SupabaseRepository) UpdateExperience(id string, e model.Experience) (*model.Experience, error) {
	highlightsJSON, err := json.Marshal(e.Highlights)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal highlights: %w", err)
	}

	var result model.Experience
	var endDate, note sql.NullString
	var highlightsRaw []byte
	err = r.db.QueryRow(`
		UPDATE experience
		SET role = $2, company = $3, location = $4, start_date = $5, end_date = $6,
		    skill_assembled = $7, highlights = $8, note = $9, sort_order = $10
		WHERE id = $1
		RETURNING id, role, company, location, start_date, end_date, skill_assembled, highlights, note, sort_order
	`, id, e.Role, e.Company, e.Location, e.StartDate, nullStr(e.EndDate),
		e.SkillAssembled, highlightsJSON, nullStr(e.Note), e.SortOrder,
	).Scan(
		&result.ID, &result.Role, &result.Company, &result.Location, &result.StartDate,
		&endDate, &result.SkillAssembled, &highlightsRaw, &note, &result.SortOrder,
	)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("experience with id %q not found", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update experience: %w", err)
	}
	if endDate.Valid {
		result.EndDate = endDate.String
	}
	if note.Valid {
		result.Note = note.String
	}
	if len(highlightsRaw) > 0 {
		if err := json.Unmarshal(highlightsRaw, &result.Highlights); err != nil {
			return nil, fmt.Errorf("failed to unmarshal highlights: %w", err)
		}
	}
	return &result, nil
}

// DeleteExperience deletes an experience entry by ID.
func (r *SupabaseRepository) DeleteExperience(id string) error {
	result, err := r.db.Exec(`DELETE FROM experience WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to delete experience: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("experience with id %q not found", id)
	}
	return nil
}

// nullStr returns a *string pointer: nil if empty, otherwise a pointer to the value.
func nullStr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// GetPage returns the JSONB content of a page by ID.
func (r *SupabaseRepository) GetPage(id string) (json.RawMessage, error) {
	var content json.RawMessage
	err := r.db.QueryRow(`
		SELECT content FROM pages WHERE id = $1
	`, id).Scan(&content)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get page %q: %w", id, err)
	}
	return content, nil
}

// UpdatePage updates the JSONB content of a page and returns it.
func (r *SupabaseRepository) UpdatePage(id string, content json.RawMessage) (json.RawMessage, error) {
	var updated json.RawMessage
	err := r.db.QueryRow(`
		UPDATE pages SET content = $1, updated_at = now() WHERE id = $2 RETURNING content
	`, content, id).Scan(&updated)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("page with id %q not found", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update page %q: %w", id, err)
	}
	return updated, nil
}

// GetMusicTracks returns all music tracks ordered by sort_order.
func (r *SupabaseRepository) GetMusicTracks() ([]model.MusicTrack, error) {
	rows, err := r.db.Query(`
		SELECT id, slug, name, genre, original, notes, file_url, sort_order
		FROM music_tracks
		ORDER BY sort_order
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query music tracks: %w", err)
	}
	defer rows.Close()

	var tracks []model.MusicTrack
	for rows.Next() {
		var t model.MusicTrack
		if err := rows.Scan(&t.ID, &t.Slug, &t.Name, &t.Genre, &t.Original, &t.Notes, &t.FileURL, &t.SortOrder); err != nil {
			return nil, fmt.Errorf("failed to scan music track: %w", err)
		}
		tracks = append(tracks, t)
	}

	return tracks, rows.Err()
}

// CreateMusicTrack creates a new music track and returns it.
func (r *SupabaseRepository) CreateMusicTrack(slug, name, genre, original, notes, fileURL string, sortOrder int) (*model.MusicTrack, error) {
	var t model.MusicTrack
	err := r.db.QueryRow(`
		INSERT INTO music_tracks (slug, name, genre, original, notes, file_url, sort_order)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, slug, name, genre, original, notes, file_url, sort_order
	`, slug, name, genre, original, notes, fileURL, sortOrder).Scan(
		&t.ID, &t.Slug, &t.Name, &t.Genre, &t.Original, &t.Notes, &t.FileURL, &t.SortOrder,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create music track: %w", err)
	}
	return &t, nil
}

// UpdateMusicTrack updates an existing music track and returns it.
func (r *SupabaseRepository) UpdateMusicTrack(id, slug, name, genre, original, notes, fileURL string, sortOrder int) (*model.MusicTrack, error) {
	var t model.MusicTrack
	err := r.db.QueryRow(`
		UPDATE music_tracks
		SET slug = $2, name = $3, genre = $4, original = $5, notes = $6, file_url = $7, sort_order = $8
		WHERE id = $1
		RETURNING id, slug, name, genre, original, notes, file_url, sort_order
	`, id, slug, name, genre, original, notes, fileURL, sortOrder).Scan(
		&t.ID, &t.Slug, &t.Name, &t.Genre, &t.Original, &t.Notes, &t.FileURL, &t.SortOrder,
	)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("music track with id %q not found", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update music track: %w", err)
	}
	return &t, nil
}

// DeleteMusicTrack deletes a music track by ID.
func (r *SupabaseRepository) DeleteMusicTrack(id string) error {
	result, err := r.db.Exec(`DELETE FROM music_tracks WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to delete music track: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("music track with id %q not found", id)
	}
	return nil
}

// GetProjects is not available in Supabase.
func (r *SupabaseRepository) GetProjects() ([]model.Project, error) {
	return nil, fmt.Errorf("not available in supabase")
}

// GetProjectBySlug is not available in Supabase.
func (r *SupabaseRepository) GetProjectBySlug(slug string) (*model.Project, error) {
	return nil, fmt.Errorf("not available in supabase")
}

// GetProjectsByCategory is not available in Supabase.
func (r *SupabaseRepository) GetProjectsByCategory(category string) ([]model.Project, error) {
	return nil, fmt.Errorf("not available in supabase")
}

// GetMusic is not available in Supabase.
func (r *SupabaseRepository) GetMusic() (*model.Music, error) {
	return nil, fmt.Errorf("not available in supabase")
}
