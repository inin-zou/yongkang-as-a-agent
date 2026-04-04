package service

import (
	"fmt"
	"sort"
	"strings"

	"github.com/inin-zou/yongkang-as-a-agent/backend/internal/model"
	"github.com/inin-zou/yongkang-as-a-agent/backend/internal/repository"
)

// PortfolioService provides business logic on top of the repository layer.
type PortfolioService struct {
	repo     *repository.JSONRepository
	supabase *repository.SupabaseRepository // nil if not configured
}

// NewPortfolioService creates a new PortfolioService backed by the given repositories.
func NewPortfolioService(repo *repository.JSONRepository, supabase *repository.SupabaseRepository) *PortfolioService {
	return &PortfolioService{repo: repo, supabase: supabase}
}

// GetProjects returns all projects, optionally filtered by category.
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

// GetHackathons returns all hackathons sorted by date descending.
func (s *PortfolioService) GetHackathons() ([]model.Hackathon, error) {
	hackathons, err := s.repo.GetHackathons()
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
func (s *PortfolioService) CreateBlogPost(slug, title, content, preview string) (*model.BlogPost, error) {
	if s.supabase == nil {
		return nil, fmt.Errorf("database not configured")
	}
	return s.supabase.CreateBlogPost(slug, title, content, preview)
}

// UpdateBlogPost updates an existing blog post.
func (s *PortfolioService) UpdateBlogPost(id, slug, title, content, preview string) (*model.BlogPost, error) {
	if s.supabase == nil {
		return nil, fmt.Errorf("database not configured")
	}
	return s.supabase.UpdateBlogPost(id, slug, title, content, preview)
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
