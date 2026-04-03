package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/inin-zou/yongkang-as-a-agent/backend/internal/handler"
	"github.com/inin-zou/yongkang-as-a-agent/backend/internal/middleware"
	"github.com/inin-zou/yongkang-as-a-agent/backend/internal/repository"
	"github.com/inin-zou/yongkang-as-a-agent/backend/internal/service"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dataDir := os.Getenv("DATA_DIR")
	if dataDir == "" {
		dataDir = "./data"
	}

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}

	repo := repository.NewJSONRepository(dataDir)
	svc := service.NewPortfolioService(repo)
	h := handler.NewAPIHandler(svc)

	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.CORS(frontendURL))

	r.Route("/api", func(r chi.Router) {
		r.Get("/projects", h.HandleGetProjects)
		r.Get("/projects/{slug}", h.HandleGetProjectBySlug)
		r.Get("/hackathons", h.HandleGetHackathons)
		r.Get("/experience", h.HandleGetExperience)
		r.Get("/skills", h.HandleGetSkills)
		r.Get("/music", h.HandleGetMusic)
		r.With(middleware.RateLimit(3, time.Hour)).Post("/contact", h.HandleContact)
		r.Get("/health", h.HandleHealth)
	})

	log.Printf("Server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
