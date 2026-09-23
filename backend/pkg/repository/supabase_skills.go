package repository

import (
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/model"
)

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

	tx, err := r.beginSkillWrite()
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	var d model.SkillDomain
	var slugNull sql.NullString
	var skillsRaw, battleTestedRaw []byte
	err = tx.QueryRow(`
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
	d.SortOrder, err = normalizeSkillOrder(tx, d.ID, sortOrder)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit skill changes: %w", err)
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

	tx, err := r.beginSkillWrite()
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	var d model.SkillDomain
	var slugNull sql.NullString
	var skillsRaw, battleTestedRaw []byte
	err = tx.QueryRow(`
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
	d.SortOrder, err = normalizeSkillOrder(tx, d.ID, sortOrder)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit skill changes: %w", err)
	}
	return &d, nil
}

// DeleteSkill deletes a skill domain by ID.
func (r *SupabaseRepository) DeleteSkill(id string) error {
	tx, err := r.beginSkillWrite()
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	result, err := tx.Exec(`DELETE FROM skills WHERE id = $1`, id)
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
	if _, err := normalizeSkillOrder(tx, "", 0); err != nil {
		return err
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit skill changes: %w", err)
	}
	return nil
}

// beginSkillWrite serializes skill writes, including inserts, before reading the
// current order. The lock lasts until commit; readers can still read normally.
func (r *SupabaseRepository) beginSkillWrite() (*sql.Tx, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to begin skill changes: %w", err)
	}
	if _, err := tx.Exec(`LOCK TABLE skills IN SHARE ROW EXCLUSIVE MODE`); err != nil {
		_ = tx.Rollback()
		return nil, fmt.Errorf("failed to lock skill order: %w", err)
	}
	return tx, nil
}

// normalizeSkillOrder inserts the changed skill at the requested zero-based
// position and renumbers the entire list. Excluding it first makes moves in both
// directions work even when old positions have duplicates or gaps. An empty ID
// means deletion: just close gaps in the remaining list.
func normalizeSkillOrder(tx *sql.Tx, changedID string, position int) (int, error) {
	rows, err := tx.Query(`SELECT id FROM skills WHERE id::text <> $1 ORDER BY sort_order, created_at, id`, changedID)
	if err != nil {
		return 0, fmt.Errorf("failed to read skill order: %w", err)
	}
	defer rows.Close()
	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return 0, fmt.Errorf("failed to scan skill order: %w", err)
		}
		ids = append(ids, id)
	}
	if err := rows.Err(); err != nil {
		return 0, fmt.Errorf("failed to read skill order: %w", err)
	}
	if changedID != "" {
		position = max(0, min(position, len(ids)))
		ids = append(ids, "")
		copy(ids[position+1:], ids[position:])
		ids[position] = changedID
	}
	for i, id := range ids {
		if _, err := tx.Exec(`UPDATE skills SET sort_order = $2 WHERE id = $1`, id, i); err != nil {
			return 0, fmt.Errorf("failed to renumber skills: %w", err)
		}
	}
	return position, nil
}
