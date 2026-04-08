package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/model"
	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/service"
)

// APIHandler holds handlers for all API endpoints.
type APIHandler struct {
	svc *service.PortfolioService
}

// NewAPIHandler creates a new APIHandler backed by the given service.
func NewAPIHandler(svc *service.PortfolioService) *APIHandler {
	return &APIHandler{svc: svc}
}

// writeJSON encodes data as JSON and writes it to the response with the given status code.
func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("failed to encode JSON response: %v", err)
	}
}

// writeCachedJSON sets Cache-Control headers for browser and CDN, then writes JSON.
// Vercel-CDN-Cache-Control controls Vercel's edge cache (stripped before reaching client).
// Cache-Control controls the browser cache.
func writeCachedJSON(w http.ResponseWriter, status int, data interface{}, cdnMaxAge int) {
	cdnVal := fmt.Sprintf("public, s-maxage=%d, stale-while-revalidate=%d", cdnMaxAge, cdnMaxAge/24)
	w.Header().Set("Vercel-CDN-Cache-Control", cdnVal)
	w.Header().Set("CDN-Cache-Control", cdnVal)
	w.Header().Set("Cache-Control", "public, max-age=10")
	writeJSON(w, status, data)
}

// writeError writes a JSON error response with the given status code and message.
func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

// HandleGetProjects returns all projects, optionally filtered by category query param.
func (h *APIHandler) HandleGetProjects(w http.ResponseWriter, r *http.Request) {
	category := r.URL.Query().Get("category")

	projects, err := h.svc.GetProjects(category)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeCachedJSON(w, http.StatusOK, projects, 86400)
}

// HandleGetProjectBySlug returns a single project by its URL slug.
func (h *APIHandler) HandleGetProjectBySlug(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")

	project, err := h.svc.GetProjectBySlug(slug)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeCachedJSON(w, http.StatusOK, project, 86400)
}

// HandleGetHackathons returns all hackathons sorted by date descending.
func (h *APIHandler) HandleGetHackathons(w http.ResponseWriter, r *http.Request) {
	hackathons, err := h.svc.GetHackathons()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeCachedJSON(w, http.StatusOK, hackathons, 86400)
}

// HandleGetExperience returns all experience entries.
func (h *APIHandler) HandleGetExperience(w http.ResponseWriter, r *http.Request) {
	experience, err := h.svc.GetExperience()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeCachedJSON(w, http.StatusOK, experience, 86400)
}

// HandleGetSkills returns all skill domains.
func (h *APIHandler) HandleGetSkills(w http.ResponseWriter, r *http.Request) {
	skills, err := h.svc.GetSkills()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeCachedJSON(w, http.StatusOK, skills, 86400)
}

// HandleGetMusic returns the music profile.
func (h *APIHandler) HandleGetMusic(w http.ResponseWriter, r *http.Request) {
	music, err := h.svc.GetMusic()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeCachedJSON(w, http.StatusOK, music, 86400)
}

// HandleContact processes a contact form submission.
func (h *APIHandler) HandleContact(w http.ResponseWriter, r *http.Request) {
	var req model.ContactRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Honeypot check: if the hidden Website field is filled, it's a bot.
	if req.Website != "" {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
		return
	}

	// Validate required fields.
	if strings.TrimSpace(req.Name) == "" || strings.TrimSpace(req.Email) == "" || strings.TrimSpace(req.Message) == "" {
		writeError(w, http.StatusBadRequest, "name, email, and message are required")
		return
	}

	// Persist to Supabase (if configured)
	if err := h.svc.CreateContactSubmission(req.Name, req.Email, req.Message); err != nil {
		log.Printf("Failed to persist contact submission: %v", err)
	}

	log.Printf("Contact request from %s <%s>: %s", req.Name, req.Email, req.Message)

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// HandleGetBlogPosts returns all published blog posts.
func (h *APIHandler) HandleGetBlogPosts(w http.ResponseWriter, r *http.Request) {
	posts, err := h.svc.GetBlogPosts()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if posts == nil {
		posts = []model.BlogPost{}
	}

	writeCachedJSON(w, http.StatusOK, posts, 60)
}

// HandleGetBlogPostBySlug returns a single blog post by slug.
func (h *APIHandler) HandleGetBlogPostBySlug(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")

	post, err := h.svc.GetBlogPostBySlug(slug)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeCachedJSON(w, http.StatusOK, post, 60)
}

// HandleCreateFeedback processes a visitor feedback submission.
func (h *APIHandler) HandleCreateFeedback(w http.ResponseWriter, r *http.Request) {
	var req model.FeedbackRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if strings.TrimSpace(req.Message) == "" {
		writeError(w, http.StatusBadRequest, "message is required")
		return
	}

	if err := h.svc.CreateFeedback(req.Name, req.Message); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save feedback")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// HandleHealth returns a simple health check response.
func (h *APIHandler) HandleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// HandleGetGuestbook returns all guestbook entries.
func (h *APIHandler) HandleGetGuestbook(w http.ResponseWriter, r *http.Request) {
	entries, err := h.svc.GetGuestbook()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if entries == nil {
		entries = []model.GuestbookEntry{}
	}
	writeCachedJSON(w, http.StatusOK, entries, 60)
}

// HandleCreateGuestbookEntry adds a new guestbook comment.
func (h *APIHandler) HandleCreateGuestbookEntry(w http.ResponseWriter, r *http.Request) {
	var req model.GuestbookRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if strings.TrimSpace(req.Message) == "" || strings.TrimSpace(req.GitHubUsername) == "" {
		writeError(w, http.StatusBadRequest, "message and githubUsername are required")
		return
	}
	entry, err := h.svc.CreateGuestbookEntry(req.GitHubUsername, req.GitHubAvatarURL, req.GitHubProfileURL, req.Message)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, entry)
}

// HandleGetViews increments and returns the page view count.
func (h *APIHandler) HandleGetViews(w http.ResponseWriter, r *http.Request) {
	count, err := h.svc.IncrementAndGetViews()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]int64{"views": count})
}

// --- Page handlers ---

// validPageIDs defines the allowed page IDs for the pages endpoint.
var validPageIDs = map[string]bool{
	"soul":    true,
	"contact": true,
	"music":   true,
}

// HandleGetPage returns the JSONB content of a page by ID.
func (h *APIHandler) HandleGetPage(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	if !validPageIDs[id] {
		writeError(w, http.StatusNotFound, fmt.Sprintf("page %q not found", id))
		return
	}

	content, err := h.svc.GetPage(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if content == nil {
		writeCachedJSON(w, http.StatusOK, json.RawMessage(`{}`), 86400)
		return
	}

	writeCachedJSON(w, http.StatusOK, content, 86400)
}

// HandleUpdatePage updates the JSONB content of a page by ID (admin only).
func (h *APIHandler) HandleUpdatePage(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	if !validPageIDs[id] {
		writeError(w, http.StatusNotFound, fmt.Sprintf("page %q not found", id))
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read request body")
		return
	}

	if !json.Valid(body) {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	content := json.RawMessage(body)
	updated, err := h.svc.UpdatePage(id, content)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, updated)
}

// --- Music track handlers ---

// HandleGetMusicTracks returns all music tracks.
func (h *APIHandler) HandleGetMusicTracks(w http.ResponseWriter, r *http.Request) {
	tracks, err := h.svc.GetMusicTracks()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if tracks == nil {
		tracks = []model.MusicTrack{}
	}

	writeCachedJSON(w, http.StatusOK, tracks, 86400)
}

// musicTrackRequest is the JSON body for create/update music track requests.
type musicTrackRequest struct {
	Slug      string `json:"slug"`
	Name      string `json:"name"`
	Genre     string `json:"genre"`
	Original  string `json:"original"`
	Notes     string `json:"notes"`
	FileURL   string `json:"fileUrl"`
	SortOrder int    `json:"sortOrder"`
}

// HandleCreateMusicTrack creates a new music track (admin only).
func (h *APIHandler) HandleCreateMusicTrack(w http.ResponseWriter, r *http.Request) {
	var req musicTrackRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if strings.TrimSpace(req.Name) == "" || strings.TrimSpace(req.Slug) == "" || strings.TrimSpace(req.Genre) == "" || strings.TrimSpace(req.Original) == "" || strings.TrimSpace(req.FileURL) == "" {
		writeError(w, http.StatusBadRequest, "name, slug, genre, original, and fileUrl are required")
		return
	}

	track, err := h.svc.CreateMusicTrack(req.Slug, req.Name, req.Genre, req.Original, req.Notes, req.FileURL, req.SortOrder)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, track)
}

// HandleUpdateMusicTrack updates an existing music track (admin only).
func (h *APIHandler) HandleUpdateMusicTrack(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req musicTrackRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if strings.TrimSpace(req.Name) == "" || strings.TrimSpace(req.Slug) == "" || strings.TrimSpace(req.Genre) == "" || strings.TrimSpace(req.Original) == "" || strings.TrimSpace(req.FileURL) == "" {
		writeError(w, http.StatusBadRequest, "name, slug, genre, original, and fileUrl are required")
		return
	}

	track, err := h.svc.UpdateMusicTrack(id, req.Slug, req.Name, req.Genre, req.Original, req.Notes, req.FileURL, req.SortOrder)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, track)
}

// HandleDeleteMusicTrack deletes a music track by ID (admin only).
func (h *APIHandler) HandleDeleteMusicTrack(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	if err := h.svc.DeleteMusicTrack(id); err != nil {
		if strings.Contains(err.Error(), "not found") {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// --- Admin handlers ---

// blogPostRequest is the JSON body for create/update blog post requests.
type blogPostRequest struct {
	Slug    string `json:"slug"`
	Title   string `json:"title"`
	Content string `json:"content"`
	Preview string `json:"preview"`
}

// HandleCreateBlogPost creates a new blog post (admin only).
func (h *APIHandler) HandleCreateBlogPost(w http.ResponseWriter, r *http.Request) {
	var req blogPostRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if strings.TrimSpace(req.Slug) == "" || strings.TrimSpace(req.Title) == "" || strings.TrimSpace(req.Content) == "" {
		writeError(w, http.StatusBadRequest, "slug, title, and content are required")
		return
	}

	post, err := h.svc.CreateBlogPost(req.Slug, req.Title, req.Content, req.Preview)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, post)
}

// HandleUpdateBlogPost updates an existing blog post (admin only).
func (h *APIHandler) HandleUpdateBlogPost(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req blogPostRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if strings.TrimSpace(req.Slug) == "" || strings.TrimSpace(req.Title) == "" || strings.TrimSpace(req.Content) == "" {
		writeError(w, http.StatusBadRequest, "slug, title, and content are required")
		return
	}

	post, err := h.svc.UpdateBlogPost(id, req.Slug, req.Title, req.Content, req.Preview)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, post)
}

// HandleDeleteBlogPost deletes a blog post by ID (admin only).
func (h *APIHandler) HandleDeleteBlogPost(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	if err := h.svc.DeleteBlogPost(id); err != nil {
		if strings.Contains(err.Error(), "not found") {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// HandleGetFeedback returns all feedback entries (admin only).
func (h *APIHandler) HandleGetFeedback(w http.ResponseWriter, r *http.Request) {
	feedback, err := h.svc.GetFeedback()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if feedback == nil {
		feedback = []model.Feedback{}
	}

	writeCachedJSON(w, http.StatusOK, feedback, 60)
}

// HandleDeleteFeedback deletes a feedback entry by ID (admin only).
func (h *APIHandler) HandleDeleteFeedback(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	if err := h.svc.DeleteFeedback(id); err != nil {
		if strings.Contains(err.Error(), "not found") {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// --- Post likes / comments / notifications handlers ---

// HandleGetPostStats returns like count, comment count, and user-liked status for a post.
func (h *APIHandler) HandleGetPostStats(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	user := r.URL.Query().Get("user")

	stats, err := h.svc.GetPostStats(slug, user)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeCachedJSON(w, http.StatusOK, stats, 60)
}

// HandleGetComments returns all comments for a post.
func (h *APIHandler) HandleGetComments(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")

	comments, err := h.svc.GetComments(slug)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if comments == nil {
		comments = []model.PostComment{}
	}

	writeCachedJSON(w, http.StatusOK, comments, 60)
}

// HandleToggleLike toggles a like on a post for a GitHub user.
func (h *APIHandler) HandleToggleLike(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")

	var req model.LikeToggleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if strings.TrimSpace(req.GitHubUsername) == "" {
		writeError(w, http.StatusBadRequest, "githubUsername is required")
		return
	}

	liked, err := h.svc.ToggleLike(slug, req.GitHubUsername)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]bool{"liked": liked})
}

// HandleCreateComment adds a comment to a post.
func (h *APIHandler) HandleCreateComment(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")

	var req model.PostCommentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if strings.TrimSpace(req.Message) == "" || strings.TrimSpace(req.GitHubUsername) == "" {
		writeError(w, http.StatusBadRequest, "message and githubUsername are required")
		return
	}

	comment, err := h.svc.CreateComment(slug, req.GitHubUsername, req.GitHubAvatarURL, req.GitHubProfileURL, req.Message)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, comment)
}

// HandleDeleteComment deletes a comment by ID (admin only).
func (h *APIHandler) HandleDeleteComment(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	if err := h.svc.DeleteComment(id); err != nil {
		if strings.Contains(err.Error(), "not found") {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// HandleGetNotifications returns all admin notifications.
func (h *APIHandler) HandleGetNotifications(w http.ResponseWriter, r *http.Request) {
	notifications, err := h.svc.GetNotifications()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if notifications == nil {
		notifications = []model.AdminNotification{}
	}

	writeJSON(w, http.StatusOK, notifications)
}

// HandleGetUnreadCount returns the count of unread admin notifications.
func (h *APIHandler) HandleGetUnreadCount(w http.ResponseWriter, r *http.Request) {
	count, err := h.svc.GetUnreadNotificationCount()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]int{"count": count})
}

// HandleMarkNotificationRead marks a single notification as read.
func (h *APIHandler) HandleMarkNotificationRead(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	if err := h.svc.MarkNotificationRead(id); err != nil {
		if strings.Contains(err.Error(), "not found") {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// HandleMarkAllNotificationsRead marks all notifications as read.
func (h *APIHandler) HandleMarkAllNotificationsRead(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.MarkAllNotificationsRead(); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// --- Admin CRUD for skills, hackathons, experience ---

// skillRequest is the JSON body for create/update skill requests.
type skillRequest struct {
	Title        string   `json:"title"`
	Slug         string   `json:"slug"`
	Skills       []string `json:"skills"`
	BattleTested []string `json:"battleTested"`
	SortOrder    int      `json:"sortOrder"`
}

// HandleCreateSkill creates a new skill domain (admin only).
func (h *APIHandler) HandleCreateSkill(w http.ResponseWriter, r *http.Request) {
	var req skillRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if strings.TrimSpace(req.Title) == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}

	skill, err := h.svc.CreateSkill(req.Title, req.Slug, req.Skills, req.BattleTested, req.SortOrder)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, skill)
}

// HandleUpdateSkill updates an existing skill domain (admin only).
func (h *APIHandler) HandleUpdateSkill(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req skillRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if strings.TrimSpace(req.Title) == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}

	skill, err := h.svc.UpdateSkill(id, req.Title, req.Slug, req.Skills, req.BattleTested, req.SortOrder)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, skill)
}

// HandleDeleteSkill deletes a skill domain by ID (admin only).
func (h *APIHandler) HandleDeleteSkill(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	if err := h.svc.DeleteSkill(id); err != nil {
		if strings.Contains(err.Error(), "not found") {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// HandleCreateHackathon creates a new hackathon entry (admin only).
func (h *APIHandler) HandleCreateHackathon(w http.ResponseWriter, r *http.Request) {
	var req model.Hackathon
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if strings.TrimSpace(req.Name) == "" || strings.TrimSpace(req.Date) == "" || strings.TrimSpace(req.ProjectName) == "" {
		writeError(w, http.StatusBadRequest, "name, date, and projectName are required")
		return
	}

	hackathon, err := h.svc.CreateHackathon(req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, hackathon)
}

// HandleUpdateHackathon updates an existing hackathon entry (admin only).
func (h *APIHandler) HandleUpdateHackathon(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req model.Hackathon
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if strings.TrimSpace(req.Name) == "" || strings.TrimSpace(req.Date) == "" || strings.TrimSpace(req.ProjectName) == "" {
		writeError(w, http.StatusBadRequest, "name, date, and projectName are required")
		return
	}

	hackathon, err := h.svc.UpdateHackathon(id, req)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, hackathon)
}

// HandleDeleteHackathon deletes a hackathon entry by ID (admin only).
func (h *APIHandler) HandleDeleteHackathon(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	if err := h.svc.DeleteHackathon(id); err != nil {
		if strings.Contains(err.Error(), "not found") {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// HandleCreateExperience creates a new experience entry (admin only).
func (h *APIHandler) HandleCreateExperience(w http.ResponseWriter, r *http.Request) {
	var req model.Experience
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if strings.TrimSpace(req.Role) == "" || strings.TrimSpace(req.Company) == "" || strings.TrimSpace(req.StartDate) == "" {
		writeError(w, http.StatusBadRequest, "role, company, and startDate are required")
		return
	}

	experience, err := h.svc.CreateExperience(req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, experience)
}

// HandleUpdateExperience updates an existing experience entry (admin only).
func (h *APIHandler) HandleUpdateExperience(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req model.Experience
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if strings.TrimSpace(req.Role) == "" || strings.TrimSpace(req.Company) == "" || strings.TrimSpace(req.StartDate) == "" {
		writeError(w, http.StatusBadRequest, "role, company, and startDate are required")
		return
	}

	experience, err := h.svc.UpdateExperience(id, req)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, experience)
}

// HandleDeleteExperience deletes an experience entry by ID (admin only).
func (h *APIHandler) HandleDeleteExperience(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	if err := h.svc.DeleteExperience(id); err != nil {
		if strings.Contains(err.Error(), "not found") {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}
