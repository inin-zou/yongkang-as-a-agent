package repository

import (
	"fmt"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/model"
	"strings"
)

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
