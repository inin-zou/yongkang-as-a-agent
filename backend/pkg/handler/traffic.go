package handler

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"net"
	"net/http"
	"strconv"
	"strings"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/model"
	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/service"
)

// Traffic records page views and reports them.
type Traffic interface {
	TrackPageView(req model.TrackRequest, v service.Visitor) error
	RecordCrawl(path, userAgent, country string) error
	GetTraffic(days int) (*model.TrafficReport, error)
}

// TrafficHandler serves POST /api/track and GET /api/admin/traffic.
type TrafficHandler struct {
	traffic Traffic
}

// NewTrafficHandler creates the traffic handler.
func NewTrafficHandler(traffic Traffic) *TrafficHandler {
	return &TrafficHandler{traffic: traffic}
}

// HandleTrack records one page view sent by the SPA. It answers 204 even when
// storage fails: tracking must never surface as an error to a visitor.
func (h *TrafficHandler) HandleTrack(w http.ResponseWriter, r *http.Request) {
	var req model.TrackRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 4<<10)).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	err := h.traffic.TrackPageView(req, visitorOf(r))
	if errors.Is(err, service.ErrInvalidVisit) {
		writeError(w, http.StatusBadRequest, "invalid path")
		return
	}
	if err != nil {
		log.Printf("track: %v", err)
	}
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(http.StatusNoContent)
}

// HandleGetTraffic reports the last ?days= days (default 30).
func (h *TrafficHandler) HandleGetTraffic(w http.ResponseWriter, r *http.Request) {
	days, _ := strconv.Atoi(r.URL.Query().Get("days"))
	report, err := h.traffic.GetTraffic(days)
	if err != nil {
		log.Printf("traffic report: %v", err)
		writeError(w, http.StatusInternalServerError, "traffic unavailable")
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, http.StatusOK, report)
}

// visitorOf reads the client behind Vercel's proxy: its first X-Forwarded-For
// hop, and the country from Vercel's geo header.
func visitorOf(r *http.Request) service.Visitor {
	ip := strings.TrimSpace(strings.Split(r.Header.Get("X-Forwarded-For"), ",")[0])
	if ip == "" {
		ip = r.Header.Get("X-Real-Ip")
	}
	if ip == "" {
		ip, _, _ = net.SplitHostPort(r.RemoteAddr)
	}
	return service.Visitor{IP: ip, UserAgent: r.UserAgent(), Country: r.Header.Get("X-Vercel-Ip-Country")}
}
