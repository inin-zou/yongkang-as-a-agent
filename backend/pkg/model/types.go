package model

// Project represents a portfolio project entry.
type Project struct {
	Slug        string   `json:"slug"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Features    []string `json:"features,omitempty"`
	Tags        []string `json:"tags"`
	Category    string   `json:"category"` // "hackathon" | "industry" | "academic" | "side"
	CodeURL     string   `json:"codeUrl,omitempty"`
	DemoURL     string   `json:"demoUrl,omitempty"`
	Date        string   `json:"date"` // YYYY-MM
	IsFavorite  bool     `json:"isFavorite,omitempty"`
	Result      string   `json:"result,omitempty"`
	Thumbnail   string   `json:"thumbnail,omitempty"`
}

// Hackathon represents a hackathon event entry.
type Hackathon struct {
	ID          string      `json:"id,omitempty"`
	Date        string      `json:"date"` // YYYY.MM
	Name        string      `json:"name"`
	City        string      `json:"city,omitempty"`
	Country     string      `json:"country,omitempty"`
	Coordinates *[2]float64 `json:"coordinates,omitempty"`
	Lat         *float64    `json:"lat,omitempty"`
	Lng         *float64    `json:"lng,omitempty"`
	IsRemote    bool        `json:"isRemote,omitempty"`
	ProjectName string      `json:"projectName"`
	ProjectSlug string      `json:"projectSlug,omitempty"`
	ProjectURL  string      `json:"projectUrl,omitempty"`
	Result      string      `json:"result,omitempty"`
	Solo        bool        `json:"solo,omitempty"`
	Domain      string      `json:"domain"`
}

// Experience represents a professional experience entry.
type Experience struct {
	ID             string   `json:"id,omitempty"`
	Role           string   `json:"role"`
	Company        string   `json:"company"`
	Location       string   `json:"location"`
	StartDate      string   `json:"startDate"` // YYYY-MM
	EndDate        string   `json:"endDate,omitempty"` // YYYY-MM or "Present"
	SkillAssembled string   `json:"skillAssembled"`
	Highlights     []string `json:"highlights"`
	Note           string   `json:"note,omitempty"`
	SortOrder      int      `json:"sortOrder"`
}

// SkillSubcategory represents a named group of skills within a domain.
type SkillSubcategory struct {
	Name   string   `json:"name"`
	Skills []string `json:"skills"`
}

// SkillDomain represents a top-level skill category.
type SkillDomain struct {
	ID            string             `json:"id,omitempty"`
	Title         string             `json:"title"`
	Slug          string             `json:"slug,omitempty"`
	Icon          string             `json:"icon,omitempty"`
	Subcategories []SkillSubcategory `json:"subcategories,omitempty"`
	Skills        []string           `json:"skills,omitempty"`
	BattleTested  []string           `json:"battleTested"`
	SortOrder     int                `json:"sortOrder"`
}

// Music represents the music artist profile.
type Music struct {
	ArtistName string            `json:"artistName"`
	Genre      string            `json:"genre"`
	Status     string            `json:"status"`
	Location   string            `json:"location"`
	Bio        string            `json:"bio"`
	Platforms  map[string]string `json:"platforms"` // name -> URL
}

// MusicTrack represents a single music track entry.
type MusicTrack struct {
	ID        string `json:"id,omitempty"`
	Slug      string `json:"slug"`
	Name      string `json:"name"`
	Genre     string `json:"genre"`
	Original  string `json:"original"`
	Notes     string `json:"notes"`
	FileURL   string `json:"fileUrl"`
	SortOrder int    `json:"sortOrder"`
}

// ContactRequest represents an incoming contact form submission.
type ContactRequest struct {
	Name    string `json:"name"`
	Email   string `json:"email"`
	Message string `json:"message"`
	Website string `json:"website"` // honeypot
}

// BlogPost represents a blog entry in MEMORY.md.
type BlogPost struct {
	ID          string `json:"id"`
	Slug        string `json:"slug"`
	Title       string `json:"title"`
	Content     string `json:"content"`
	Preview     string `json:"preview"`
	Category    string `json:"category"`
	PublishedAt string `json:"publishedAt"`
	UpdatedAt  string `json:"updatedAt,omitempty"`
}

// Feedback represents a visitor note/feedback entry.
type Feedback struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Message   string `json:"message"`
	CreatedAt string `json:"createdAt"`
}

// FeedbackRequest represents an incoming feedback submission.
type FeedbackRequest struct {
	Name    string `json:"name"`
	Message string `json:"message"`
}

// GuestbookEntry represents a GitHub-authenticated visitor comment.
type GuestbookEntry struct {
	ID               string `json:"id"`
	GitHubUsername    string `json:"githubUsername"`
	GitHubAvatarURL  string `json:"githubAvatarUrl"`
	GitHubProfileURL string `json:"githubProfileUrl"`
	Message          string `json:"message"`
	CreatedAt        string `json:"createdAt"`
}

// GuestbookRequest represents an incoming guestbook comment.
type GuestbookRequest struct {
	GitHubUsername    string `json:"githubUsername"`
	GitHubAvatarURL  string `json:"githubAvatarUrl"`
	GitHubProfileURL string `json:"githubProfileUrl"`
	Message          string `json:"message"`
}

// PostComment represents a comment on a blog post.
type PostComment struct {
	ID               string `json:"id"`
	PostID           string `json:"postId"`
	GitHubUsername    string `json:"githubUsername"`
	GitHubAvatarURL  string `json:"githubAvatarUrl"`
	GitHubProfileURL string `json:"githubProfileUrl"`
	Message          string `json:"message"`
	CreatedAt        string `json:"createdAt"`
}

// PostCommentRequest represents an incoming comment submission.
type PostCommentRequest struct {
	GitHubUsername    string `json:"githubUsername"`
	GitHubAvatarURL  string `json:"githubAvatarUrl"`
	GitHubProfileURL string `json:"githubProfileUrl"`
	Message          string `json:"message"`
}

// LikeToggleRequest represents a like/unlike action.
type LikeToggleRequest struct {
	GitHubUsername string `json:"githubUsername"`
}

// PostStats represents aggregated stats for a blog post.
type PostStats struct {
	LikeCount    int  `json:"likeCount"`
	CommentCount int  `json:"commentCount"`
	UserLiked    bool `json:"userLiked"`
}

// ProjectStatus represents an active project entry in the agent's status board.
type ProjectStatus struct {
	ID          string `json:"id,omitempty"`
	Name        string `json:"name"`
	Status      string `json:"status"`      // "ACTIVE", "PLANNING", "ON HOLD", "SHIPPED"
	Description string `json:"description"`
	NextStep    string `json:"nextStep,omitempty"`
	Links       string `json:"links,omitempty"` // comma-separated URLs
	SortOrder   int    `json:"sortOrder"`
}

// AdminNotification represents a notification for the admin dashboard.
type AdminNotification struct {
	ID        string  `json:"id"`
	Type      string  `json:"type"`
	Message   string  `json:"message"`
	PostID    *string `json:"postId"`
	IsRead    bool    `json:"isRead"`
	CreatedAt string  `json:"createdAt"`
}
