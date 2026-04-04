package handler

import (
	"encoding/json"
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

	writeJSON(w, http.StatusOK, projects)
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

	writeJSON(w, http.StatusOK, project)
}

// HandleGetHackathons returns all hackathons sorted by date descending.
func (h *APIHandler) HandleGetHackathons(w http.ResponseWriter, r *http.Request) {
	hackathons, err := h.svc.GetHackathons()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, hackathons)
}

// HandleGetExperience returns all experience entries.
func (h *APIHandler) HandleGetExperience(w http.ResponseWriter, r *http.Request) {
	experience, err := h.svc.GetExperience()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, experience)
}

// HandleGetSkills returns all skill domains.
func (h *APIHandler) HandleGetSkills(w http.ResponseWriter, r *http.Request) {
	skills, err := h.svc.GetSkills()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, skills)
}

// HandleGetMusic returns the music profile.
func (h *APIHandler) HandleGetMusic(w http.ResponseWriter, r *http.Request) {
	music, err := h.svc.GetMusic()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, music)
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

	writeJSON(w, http.StatusOK, posts)
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

	writeJSON(w, http.StatusOK, post)
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
	writeJSON(w, http.StatusOK, entries)
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

	writeJSON(w, http.StatusOK, feedback)
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

	writeJSON(w, http.StatusOK, stats)
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

	writeJSON(w, http.StatusOK, comments)
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
