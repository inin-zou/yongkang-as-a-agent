package repository

import (
	"database/sql"
	"fmt"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/model"
)

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
