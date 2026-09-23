package service

import (
	"encoding/json"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/model"
)

// PortfolioDataStore provides the public portfolio reads.
type PortfolioDataStore interface {
	GetProjects() ([]model.Project, error)
	GetProjectBySlug(slug string) (*model.Project, error)
	GetProjectsByCategory(category string) ([]model.Project, error)
	GetHackathons() ([]model.Hackathon, error)
	GetExperience() ([]model.Experience, error)
	GetSkills() ([]model.SkillDomain, error)
	GetMusic() (*model.Music, error)
}

// PostStore is the persistence contract consumed by PortfolioService.
type PostStore interface {
	GetBlogPosts() ([]model.BlogPost, error)
	GetBlogPostBySlug(slug string) (*model.BlogPost, error)
	CreateBlogPost(slug, title, content, preview, category, publishedAt string) (*model.BlogPost, error)
	UpdateBlogPost(id, slug, title, content, preview, category, publishedAt, updatedAt string, archived *bool) (*model.BlogPost, error)
	SetBlogPostArchived(id string, archived bool) error
	DeleteBlogPost(id string) error
}

// EngagementStore is the persistence contract consumed by PortfolioService.
type EngagementStore interface {
	GetPostStats(postSlug string, githubUsername string) (*model.PostStats, error)
	ToggleLike(postSlug string, githubUsername string) (bool, error)
	GetComments(postSlug string) ([]model.PostComment, error)
	CreateComment(postSlug string, username, avatarURL, profileURL, message string) (*model.PostComment, error)
	DeleteComment(id string) error
}

// GuestbookStore is the persistence contract consumed by PortfolioService.
type GuestbookStore interface {
	GetGuestbook() ([]model.GuestbookEntry, error)
	CreateGuestbookEntry(username, avatarURL, profileURL, message string) (*model.GuestbookEntry, error)
	DeleteGuestbookEntry(id string) error
}

// AdminStore is the persistence contract consumed by PortfolioService.
type AdminStore interface {
	CreateFeedback(name, message string) error
	CreateContactSubmission(name, email, message string) error
	GetFeedback() ([]model.Feedback, error)
	DeleteFeedback(id string) error
	GetNotifications() ([]model.AdminNotification, error)
	GetUnreadNotificationCount() (int, error)
	MarkNotificationRead(id string) error
	MarkAllNotificationsRead() error
}

// ViewStore is the persistence contract consumed by PortfolioService.
type ViewStore interface {
	IncrementAndGetViews() (int64, error)
	GetViews() (int64, error)
}

// PageStore is the persistence contract consumed by PortfolioService.
type PageStore interface {
	GetPage(id string) (json.RawMessage, error)
	UpdatePage(id string, content json.RawMessage) (json.RawMessage, error)
}

// MusicStore is the persistence contract consumed by PortfolioService.
type MusicStore interface {
	GetMusicTracks() ([]model.MusicTrack, error)
	CreateMusicTrack(slug, name, genre, original, notes, fileURL string, sortOrder int) (*model.MusicTrack, error)
	UpdateMusicTrack(id, slug, name, genre, original, notes, fileURL string, sortOrder int) (*model.MusicTrack, error)
	DeleteMusicTrack(id string) error
}

// ProjectStatusStore is the persistence contract consumed by PortfolioService.
type ProjectStatusStore interface {
	GetProjectStatuses() ([]model.ProjectStatus, error)
	CreateProjectStatus(name, status, description, nextStep, links string, sortOrder int) (*model.ProjectStatus, error)
	UpdateProjectStatus(id, name, status, description, nextStep, links string, sortOrder int) (*model.ProjectStatus, error)
	DeleteProjectStatus(id string) error
}

// SkillStore is the persistence contract consumed by PortfolioService.
type SkillStore interface {
	CreateSkill(title, slug string, skills, battleTested []string, sortOrder int) (*model.SkillDomain, error)
	UpdateSkill(id, title, slug string, skills, battleTested []string, sortOrder int) (*model.SkillDomain, error)
	DeleteSkill(id string) error
}

// HackathonStore is the persistence contract consumed by PortfolioService.
type HackathonStore interface {
	CreateHackathon(h model.Hackathon) (*model.Hackathon, error)
	UpdateHackathon(id string, h model.Hackathon) (*model.Hackathon, error)
	DeleteHackathon(id string) error
}

// ExperienceStore is the persistence contract consumed by PortfolioService.
type ExperienceStore interface {
	CreateExperience(e model.Experience) (*model.Experience, error)
	UpdateExperience(id string, e model.Experience) (*model.Experience, error)
	DeleteExperience(id string) error
}

// PortfolioStores holds optional persistence areas. Nil areas retain offline behavior.
// Callers must leave unavailable stores nil rather than use typed nil pointers.
type PortfolioStores struct {
	Posts           PostStore
	Engagement      EngagementStore
	Guestbook       GuestbookStore
	Admin           AdminStore
	Views           ViewStore
	Pages           PageStore
	Music           MusicStore
	ProjectStatuses ProjectStatusStore
	Skills          SkillStore
	Hackathons      HackathonStore
	Experience      ExperienceStore
}
