package repository

import (
	"database/sql"
	"fmt"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/model"
)

// GetProjectStatuses returns all project statuses ordered by sort_order.
func (r *SupabaseRepository) GetProjectStatuses() ([]model.ProjectStatus, error) {
	rows, err := r.db.Query(`
		SELECT id, name, status, description, next_step, links, sort_order
		FROM projects_status
		ORDER BY sort_order
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query project statuses: %w", err)
	}
	defer rows.Close()

	var statuses []model.ProjectStatus
	for rows.Next() {
		var p model.ProjectStatus
		var nextStep, links sql.NullString
		if err := rows.Scan(&p.ID, &p.Name, &p.Status, &p.Description, &nextStep, &links, &p.SortOrder); err != nil {
			return nil, fmt.Errorf("failed to scan project status: %w", err)
		}
		if nextStep.Valid {
			p.NextStep = nextStep.String
		}
		if links.Valid {
			p.Links = links.String
		}
		statuses = append(statuses, p)
	}

	return statuses, rows.Err()
}

// CreateProjectStatus creates a new project status and returns it.
func (r *SupabaseRepository) CreateProjectStatus(name, status, description, nextStep, links string, sortOrder int) (*model.ProjectStatus, error) {
	var p model.ProjectStatus
	var nextStepNull, linksNull sql.NullString
	err := r.db.QueryRow(`
		INSERT INTO projects_status (name, status, description, next_step, links, sort_order)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, name, status, description, next_step, links, sort_order
	`, name, status, description, toNullString(nextStep), toNullString(links), sortOrder).Scan(&p.ID, &p.Name, &p.Status, &p.Description, &nextStepNull, &linksNull, &p.SortOrder)
	if err != nil {
		return nil, fmt.Errorf("failed to create project status: %w", err)
	}
	if nextStepNull.Valid {
		p.NextStep = nextStepNull.String
	}
	if linksNull.Valid {
		p.Links = linksNull.String
	}
	return &p, nil
}

// UpdateProjectStatus updates an existing project status and returns it.
func (r *SupabaseRepository) UpdateProjectStatus(id, name, status, description, nextStep, links string, sortOrder int) (*model.ProjectStatus, error) {
	var p model.ProjectStatus
	var nextStepNull, linksNull sql.NullString
	err := r.db.QueryRow(`
		UPDATE projects_status
		SET name = $2, status = $3, description = $4, next_step = $5, links = $6, sort_order = $7
		WHERE id = $1
		RETURNING id, name, status, description, next_step, links, sort_order
	`, id, name, status, description, toNullString(nextStep), toNullString(links), sortOrder).Scan(&p.ID, &p.Name, &p.Status, &p.Description, &nextStepNull, &linksNull, &p.SortOrder)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("project status with id %q not found", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update project status: %w", err)
	}
	if nextStepNull.Valid {
		p.NextStep = nextStepNull.String
	}
	if linksNull.Valid {
		p.Links = linksNull.String
	}
	return &p, nil
}

// DeleteProjectStatus deletes a project status by ID.
func (r *SupabaseRepository) DeleteProjectStatus(id string) error {
	result, err := r.db.Exec(`DELETE FROM projects_status WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to delete project status: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("project status with id %q not found", id)
	}
	return nil
}
