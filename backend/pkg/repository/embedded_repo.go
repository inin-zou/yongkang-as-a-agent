package repository

import (
	"embed"
	"encoding/json"
	"fmt"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/model"
)

// EmbeddedRepository reads portfolio data from embedded JSON files.
type EmbeddedRepository struct {
	fs embed.FS
}

// NewEmbeddedRepository creates a new repository using the given embedded FS.
func NewEmbeddedRepository(fs embed.FS) *EmbeddedRepository {
	return &EmbeddedRepository{fs: fs}
}

func (r *EmbeddedRepository) GetProjects() ([]model.Project, error) {
	data, err := r.fs.ReadFile("data/projects.json")
	if err != nil {
		return nil, fmt.Errorf("failed to read projects.json: %w", err)
	}
	var result []model.Project
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal projects.json: %w", err)
	}
	return result, nil
}

func (r *EmbeddedRepository) GetProjectBySlug(slug string) (*model.Project, error) {
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

func (r *EmbeddedRepository) GetProjectsByCategory(category string) ([]model.Project, error) {
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

func (r *EmbeddedRepository) GetHackathons() ([]model.Hackathon, error) {
	data, err := r.fs.ReadFile("data/hackathons.json")
	if err != nil {
		return nil, fmt.Errorf("failed to read hackathons.json: %w", err)
	}
	var result []model.Hackathon
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal hackathons.json: %w", err)
	}
	return result, nil
}

func (r *EmbeddedRepository) GetExperience() ([]model.Experience, error) {
	data, err := r.fs.ReadFile("data/experience.json")
	if err != nil {
		return nil, fmt.Errorf("failed to read experience.json: %w", err)
	}
	var result []model.Experience
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal experience.json: %w", err)
	}
	return result, nil
}

func (r *EmbeddedRepository) GetSkills() ([]model.SkillDomain, error) {
	data, err := r.fs.ReadFile("data/skills.json")
	if err != nil {
		return nil, fmt.Errorf("failed to read skills.json: %w", err)
	}
	var result []model.SkillDomain
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal skills.json: %w", err)
	}
	return result, nil
}

func (r *EmbeddedRepository) GetMusic() (*model.Music, error) {
	data, err := r.fs.ReadFile("data/music.json")
	if err != nil {
		return nil, fmt.Errorf("failed to read music.json: %w", err)
	}
	var result model.Music
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal music.json: %w", err)
	}
	return &result, nil
}
