package handler

import (
	"errors"
	"net/http"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/service"
)

// GitHubContributions is the contribution-calendar capability consumed by HTTP handlers.
type GitHubContributions interface{ Contributions() ([]byte, error) }

func writeExternalError(w http.ResponseWriter, err error) {
	var external *service.ExternalError
	if errors.As(err, &external) {
		writeError(w, external.StatusCode, external.Message)
		return
	}
	writeError(w, http.StatusInternalServerError, err.Error())
}
