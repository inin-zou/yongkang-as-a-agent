package repository

import (
	"fmt"
)

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

// GetViews returns the current page view count.
func (r *SupabaseRepository) GetViews() (int64, error) {
	var count int64
	err := r.db.QueryRow(`SELECT count FROM page_views WHERE id = 1`).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to get views: %w", err)
	}
	return count, nil
}
