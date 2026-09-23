package repository

import (
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/model"
)

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
