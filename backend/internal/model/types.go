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
	Date        string     `json:"date"` // YYYY.MM
	Name        string     `json:"name"`
	City        string     `json:"city,omitempty"`
	Country     string     `json:"country,omitempty"`
	Coordinates [2]float64 `json:"coordinates,omitempty"`
	IsRemote    bool       `json:"isRemote,omitempty"`
	ProjectName string     `json:"projectName"`
	ProjectSlug string     `json:"projectSlug,omitempty"`
	ProjectURL  string     `json:"projectUrl,omitempty"`
	Result      string     `json:"result,omitempty"`
	Solo        bool       `json:"solo,omitempty"`
	Domain      string     `json:"domain"`
}

// Experience represents a professional experience entry.
type Experience struct {
	Role           string   `json:"role"`
	Company        string   `json:"company"`
	Location       string   `json:"location"`
	StartDate      string   `json:"startDate"` // YYYY-MM
	EndDate        string   `json:"endDate,omitempty"` // YYYY-MM or "Present"
	SkillAssembled string   `json:"skillAssembled"`
	Highlights     []string `json:"highlights"`
	Note           string   `json:"note,omitempty"`
}

// SkillSubcategory represents a named group of skills within a domain.
type SkillSubcategory struct {
	Name   string   `json:"name"`
	Skills []string `json:"skills"`
}

// SkillDomain represents a top-level skill category.
type SkillDomain struct {
	Title         string             `json:"title"`
	Icon          string             `json:"icon,omitempty"`
	Subcategories []SkillSubcategory `json:"subcategories,omitempty"`
	Skills        []string           `json:"skills,omitempty"`
	BattleTested  []string           `json:"battleTested"`
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

// ContactRequest represents an incoming contact form submission.
type ContactRequest struct {
	Name    string `json:"name"`
	Email   string `json:"email"`
	Message string `json:"message"`
	Website string `json:"website"` // honeypot
}
