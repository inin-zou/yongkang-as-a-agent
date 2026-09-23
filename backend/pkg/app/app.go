// Package app is the shared composition root for local and serverless entry points.
package app

import (
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	backend "github.com/inin-zou/yongkang-as-a-agent/backend"
	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/handler"
	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/middleware"
	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/repository"
	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/service"
)

// New builds the application and returns its handler and database cleanup function.
// An empty DataDir selects embedded data; otherwise fallback data is read from disk.
// A missing or unavailable database leaves the application running without Supabase.
func New(cfg Config) (http.Handler, func()) {
	var fallback repository.DataRepository = repository.NewEmbeddedRepository(backend.DataFS)
	if cfg.DataDir != "" {
		fallback = repository.NewJSONRepository(cfg.DataDir)
	}

	var primary repository.DataRepository
	var supabase *repository.SupabaseRepository
	closeApp := func() {}
	if cfg.DatabaseURL != "" {
		var err error
		supabase, err = repository.NewSupabaseRepository(cfg.DatabaseURL)
		if err != nil {
			supabase = nil
			log.Printf("Warning: failed to connect to Supabase: %v (running without database)", err)
		} else {
			log.Println("Connected to Supabase")
			closeApp = func() { _ = supabase.Close() }
			primary = supabase
		}
	} else {
		log.Println("DATABASE_URL not set — running without Supabase")
	}

	var stores service.PortfolioStores
	if supabase != nil {
		stores = service.PortfolioStores{
			Posts: supabase, Engagement: supabase, Guestbook: supabase,
			Admin: supabase, Views: supabase, Pages: supabase, Music: supabase,
			ProjectStatuses: supabase, Skills: supabase, Hackathons: supabase, Experience: supabase,
		}
	}
	svc := service.NewPortfolioService(repository.WithFallback(primary, fallback), stores)
	h := handler.NewAPIHandler(svc, service.NewGitHubService(cfg.GitHubToken), service.NewGeminiService(cfg.GeminiAPIKey))

	seo := handler.NewSEOHandler(service.NewSEOService(svc), handler.NewPageTemplate(cfg.IndexHTMLFiles, cfg.ShellHosts))

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.CORS(cfg.FrontendURL))

	// Every non-API path is a page of the SPA: served with its own head, or a
	// real 301/404 (vercel.json sends page URLs here; static files win first).
	r.Get("/sitemap.xml", seo.HandleSitemap)
	r.Get("/*", seo.HandlePage)
	r.Head("/*", seo.HandlePage)

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
		r.Get("/project-statuses", h.HandleGetProjectStatuses)
		r.Get("/github-contributions", h.HandleGetGitHubContributions)

		r.Route("/admin", func(r chi.Router) {
			r.Use(middleware.AdminOnly(cfg.SupabaseURL, cfg.SupabaseAnonKey, cfg.AdminEmail))
			r.Post("/posts", h.HandleCreateBlogPost)
			r.Put("/posts/{id}", h.HandleUpdateBlogPost)
			r.Put("/posts/{id}/archive", h.HandleArchiveBlogPost)
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
			r.Post("/project-statuses", h.HandleCreateProjectStatus)
			r.Put("/project-statuses/{id}", h.HandleUpdateProjectStatus)
			r.Delete("/project-statuses/{id}", h.HandleDeleteProjectStatus)
			r.Post("/hackathons", h.HandleCreateHackathon)
			r.Put("/hackathons/{id}", h.HandleUpdateHackathon)
			r.Delete("/hackathons/{id}", h.HandleDeleteHackathon)
			r.Post("/experience", h.HandleCreateExperience)
			r.Put("/experience/{id}", h.HandleUpdateExperience)
			r.Delete("/experience/{id}", h.HandleDeleteExperience)
			r.Post("/generate-draft", h.HandleGenerateDraft)
			r.Post("/refine-draft", h.HandleRefineDraft)
		})
	})

	return r, closeApp
}
