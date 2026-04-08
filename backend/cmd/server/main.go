package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/handler"
	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/middleware"
	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/repository"
	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/service"
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

	adminEmail := os.Getenv("ADMIN_EMAIL")
	if adminEmail == "" {
		adminEmail = "yongkang.zou.ai@gmail.com"
	}

	supabaseURL := os.Getenv("SUPABASE_URL")
	anonKey := os.Getenv("SUPABASE_ANON_KEY")

	jsonRepo := repository.NewJSONRepository(dataDir)

	// Connect to Supabase if DATABASE_URL is set
	var primary repository.DataRepository
	var supabase *repository.SupabaseRepository
	if dbURL := os.Getenv("DATABASE_URL"); dbURL != "" {
		var err error
		supabase, err = repository.NewSupabaseRepository(dbURL)
		if err != nil {
			log.Printf("Warning: failed to connect to Supabase: %v (running without database)", err)
		} else {
			log.Println("Connected to Supabase")
			defer supabase.Close()
			primary = supabase
		}
	} else {
		log.Println("DATABASE_URL not set — running without Supabase")
	}

	svc := service.NewPortfolioService(primary, jsonRepo, supabase)
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
		r.Get("/posts", h.HandleGetBlogPosts)
		r.Get("/posts/{slug}/stats", h.HandleGetPostStats)
		r.Get("/posts/{slug}/comments", h.HandleGetComments)
		r.With(middleware.RateLimit(30, time.Hour)).Post("/posts/{slug}/like", h.HandleToggleLike)
		r.With(middleware.RateLimit(20, time.Hour)).Post("/posts/{slug}/comments", h.HandleCreateComment)
		r.Get("/posts/{slug}", h.HandleGetBlogPostBySlug)
		r.With(middleware.RateLimit(3, time.Hour)).Post("/contact", h.HandleContact)
		r.With(middleware.RateLimit(10, time.Hour)).Post("/feedback", h.HandleCreateFeedback)
		r.Get("/health", h.HandleHealth)
		r.Get("/views", h.HandleGetViews)
		r.Get("/guestbook", h.HandleGetGuestbook)
		r.With(middleware.RateLimit(10, time.Hour)).Post("/guestbook", h.HandleCreateGuestbookEntry)
		r.Get("/pages/{id}", h.HandleGetPage)
		r.Get("/music-tracks", h.HandleGetMusicTracks)

		r.Route("/admin", func(r chi.Router) {
			r.Use(middleware.AdminOnly(supabaseURL, anonKey, adminEmail))
			r.Post("/posts", h.HandleCreateBlogPost)
			r.Put("/posts/{id}", h.HandleUpdateBlogPost)
			r.Delete("/posts/{id}", h.HandleDeleteBlogPost)
			r.Get("/feedback", h.HandleGetFeedback)
			r.Delete("/feedback/{id}", h.HandleDeleteFeedback)
			r.Delete("/comments/{id}", h.HandleDeleteComment)
			r.Get("/notifications", h.HandleGetNotifications)
			r.Get("/notifications/unread", h.HandleGetUnreadCount)
			r.Put("/notifications/{id}/read", h.HandleMarkNotificationRead)
			r.Put("/notifications/read-all", h.HandleMarkAllNotificationsRead)
			r.Put("/pages/{id}", h.HandleUpdatePage)
			r.Post("/music-tracks", h.HandleCreateMusicTrack)
			r.Put("/music-tracks/{id}", h.HandleUpdateMusicTrack)
			r.Delete("/music-tracks/{id}", h.HandleDeleteMusicTrack)
			r.Post("/skills", h.HandleCreateSkill)
			r.Put("/skills/{id}", h.HandleUpdateSkill)
			r.Delete("/skills/{id}", h.HandleDeleteSkill)
			r.Post("/hackathons", h.HandleCreateHackathon)
			r.Put("/hackathons/{id}", h.HandleUpdateHackathon)
			r.Delete("/hackathons/{id}", h.HandleDeleteHackathon)
			r.Post("/experience", h.HandleCreateExperience)
			r.Put("/experience/{id}", h.HandleUpdateExperience)
			r.Delete("/experience/{id}", h.HandleDeleteExperience)
		})
	})

	log.Printf("Server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
