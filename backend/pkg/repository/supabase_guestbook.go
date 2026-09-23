package repository

import (
	"fmt"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/model"
)

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
