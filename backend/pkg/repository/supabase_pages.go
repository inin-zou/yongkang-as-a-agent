package repository

import (
	"database/sql"
	"encoding/json"
	"fmt"
)

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
