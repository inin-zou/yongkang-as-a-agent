package repository

import (
	"database/sql"
	"fmt"

	"github.com/lib/pq"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/model"
)

// GetBlogPosts returns all published blog posts, newest first.
func (r *SupabaseRepository) GetBlogPosts() ([]model.BlogPost, error) {
	rows, err := r.db.Query(`
		SELECT id, slug, title, content, preview, category, published_at, updated_at, archived, tags, result
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
		if err := rows.Scan(&p.ID, &p.Slug, &p.Title, &p.Content, &p.Preview, &p.Category, &p.PublishedAt, &p.UpdatedAt, &p.Archived, pq.Array(&p.Tags), &p.Result); err != nil {
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
		SELECT id, slug, title, content, preview, category, published_at, updated_at, archived, tags, result
		FROM blog_posts
		WHERE slug = $1
	`, slug).Scan(&p.ID, &p.Slug, &p.Title, &p.Content, &p.Preview, &p.Category, &p.PublishedAt, &p.UpdatedAt, &p.Archived, pq.Array(&p.Tags), &p.Result)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("blog post with slug %q not found", slug)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to query blog post: %w", err)
	}

	return &p, nil
}

// CreateBlogPost creates a new blog post and returns it.
func (r *SupabaseRepository) CreateBlogPost(slug, title, content, preview, category, publishedAt, result string, tags []string) (*model.BlogPost, error) {
	var p model.BlogPost
	var err error
	if publishedAt != "" {
		err = r.db.QueryRow(`
			INSERT INTO blog_posts (slug, title, content, preview, category, tags, result, published_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz)
			RETURNING id, slug, title, content, preview, category, published_at, updated_at, archived, tags, result
		`, slug, title, content, preview, category, pq.Array(nonNil(tags)), result, publishedAt+"T00:00:00Z").Scan(&p.ID, &p.Slug, &p.Title, &p.Content, &p.Preview, &p.Category, &p.PublishedAt, &p.UpdatedAt, &p.Archived, pq.Array(&p.Tags), &p.Result)
	} else {
		err = r.db.QueryRow(`
			INSERT INTO blog_posts (slug, title, content, preview, category, tags, result)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			RETURNING id, slug, title, content, preview, category, published_at, updated_at, archived, tags, result
		`, slug, title, content, preview, category, pq.Array(nonNil(tags)), result).Scan(&p.ID, &p.Slug, &p.Title, &p.Content, &p.Preview, &p.Category, &p.PublishedAt, &p.UpdatedAt, &p.Archived, pq.Array(&p.Tags), &p.Result)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to create blog post: %w", err)
	}
	return &p, nil
}

// UpdateBlogPost updates an existing blog post and returns it.
func (r *SupabaseRepository) UpdateBlogPost(id, slug, title, content, preview, category, publishedAt, updatedAt string, archived *bool, tags *[]string, result *string) (*model.BlogPost, error) {
	var p model.BlogPost

	// Use provided dates or default to now() for updated_at
	pubExpr := "published_at"
	updExpr := "now()"
	args := []interface{}{id, slug, title, content, preview, category}
	argIdx := 7

	if publishedAt != "" {
		pubExpr = fmt.Sprintf("$%d::timestamptz", argIdx)
		args = append(args, publishedAt+"T00:00:00Z")
		argIdx++
	}
	if updatedAt != "" {
		updExpr = fmt.Sprintf("$%d::timestamptz", argIdx)
		args = append(args, updatedAt+"T00:00:00Z")
		argIdx++
	}

	archiveExpr := "archived"
	if archived != nil {
		archiveExpr = fmt.Sprintf("$%d", argIdx)
		args = append(args, *archived)
		argIdx++
	}
	// Omitted meta fields keep their stored value.
	tagsExpr, resultExpr := "tags", "result"
	if tags != nil {
		tagsExpr = fmt.Sprintf("$%d", argIdx)
		args = append(args, pq.Array(nonNil(*tags)))
		argIdx++
	}
	if result != nil {
		resultExpr = fmt.Sprintf("$%d", argIdx)
		args = append(args, *result)
	}

	query := fmt.Sprintf(`
		UPDATE blog_posts
		SET slug = $2, title = $3, content = $4, preview = $5, category = $6,
		    published_at = %s, updated_at = %s, archived = %s, tags = %s, result = %s
		WHERE id = $1
		RETURNING id, slug, title, content, preview, category, published_at, updated_at, archived, tags, result
	`, pubExpr, updExpr, archiveExpr, tagsExpr, resultExpr)

	err := r.db.QueryRow(query, args...).Scan(&p.ID, &p.Slug, &p.Title, &p.Content, &p.Preview, &p.Category, &p.PublishedAt, &p.UpdatedAt, &p.Archived, pq.Array(&p.Tags), &p.Result)
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

// SetBlogPostArchived flips only the archive flag; content and dates are untouched.
func (r *SupabaseRepository) SetBlogPostArchived(id string, archived bool) error {
	result, err := r.db.Exec(`UPDATE blog_posts SET archived = $2 WHERE id = $1`, id, archived)
	if err != nil {
		return fmt.Errorf("failed to update blog post archive status: %w", err)
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

// nonNil keeps an empty tag list from being written as SQL NULL.
func nonNil(tags []string) []string {
	if tags == nil {
		return []string{}
	}
	return tags
}
