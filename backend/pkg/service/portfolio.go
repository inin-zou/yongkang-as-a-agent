package service

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/model"
)

// PortfolioService provides business logic on top of consumer-side store contracts.
type PortfolioService struct {
	data   PortfolioDataStore
	stores PortfolioStores
}

// NewPortfolioService creates a service with public data and optional persistence areas.
func NewPortfolioService(data PortfolioDataStore, stores PortfolioStores) *PortfolioService {
	return &PortfolioService{data: data, stores: stores}
}

// GetProjects returns all projects, optionally filtered by category.
func (s *PortfolioService) GetProjects(category string) ([]model.Project, error) {
	if category != "" {
		return s.data.GetProjectsByCategory(category)
	}
	return s.data.GetProjects()
}

func (s *PortfolioService) GetProjectBySlug(slug string) (*model.Project, error) {
	return s.data.GetProjectBySlug(slug)
}

// GetHackathons returns all hackathons sorted by date descending.
func (s *PortfolioService) GetHackathons() ([]model.Hackathon, error) {
	hackathons, err := s.data.GetHackathons()
	if err != nil {
		return nil, err
	}
	sort.Slice(hackathons, func(i, j int) bool {
		return strings.Compare(hackathons[i].Date, hackathons[j].Date) > 0
	})
	return hackathons, nil
}

func (s *PortfolioService) GetExperience() ([]model.Experience, error) {
	return s.data.GetExperience()
}

func (s *PortfolioService) GetSkills() ([]model.SkillDomain, error) {
	return s.data.GetSkills()
}

func (s *PortfolioService) GetMusic() (*model.Music, error) {
	return s.data.GetMusic()
}

// GetBlogPosts returns all published blog posts.
func (s *PortfolioService) GetBlogPosts() ([]model.BlogPost, error) {
	if s.stores.Posts == nil {
		return nil, nil
	}
	return s.stores.Posts.GetBlogPosts()
}

// GetBlogPostBySlug returns a single blog post by slug.
func (s *PortfolioService) GetBlogPostBySlug(slug string) (*model.BlogPost, error) {
	if s.stores.Posts == nil {
		return nil, nil
	}
	return s.stores.Posts.GetBlogPostBySlug(slug)
}

// CreateFeedback saves a visitor feedback entry.
func (s *PortfolioService) CreateFeedback(name, message string) error {
	if s.stores.Admin == nil {
		return nil
	}
	return s.stores.Admin.CreateFeedback(name, message)
}

// CreateContactSubmission persists a contact form submission.
func (s *PortfolioService) CreateContactSubmission(name, email, message string) error {
	if s.stores.Admin == nil {
		return nil
	}
	return s.stores.Admin.CreateContactSubmission(name, email, message)
}

// CreateBlogPost creates a new blog post.
func (s *PortfolioService) CreateBlogPost(slug, title, content, preview, category, publishedAt, result string, tags []string) (*model.BlogPost, error) {
	if s.stores.Posts == nil {
		return nil, fmt.Errorf("database not configured")
	}
	return s.stores.Posts.CreateBlogPost(slug, title, content, preview, category, publishedAt, result, tags)
}

// UpdateBlogPost updates an existing blog post.
func (s *PortfolioService) UpdateBlogPost(id, slug, title, content, preview, category, publishedAt, updatedAt string, archived *bool, tags *[]string, result *string) (*model.BlogPost, error) {
	if s.stores.Posts == nil {
		return nil, fmt.Errorf("database not configured")
	}
	return s.stores.Posts.UpdateBlogPost(id, slug, title, content, preview, category, publishedAt, updatedAt, archived, tags, result)
}

// SetBlogPostArchived archives or restores a blog post.
func (s *PortfolioService) SetBlogPostArchived(id string, archived bool) error {
	if s.stores.Posts == nil {
		return fmt.Errorf("database not configured")
	}
	return s.stores.Posts.SetBlogPostArchived(id, archived)
}

// DeleteBlogPost deletes a blog post by ID.
func (s *PortfolioService) DeleteBlogPost(id string) error {
	if s.stores.Posts == nil {
		return fmt.Errorf("database not configured")
	}
	return s.stores.Posts.DeleteBlogPost(id)
}

// GetFeedback returns all feedback entries.
func (s *PortfolioService) GetFeedback() ([]model.Feedback, error) {
	if s.stores.Admin == nil {
		return nil, nil
	}
	return s.stores.Admin.GetFeedback()
}

// DeleteFeedback deletes a feedback entry by ID.
func (s *PortfolioService) DeleteFeedback(id string) error {
	if s.stores.Admin == nil {
		return fmt.Errorf("database not configured")
	}
	return s.stores.Admin.DeleteFeedback(id)
}

// GetGuestbook returns all guestbook entries.
func (s *PortfolioService) GetGuestbook() ([]model.GuestbookEntry, error) {
	if s.stores.Guestbook == nil {
		return nil, nil
	}
	return s.stores.Guestbook.GetGuestbook()
}

// CreateGuestbookEntry adds a new guestbook comment.
func (s *PortfolioService) CreateGuestbookEntry(username, avatarURL, profileURL, message string) (*model.GuestbookEntry, error) {
	if s.stores.Guestbook == nil {
		return nil, fmt.Errorf("database not configured")
	}
	return s.stores.Guestbook.CreateGuestbookEntry(username, avatarURL, profileURL, message)
}

// DeleteGuestbookEntry deletes a guestbook entry by ID (admin only).
func (s *PortfolioService) DeleteGuestbookEntry(id string) error {
	if s.stores.Guestbook == nil {
		return fmt.Errorf("database not configured")
	}
	return s.stores.Guestbook.DeleteGuestbookEntry(id)
}

// IncrementAndGetViews increments and returns the page view count.
func (s *PortfolioService) IncrementAndGetViews() (int64, error) {
	if s.stores.Views == nil {
		return 0, nil
	}
	return s.stores.Views.IncrementAndGetViews()
}

// GetViews returns the current page view count.
func (s *PortfolioService) GetViews() (int64, error) {
	if s.stores.Views == nil {
		return 0, nil
	}
	return s.stores.Views.GetViews()
}

// ToggleLike adds or removes a like on a post.
func (s *PortfolioService) ToggleLike(postSlug string, githubUsername string) (bool, error) {
	if s.stores.Engagement == nil {
		return false, fmt.Errorf("database not configured")
	}
	return s.stores.Engagement.ToggleLike(postSlug, githubUsername)
}

// GetComments returns all comments for a post by slug.
func (s *PortfolioService) GetComments(postSlug string) ([]model.PostComment, error) {
	if s.stores.Engagement == nil {
		return nil, nil
	}
	return s.stores.Engagement.GetComments(postSlug)
}

// CreateComment adds a comment to a post by slug.
func (s *PortfolioService) CreateComment(postSlug string, username, avatarURL, profileURL, message string) (*model.PostComment, error) {
	if s.stores.Engagement == nil {
		return nil, fmt.Errorf("database not configured")
	}
	return s.stores.Engagement.CreateComment(postSlug, username, avatarURL, profileURL, message)
}

// DeleteComment deletes a comment by ID (admin only).
func (s *PortfolioService) DeleteComment(id string) error {
	if s.stores.Engagement == nil {
		return fmt.Errorf("database not configured")
	}
	return s.stores.Engagement.DeleteComment(id)
}

// GetNotifications returns all admin notifications.
func (s *PortfolioService) GetNotifications() ([]model.AdminNotification, error) {
	if s.stores.Admin == nil {
		return nil, nil
	}
	return s.stores.Admin.GetNotifications()
}

// GetUnreadNotificationCount returns count of unread notifications.
func (s *PortfolioService) GetUnreadNotificationCount() (int, error) {
	if s.stores.Admin == nil {
		return 0, nil
	}
	return s.stores.Admin.GetUnreadNotificationCount()
}

// MarkNotificationRead marks a notification as read.
func (s *PortfolioService) MarkNotificationRead(id string) error {
	if s.stores.Admin == nil {
		return fmt.Errorf("database not configured")
	}
	return s.stores.Admin.MarkNotificationRead(id)
}

// MarkAllNotificationsRead marks all notifications as read.
func (s *PortfolioService) MarkAllNotificationsRead() error {
	if s.stores.Admin == nil {
		return fmt.Errorf("database not configured")
	}
	return s.stores.Admin.MarkAllNotificationsRead()
}

// GetPage returns the JSONB content for a page by ID.
// Returns nil, nil if supabase is not configured (frontend has hardcoded fallback).
func (s *PortfolioService) GetPage(id string) (json.RawMessage, error) {
	if s.stores.Pages == nil {
		return nil, nil
	}
	return s.stores.Pages.GetPage(id)
}

// UpdatePage updates the JSONB content for a page by ID.
func (s *PortfolioService) UpdatePage(id string, content json.RawMessage) (json.RawMessage, error) {
	if s.stores.Pages == nil {
		return nil, fmt.Errorf("database not configured")
	}
	return s.stores.Pages.UpdatePage(id, content)
}

// GetMusicTracks returns all music tracks.
func (s *PortfolioService) GetMusicTracks() ([]model.MusicTrack, error) {
	if s.stores.Music == nil {
		return nil, nil
	}
	return s.stores.Music.GetMusicTracks()
}

// CreateMusicTrack creates a new music track.
func (s *PortfolioService) CreateMusicTrack(slug, name, genre, original, notes, fileURL string, sortOrder int) (*model.MusicTrack, error) {
	if s.stores.Music == nil {
		return nil, fmt.Errorf("database not configured")
	}
	return s.stores.Music.CreateMusicTrack(slug, name, genre, original, notes, fileURL, sortOrder)
}

// UpdateMusicTrack updates an existing music track.
func (s *PortfolioService) UpdateMusicTrack(id, slug, name, genre, original, notes, fileURL string, sortOrder int) (*model.MusicTrack, error) {
	if s.stores.Music == nil {
		return nil, fmt.Errorf("database not configured")
	}
	return s.stores.Music.UpdateMusicTrack(id, slug, name, genre, original, notes, fileURL, sortOrder)
}

// DeleteMusicTrack deletes a music track by ID.
func (s *PortfolioService) DeleteMusicTrack(id string) error {
	if s.stores.Music == nil {
		return fmt.Errorf("database not configured")
	}
	return s.stores.Music.DeleteMusicTrack(id)
}

// GetProjectStatuses returns all project statuses.
func (s *PortfolioService) GetProjectStatuses() ([]model.ProjectStatus, error) {
	if s.stores.ProjectStatuses == nil {
		return nil, nil
	}
	return s.stores.ProjectStatuses.GetProjectStatuses()
}

// CreateProjectStatus creates a new project status.
func (s *PortfolioService) CreateProjectStatus(name, status, description, nextStep, links string, sortOrder int) (*model.ProjectStatus, error) {
	if s.stores.ProjectStatuses == nil {
		return nil, fmt.Errorf("database not configured")
	}
	return s.stores.ProjectStatuses.CreateProjectStatus(name, status, description, nextStep, links, sortOrder)
}

// UpdateProjectStatus updates an existing project status.
func (s *PortfolioService) UpdateProjectStatus(id, name, status, description, nextStep, links string, sortOrder int) (*model.ProjectStatus, error) {
	if s.stores.ProjectStatuses == nil {
		return nil, fmt.Errorf("database not configured")
	}
	return s.stores.ProjectStatuses.UpdateProjectStatus(id, name, status, description, nextStep, links, sortOrder)
}

// DeleteProjectStatus deletes a project status by ID.
func (s *PortfolioService) DeleteProjectStatus(id string) error {
	if s.stores.ProjectStatuses == nil {
		return fmt.Errorf("database not configured")
	}
	return s.stores.ProjectStatuses.DeleteProjectStatus(id)
}

// CreateSkill creates a new skill domain.
func (s *PortfolioService) CreateSkill(title, slug string, skills, battleTested []string, sortOrder int) (*model.SkillDomain, error) {
	if s.stores.Skills == nil {
		return nil, fmt.Errorf("database not configured")
	}
	return s.stores.Skills.CreateSkill(title, slug, skills, battleTested, sortOrder)
}

// UpdateSkill updates an existing skill domain.
func (s *PortfolioService) UpdateSkill(id, title, slug string, skills, battleTested []string, sortOrder int) (*model.SkillDomain, error) {
	if s.stores.Skills == nil {
		return nil, fmt.Errorf("database not configured")
	}
	return s.stores.Skills.UpdateSkill(id, title, slug, skills, battleTested, sortOrder)
}

// DeleteSkill deletes a skill domain by ID.
func (s *PortfolioService) DeleteSkill(id string) error {
	if s.stores.Skills == nil {
		return fmt.Errorf("database not configured")
	}
	return s.stores.Skills.DeleteSkill(id)
}

// CreateHackathon creates a new hackathon entry.
func (s *PortfolioService) CreateHackathon(h model.Hackathon) (*model.Hackathon, error) {
	if s.stores.Hackathons == nil {
		return nil, fmt.Errorf("database not configured")
	}
	return s.stores.Hackathons.CreateHackathon(h)
}

// UpdateHackathon updates an existing hackathon entry.
func (s *PortfolioService) UpdateHackathon(id string, h model.Hackathon) (*model.Hackathon, error) {
	if s.stores.Hackathons == nil {
		return nil, fmt.Errorf("database not configured")
	}
	return s.stores.Hackathons.UpdateHackathon(id, h)
}

// DeleteHackathon deletes a hackathon entry by ID.
func (s *PortfolioService) DeleteHackathon(id string) error {
	if s.stores.Hackathons == nil {
		return fmt.Errorf("database not configured")
	}
	return s.stores.Hackathons.DeleteHackathon(id)
}

// CreateExperience creates a new experience entry.
func (s *PortfolioService) CreateExperience(e model.Experience) (*model.Experience, error) {
	if s.stores.Experience == nil {
		return nil, fmt.Errorf("database not configured")
	}
	return s.stores.Experience.CreateExperience(e)
}

// UpdateExperience updates an existing experience entry.
func (s *PortfolioService) UpdateExperience(id string, e model.Experience) (*model.Experience, error) {
	if s.stores.Experience == nil {
		return nil, fmt.Errorf("database not configured")
	}
	return s.stores.Experience.UpdateExperience(id, e)
}

// DeleteExperience deletes an experience entry by ID.
func (s *PortfolioService) DeleteExperience(id string) error {
	if s.stores.Experience == nil {
		return fmt.Errorf("database not configured")
	}
	return s.stores.Experience.DeleteExperience(id)
}
