package repository

import (
	"database/sql"
	"fmt"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/model"
)

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
