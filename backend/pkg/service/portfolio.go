package service

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/model"
	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/repository"
)

// PortfolioService provides business logic on top of the repository layer.
type PortfolioService struct {
	primary  repository.DataRepository       // Supabase (nil if not configured)
	fallback repository.DataRepository       // Embedded JSON (always available)
	supabase *repository.SupabaseRepository  // for blog/guestbook/admin-only methods
}

// NewPortfolioService creates a new PortfolioService backed by the given repositories.
// primary is the preferred DataRepository (e.g. Supabase) and may be nil.
// fallback is always available (e.g. embedded JSON or local JSON).
func NewPortfolioService(
	primary repository.DataRepository,
	fallback repository.DataRepository,
	supabase *repository.SupabaseRepository,
) *PortfolioService {
	return &PortfolioService{primary: primary, fallback: fallback, supabase: supabase}
}

// getRepo returns primary if available, otherwise fallback.
// Used for simple single-source reads where primary/fallback logic is not needed.
// For methods that need len checks, use inline primary/fallback pattern instead.

// GetProjects returns all projects, optionally filtered by category.
func (s *PortfolioService) GetProjects(category string) ([]model.Project, error) {
	if category != "" {
		if s.primary != nil {
			if projects, err := s.primary.GetProjectsByCategory(category); err == nil && len(projects) > 0 {
				return projects, nil
			}
		}
		return s.fallback.GetProjectsByCategory(category)
	}
	if s.primary != nil {
		if projects, err := s.primary.GetProjects(); err == nil && len(projects) > 0 {
			return projects, nil
		}
	}
	return s.fallback.GetProjects()
}

// GetProjectBySlug returns a single project by its slug.
func (s *PortfolioService) GetProjectBySlug(slug string) (*model.Project, error) {
	if s.primary != nil {
		if project, err := s.primary.GetProjectBySlug(slug); err == nil && project != nil {
			return project, nil
		}
	}
	return s.fallback.GetProjectBySlug(slug)
}

// GetHackathons returns all hackathons sorted by date descending.
func (s *PortfolioService) GetHackathons() ([]model.Hackathon, error) {
	var hackathons []model.Hackathon
	var err error
	if s.primary != nil {
		if hackathons, err = s.primary.GetHackathons(); err != nil || len(hackathons) == 0 {
			hackathons, err = s.fallback.GetHackathons()
		}
	} else {
		hackathons, err = s.fallback.GetHackathons()
	}
	if err != nil {
		return nil, err
	}

	sort.Slice(hackathons, func(i, j int) bool {
		return strings.Compare(hackathons[i].Date, hackathons[j].Date) > 0
	})

	return hackathons, nil
}

// GetExperience returns all experience entries.
func (s *PortfolioService) GetExperience() ([]model.Experience, error) {
	if s.primary != nil {
		if experience, err := s.primary.GetExperience(); err == nil && len(experience) > 0 {
			return experience, nil
		}
	}
	return s.fallback.GetExperience()
}

// GetSkills returns all skill domains.
func (s *PortfolioService) GetSkills() ([]model.SkillDomain, error) {
	if s.primary != nil {
		if skills, err := s.primary.GetSkills(); err == nil && len(skills) > 0 {
			return skills, nil
		}
	}
	return s.fallback.GetSkills()
}

// GetMusic returns the music profile.
func (s *PortfolioService) GetMusic() (*model.Music, error) {
	if s.primary != nil {
		if music, err := s.primary.GetMusic(); err == nil && music != nil {
			return music, nil
		}
	}
	return s.fallback.GetMusic()
}

// GetBlogPosts returns all published blog posts.
func (s *PortfolioService) GetBlogPosts() ([]model.BlogPost, error) {
	if s.supabase == nil {
		return nil, nil
	}
	return s.supabase.GetBlogPosts()
}

// GetBlogPostBySlug returns a single blog post by slug.
func (s *PortfolioService) GetBlogPostBySlug(slug string) (*model.BlogPost, error) {
	if s.supabase == nil {
		return nil, nil
	}
	return s.supabase.GetBlogPostBySlug(slug)
}

// CreateFeedback saves a visitor feedback entry.
func (s *PortfolioService) CreateFeedback(name, message string) error {
	if s.supabase == nil {
		return nil
	}
	return s.supabase.CreateFeedback(name, message)
}

// CreateContactSubmission persists a contact form submission.
func (s *PortfolioService) CreateContactSubmission(name, email, message string) error {
	if s.supabase == nil {
		return nil
	}
	return s.supabase.CreateContactSubmission(name, email, message)
}

// CreateBlogPost creates a new blog post.
func (s *PortfolioService) CreateBlogPost(slug, title, content, preview, category string) (*model.BlogPost, error) {
	if s.supabase == nil {
		return nil, fmt.Errorf("database not configured")
	}
	return s.supabase.CreateBlogPost(slug, title, content, preview, category)
}

// UpdateBlogPost updates an existing blog post.
func (s *PortfolioService) UpdateBlogPost(id, slug, title, content, preview, category, publishedAt, updatedAt string) (*model.BlogPost, error) {
	if s.supabase == nil {
		return nil, fmt.Errorf("database not configured")
	}
	return s.supabase.UpdateBlogPost(id, slug, title, content, preview, category, publishedAt, updatedAt)
}

// DeleteBlogPost deletes a blog post by ID.
func (s *PortfolioService) DeleteBlogPost(id string) error {
	if s.supabase == nil {
		return fmt.Errorf("database not configured")
	}
	return s.supabase.DeleteBlogPost(id)
}

// GetFeedback returns all feedback entries.
func (s *PortfolioService) GetFeedback() ([]model.Feedback, error) {
	if s.supabase == nil {
		return nil, nil
	}
	return s.supabase.GetFeedback()
}

// DeleteFeedback deletes a feedback entry by ID.
func (s *PortfolioService) DeleteFeedback(id string) error {
	if s.supabase == nil {
		return fmt.Errorf("database not configured")
	}
	return s.supabase.DeleteFeedback(id)
}

// GetGuestbook returns all guestbook entries.
func (s *PortfolioService) GetGuestbook() ([]model.GuestbookEntry, error) {
	if s.supabase == nil {
		return nil, nil
	}
	return s.supabase.GetGuestbook()
}

// CreateGuestbookEntry adds a new guestbook comment.
func (s *PortfolioService) CreateGuestbookEntry(username, avatarURL, profileURL, message string) (*model.GuestbookEntry, error) {
	if s.supabase == nil {
		return nil, fmt.Errorf("database not configured")
	}
	return s.supabase.CreateGuestbookEntry(username, avatarURL, profileURL, message)
}

// DeleteGuestbookEntry deletes a guestbook entry by ID (admin only).
func (s *PortfolioService) DeleteGuestbookEntry(id string) error {
	if s.supabase == nil {
		return fmt.Errorf("database not configured")
	}
	return s.supabase.DeleteGuestbookEntry(id)
}

// IncrementAndGetViews increments and returns the page view count.
func (s *PortfolioService) IncrementAndGetViews() (int64, error) {
	if s.supabase == nil {
		return 0, nil
	}
	return s.supabase.IncrementAndGetViews()
}

// GetViews returns the current page view count.
func (s *PortfolioService) GetViews() (int64, error) {
	if s.supabase == nil {
		return 0, nil
	}
	return s.supabase.GetViews()
}

// GetPostStats returns like count, comment count, and whether a user liked the post.
func (s *PortfolioService) GetPostStats(postSlug string, githubUsername string) (*model.PostStats, error) {
	if s.supabase == nil {
		return &model.PostStats{}, nil
	}
	return s.supabase.GetPostStats(postSlug, githubUsername)
}

// ToggleLike adds or removes a like on a post.
func (s *PortfolioService) ToggleLike(postSlug string, githubUsername string) (bool, error) {
	if s.supabase == nil {
		return false, fmt.Errorf("database not configured")
	}
	return s.supabase.ToggleLike(postSlug, githubUsername)
}

// GetComments returns all comments for a post by slug.
func (s *PortfolioService) GetComments(postSlug string) ([]model.PostComment, error) {
	if s.supabase == nil {
		return nil, nil
	}
	return s.supabase.GetComments(postSlug)
}

// CreateComment adds a comment to a post by slug.
func (s *PortfolioService) CreateComment(postSlug string, username, avatarURL, profileURL, message string) (*model.PostComment, error) {
	if s.supabase == nil {
		return nil, fmt.Errorf("database not configured")
	}
	return s.supabase.CreateComment(postSlug, username, avatarURL, profileURL, message)
}

// DeleteComment deletes a comment by ID (admin only).
func (s *PortfolioService) DeleteComment(id string) error {
	if s.supabase == nil {
		return fmt.Errorf("database not configured")
	}
	return s.supabase.DeleteComment(id)
}

// GetNotifications returns all admin notifications.
func (s *PortfolioService) GetNotifications() ([]model.AdminNotification, error) {
	if s.supabase == nil {
		return nil, nil
	}
	return s.supabase.GetNotifications()
}

// GetUnreadNotificationCount returns count of unread notifications.
func (s *PortfolioService) GetUnreadNotificationCount() (int, error) {
	if s.supabase == nil {
		return 0, nil
	}
	return s.supabase.GetUnreadNotificationCount()
}

// MarkNotificationRead marks a notification as read.
func (s *PortfolioService) MarkNotificationRead(id string) error {
	if s.supabase == nil {
		return fmt.Errorf("database not configured")
	}
	return s.supabase.MarkNotificationRead(id)
}

// MarkAllNotificationsRead marks all notifications as read.
func (s *PortfolioService) MarkAllNotificationsRead() error {
	if s.supabase == nil {
		return fmt.Errorf("database not configured")
	}
	return s.supabase.MarkAllNotificationsRead()
}

// GetPage returns the JSONB content for a page by ID.
// Returns nil, nil if supabase is not configured (frontend has hardcoded fallback).
func (s *PortfolioService) GetPage(id string) (json.RawMessage, error) {
	if s.supabase == nil {
		return nil, nil
	}
	return s.supabase.GetPage(id)
}

// UpdatePage updates the JSONB content for a page by ID.
func (s *PortfolioService) UpdatePage(id string, content json.RawMessage) (json.RawMessage, error) {
	if s.supabase == nil {
		return nil, fmt.Errorf("database not configured")
	}
	return s.supabase.UpdatePage(id, content)
}

// GetMusicTracks returns all music tracks.
func (s *PortfolioService) GetMusicTracks() ([]model.MusicTrack, error) {
	if s.supabase == nil {
		return nil, nil
	}
	return s.supabase.GetMusicTracks()
}

// CreateMusicTrack creates a new music track.
func (s *PortfolioService) CreateMusicTrack(slug, name, genre, original, notes, fileURL string, sortOrder int) (*model.MusicTrack, error) {
	if s.supabase == nil {
		return nil, fmt.Errorf("database not configured")
	}
	return s.supabase.CreateMusicTrack(slug, name, genre, original, notes, fileURL, sortOrder)
}

// UpdateMusicTrack updates an existing music track.
func (s *PortfolioService) UpdateMusicTrack(id, slug, name, genre, original, notes, fileURL string, sortOrder int) (*model.MusicTrack, error) {
	if s.supabase == nil {
		return nil, fmt.Errorf("database not configured")
	}
	return s.supabase.UpdateMusicTrack(id, slug, name, genre, original, notes, fileURL, sortOrder)
}

// DeleteMusicTrack deletes a music track by ID.
func (s *PortfolioService) DeleteMusicTrack(id string) error {
	if s.supabase == nil {
		return fmt.Errorf("database not configured")
	}
	return s.supabase.DeleteMusicTrack(id)
}

// GetProjectStatuses returns all project statuses.
func (s *PortfolioService) GetProjectStatuses() ([]model.ProjectStatus, error) {
	if s.supabase == nil {
		return nil, nil
	}
	return s.supabase.GetProjectStatuses()
}

// CreateProjectStatus creates a new project status.
func (s *PortfolioService) CreateProjectStatus(name, status, description, nextStep, links string, sortOrder int) (*model.ProjectStatus, error) {
	if s.supabase == nil {
		return nil, fmt.Errorf("database not configured")
	}
	return s.supabase.CreateProjectStatus(name, status, description, nextStep, links, sortOrder)
}

// UpdateProjectStatus updates an existing project status.
func (s *PortfolioService) UpdateProjectStatus(id, name, status, description, nextStep, links string, sortOrder int) (*model.ProjectStatus, error) {
	if s.supabase == nil {
		return nil, fmt.Errorf("database not configured")
	}
	return s.supabase.UpdateProjectStatus(id, name, status, description, nextStep, links, sortOrder)
}

// DeleteProjectStatus deletes a project status by ID.
func (s *PortfolioService) DeleteProjectStatus(id string) error {
	if s.supabase == nil {
		return fmt.Errorf("database not configured")
	}
	return s.supabase.DeleteProjectStatus(id)
}

// CreateSkill creates a new skill domain.
func (s *PortfolioService) CreateSkill(title, slug string, skills, battleTested []string, sortOrder int) (*model.SkillDomain, error) {
	if s.supabase == nil {
		return nil, fmt.Errorf("database not configured")
	}
	return s.supabase.CreateSkill(title, slug, skills, battleTested, sortOrder)
}

// UpdateSkill updates an existing skill domain.
func (s *PortfolioService) UpdateSkill(id, title, slug string, skills, battleTested []string, sortOrder int) (*model.SkillDomain, error) {
	if s.supabase == nil {
		return nil, fmt.Errorf("database not configured")
	}
	return s.supabase.UpdateSkill(id, title, slug, skills, battleTested, sortOrder)
}

// DeleteSkill deletes a skill domain by ID.
func (s *PortfolioService) DeleteSkill(id string) error {
	if s.supabase == nil {
		return fmt.Errorf("database not configured")
	}
	return s.supabase.DeleteSkill(id)
}

// CreateHackathon creates a new hackathon entry.
func (s *PortfolioService) CreateHackathon(h model.Hackathon) (*model.Hackathon, error) {
	if s.supabase == nil {
		return nil, fmt.Errorf("database not configured")
	}
	return s.supabase.CreateHackathon(h)
}

// UpdateHackathon updates an existing hackathon entry.
func (s *PortfolioService) UpdateHackathon(id string, h model.Hackathon) (*model.Hackathon, error) {
	if s.supabase == nil {
		return nil, fmt.Errorf("database not configured")
	}
	return s.supabase.UpdateHackathon(id, h)
}

// DeleteHackathon deletes a hackathon entry by ID.
func (s *PortfolioService) DeleteHackathon(id string) error {
	if s.supabase == nil {
		return fmt.Errorf("database not configured")
	}
	return s.supabase.DeleteHackathon(id)
}

// CreateExperience creates a new experience entry.
func (s *PortfolioService) CreateExperience(e model.Experience) (*model.Experience, error) {
	if s.supabase == nil {
		return nil, fmt.Errorf("database not configured")
	}
	return s.supabase.CreateExperience(e)
}

// UpdateExperience updates an existing experience entry.
func (s *PortfolioService) UpdateExperience(id string, e model.Experience) (*model.Experience, error) {
	if s.supabase == nil {
		return nil, fmt.Errorf("database not configured")
	}
	return s.supabase.UpdateExperience(id, e)
}

// DeleteExperience deletes an experience entry by ID.
func (s *PortfolioService) DeleteExperience(id string) error {
	if s.supabase == nil {
		return fmt.Errorf("database not configured")
	}
	return s.supabase.DeleteExperience(id)
}
