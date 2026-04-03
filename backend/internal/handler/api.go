package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/inin-zou/yongkang-as-a-agent/backend/internal/model"
	"github.com/inin-zou/yongkang-as-a-agent/backend/internal/service"
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

	log.Printf("Contact request from %s <%s>: %s", req.Name, req.Email, req.Message)

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// HandleHealth returns a simple health check response.
func (h *APIHandler) HandleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
