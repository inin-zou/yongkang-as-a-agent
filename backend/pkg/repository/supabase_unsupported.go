package repository

import (
	"errors"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/model"
)

// ErrNotSupported marks reads Supabase does not serve; the embedded data is the source.
// The fallback repository uses it silently instead of logging a failure.
var ErrNotSupported = errors.New("not available in supabase")

// GetProjects is not available in Supabase.
func (r *SupabaseRepository) GetProjects() ([]model.Project, error) {
	return nil, ErrNotSupported
}

// GetProjectBySlug is not available in Supabase.
func (r *SupabaseRepository) GetProjectBySlug(slug string) (*model.Project, error) {
	return nil, ErrNotSupported
}

// GetProjectsByCategory is not available in Supabase.
func (r *SupabaseRepository) GetProjectsByCategory(category string) ([]model.Project, error) {
	return nil, ErrNotSupported
}

// GetMusic is not available in Supabase.
func (r *SupabaseRepository) GetMusic() (*model.Music, error) {
	return nil, ErrNotSupported
}
