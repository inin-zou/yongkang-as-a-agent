package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/service"
)

// Preserve the request/response type names for existing callers.
type DraftRequest = service.DraftRequest
type DraftResponse = service.DraftResponse
type RefineRequest = service.RefineRequest

// DraftService is the draft-generation capability consumed by HTTP handlers.
type DraftService interface {
	Configured() bool
	GenerateDraft(service.DraftRequest) (*service.DraftResponse, error)
	RefineDraft(service.RefineRequest) (*service.DraftResponse, error)
}

func (h *APIHandler) HandleGenerateDraft(w http.ResponseWriter, r *http.Request) {
	if !h.drafts.Configured() {
		writeError(w, http.StatusServiceUnavailable, "AI drafting not configured")
		return
	}
	var req DraftRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if strings.TrimSpace(req.RoughIdea) == "" && len(req.MediaURLs) == 0 {
		writeError(w, http.StatusBadRequest, "roughIdea or mediaUrls required")
		return
	}
	draft, err := h.drafts.GenerateDraft(req)
	if err != nil {
		writeExternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, draft)
}

func (h *APIHandler) HandleRefineDraft(w http.ResponseWriter, r *http.Request) {
	if !h.drafts.Configured() {
		writeError(w, http.StatusServiceUnavailable, "AI drafting not configured")
		return
	}
	var req RefineRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if strings.TrimSpace(req.ExistingContent) == "" {
		writeError(w, http.StatusBadRequest, "existingContent is required")
		return
	}
	draft, err := h.drafts.RefineDraft(req)
	if err != nil {
		writeExternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, draft)
}
