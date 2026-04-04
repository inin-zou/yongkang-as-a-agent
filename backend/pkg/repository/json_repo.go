package repository

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/model"
)

// JSONRepository reads portfolio data from JSON files on disk.
type JSONRepository struct {
	dataDir string
}

// NewJSONRepository creates a new JSONRepository rooted at the given data directory.
func NewJSONRepository(dataDir string) *JSONRepository {
	return &JSONRepository{dataDir: dataDir}
}

// GetProjects returns all projects from projects.json.
func (r *JSONRepository) GetProjects() ([]model.Project, error) {
	data, err := os.ReadFile(filepath.Join(r.dataDir, "projects.json"))
	if err != nil {
		return nil, fmt.Errorf("failed to read projects.json: %w", err)
	}

	var projects []model.Project
	if err := json.Unmarshal(data, &projects); err != nil {
		return nil, fmt.Errorf("failed to unmarshal projects.json: %w", err)
	}

	return projects, nil
}

// GetProjectBySlug returns a single project matching the given slug, or an error if not found.
func (r *JSONRepository) GetProjectBySlug(slug string) (*model.Project, error) {
	projects, err := r.GetProjects()
	if err != nil {
		return nil, err
	}

	for i := range projects {
		if projects[i].Slug == slug {
			return &projects[i], nil
		}
	}

	return nil, fmt.Errorf("project with slug %q not found", slug)
}

// GetProjectsByCategory returns all projects matching the given category.
func (r *JSONRepository) GetProjectsByCategory(category string) ([]model.Project, error) {
	projects, err := r.GetProjects()
	if err != nil {
		return nil, err
	}

	filtered := make([]model.Project, 0)
	for _, p := range projects {
		if p.Category == category {
			filtered = append(filtered, p)
		}
	}

	return filtered, nil
}

// GetHackathons returns all hackathons from hackathons.json.
func (r *JSONRepository) GetHackathons() ([]model.Hackathon, error) {
	data, err := os.ReadFile(filepath.Join(r.dataDir, "hackathons.json"))
	if err != nil {
		return nil, fmt.Errorf("failed to read hackathons.json: %w", err)
	}

	var hackathons []model.Hackathon
	if err := json.Unmarshal(data, &hackathons); err != nil {
		return nil, fmt.Errorf("failed to unmarshal hackathons.json: %w", err)
	}

	return hackathons, nil
}

// GetExperience returns all experiences from experience.json.
func (r *JSONRepository) GetExperience() ([]model.Experience, error) {
	data, err := os.ReadFile(filepath.Join(r.dataDir, "experience.json"))
	if err != nil {
		return nil, fmt.Errorf("failed to read experience.json: %w", err)
	}

	var experience []model.Experience
	if err := json.Unmarshal(data, &experience); err != nil {
		return nil, fmt.Errorf("failed to unmarshal experience.json: %w", err)
	}

	return experience, nil
}

// GetSkills returns all skill domains from skills.json.
func (r *JSONRepository) GetSkills() ([]model.SkillDomain, error) {
	data, err := os.ReadFile(filepath.Join(r.dataDir, "skills.json"))
	if err != nil {
		return nil, fmt.Errorf("failed to read skills.json: %w", err)
	}

	var skills []model.SkillDomain
	if err := json.Unmarshal(data, &skills); err != nil {
		return nil, fmt.Errorf("failed to unmarshal skills.json: %w", err)
	}

	return skills, nil
}

// GetMusic returns the music profile from music.json.
func (r *JSONRepository) GetMusic() (*model.Music, error) {
	data, err := os.ReadFile(filepath.Join(r.dataDir, "music.json"))
	if err != nil {
		return nil, fmt.Errorf("failed to read music.json: %w", err)
	}

	var music model.Music
	if err := json.Unmarshal(data, &music); err != nil {
		return nil, fmt.Errorf("failed to unmarshal music.json: %w", err)
	}

	return &music, nil
}
