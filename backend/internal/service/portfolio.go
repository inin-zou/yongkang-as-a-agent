package service

import (
	"sort"
	"strings"

	"github.com/inin-zou/yongkang-as-a-agent/backend/internal/model"
	"github.com/inin-zou/yongkang-as-a-agent/backend/internal/repository"
)

// PortfolioService provides business logic on top of the repository layer.
type PortfolioService struct {
	repo *repository.JSONRepository
}

// NewPortfolioService creates a new PortfolioService backed by the given repository.
func NewPortfolioService(repo *repository.JSONRepository) *PortfolioService {
	return &PortfolioService{repo: repo}
}

// GetProjects returns all projects, optionally filtered by category.
// If category is empty, all projects are returned.
func (s *PortfolioService) GetProjects(category string) ([]model.Project, error) {
	if category != "" {
		return s.repo.GetProjectsByCategory(category)
	}
	return s.repo.GetProjects()
}

// GetProjectBySlug returns a single project by its slug.
func (s *PortfolioService) GetProjectBySlug(slug string) (*model.Project, error) {
	return s.repo.GetProjectBySlug(slug)
}

// GetHackathons returns all hackathons sorted by date descending (most recent first).
func (s *PortfolioService) GetHackathons() ([]model.Hackathon, error) {
	hackathons, err := s.repo.GetHackathons()
	if err != nil {
		return nil, err
	}

	sort.Slice(hackathons, func(i, j int) bool {
		// Dates are in YYYY.MM format; lexicographic comparison works for descending order.
		return strings.Compare(hackathons[i].Date, hackathons[j].Date) > 0
	})

	return hackathons, nil
}

// GetExperience returns all experience entries.
func (s *PortfolioService) GetExperience() ([]model.Experience, error) {
	return s.repo.GetExperience()
}

// GetSkills returns all skill domains.
func (s *PortfolioService) GetSkills() ([]model.SkillDomain, error) {
	return s.repo.GetSkills()
}

// GetMusic returns the music profile.
func (s *PortfolioService) GetMusic() (*model.Music, error) {
	return s.repo.GetMusic()
}
