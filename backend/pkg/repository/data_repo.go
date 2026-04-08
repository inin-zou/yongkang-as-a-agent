package repository

import "github.com/inin-zou/yongkang-as-a-agent/backend/pkg/model"

// DataRepository is the interface for reading portfolio data (JSON files or embedded).
type DataRepository interface {
	GetProjects() ([]model.Project, error)
	GetProjectBySlug(slug string) (*model.Project, error)
	GetProjectsByCategory(category string) ([]model.Project, error)
	GetHackathons() ([]model.Hackathon, error)
	GetExperience() ([]model.Experience, error)
	GetSkills() ([]model.SkillDomain, error)
	GetMusic() (*model.Music, error)
}
