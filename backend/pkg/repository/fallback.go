package repository

import (
	"errors"
	"log"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/model"
)

// WithFallback uses fallback when primary is unavailable, errors, or returns no data.
// Public collections intentionally fall back even when primary returns an empty slice.
func WithFallback(primary, fallback DataRepository) DataRepository {
	return &fallbackRepository{primary: primary, fallback: fallback}
}

type fallbackRepository struct{ primary, fallback DataRepository }

// readWithFallback logs only the operation: database errors may contain credentials,
// query parameters, or user content and must never be copied into application logs.
func readWithFallback[T any](operation string, primary func() (T, error), fallback func() (T, error), present func(T) bool) (T, error) {
	if primary != nil {
		value, err := primary()
		if err == nil && present(value) {
			return value, nil
		}
		if err != nil && !errors.Is(err, ErrNotSupported) {
			log.Printf("portfolio primary %s failed; using fallback", operation)
		}
	}
	return fallback()
}

func nonempty[T any](items []T) bool { return len(items) > 0 }
func nonnil[T any](item *T) bool     { return item != nil }

func (r *fallbackRepository) GetProjects() ([]model.Project, error) {
	var primary func() ([]model.Project, error)
	if r.primary != nil {
		primary = func() ([]model.Project, error) { return r.primary.GetProjects() }
	}
	return readWithFallback("GetProjects", primary, func() ([]model.Project, error) { return r.fallback.GetProjects() }, nonempty[model.Project])
}

func (r *fallbackRepository) GetProjectBySlug(slug string) (*model.Project, error) {
	var primary func() (*model.Project, error)
	if r.primary != nil {
		primary = func() (*model.Project, error) { return r.primary.GetProjectBySlug(slug) }
	}
	return readWithFallback("GetProjectBySlug", primary, func() (*model.Project, error) { return r.fallback.GetProjectBySlug(slug) }, nonnil[model.Project])
}

func (r *fallbackRepository) GetProjectsByCategory(category string) ([]model.Project, error) {
	var primary func() ([]model.Project, error)
	if r.primary != nil {
		primary = func() ([]model.Project, error) { return r.primary.GetProjectsByCategory(category) }
	}
	return readWithFallback("GetProjectsByCategory", primary, func() ([]model.Project, error) { return r.fallback.GetProjectsByCategory(category) }, nonempty[model.Project])
}

func (r *fallbackRepository) GetHackathons() ([]model.Hackathon, error) {
	var primary func() ([]model.Hackathon, error)
	if r.primary != nil {
		primary = func() ([]model.Hackathon, error) { return r.primary.GetHackathons() }
	}
	return readWithFallback("GetHackathons", primary, func() ([]model.Hackathon, error) { return r.fallback.GetHackathons() }, nonempty[model.Hackathon])
}

func (r *fallbackRepository) GetExperience() ([]model.Experience, error) {
	var primary func() ([]model.Experience, error)
	if r.primary != nil {
		primary = func() ([]model.Experience, error) { return r.primary.GetExperience() }
	}
	return readWithFallback("GetExperience", primary, func() ([]model.Experience, error) { return r.fallback.GetExperience() }, nonempty[model.Experience])
}

func (r *fallbackRepository) GetSkills() ([]model.SkillDomain, error) {
	var primary func() ([]model.SkillDomain, error)
	if r.primary != nil {
		primary = func() ([]model.SkillDomain, error) { return r.primary.GetSkills() }
	}
	return readWithFallback("GetSkills", primary, func() ([]model.SkillDomain, error) { return r.fallback.GetSkills() }, nonempty[model.SkillDomain])
}

func (r *fallbackRepository) GetMusic() (*model.Music, error) {
	var primary func() (*model.Music, error)
	if r.primary != nil {
		primary = func() (*model.Music, error) { return r.primary.GetMusic() }
	}
	return readWithFallback("GetMusic", primary, func() (*model.Music, error) { return r.fallback.GetMusic() }, nonnil[model.Music])
}
