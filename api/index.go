package handler

import (
	"net/http"
	"sync"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/app"
)

var (
	router http.Handler
	once   sync.Once
)

func initRouter() {
	// Keep the database pool alive for the lifetime of the serverless instance.
	router, _ = app.New(app.LoadConfig(app.Vercel))
}

// Handler is the Vercel serverless function entrypoint.
func Handler(w http.ResponseWriter, r *http.Request) {
	once.Do(initRouter)
	router.ServeHTTP(w, r)
}
