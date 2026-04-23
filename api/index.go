package handler

import (
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	backend "github.com/inin-zou/yongkang-as-a-agent/backend"
	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/handler"
	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/middleware"
	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/repository"
	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/service"
)

var (
	router http.Handler
	once   sync.Once
)

func initRouter() {

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "*"
	}

	adminEmail := os.Getenv("ADMIN_EMAIL")
	if adminEmail == "" {
		adminEmail = "yongkang.zou.ai@gmail.com"
	}

	supabaseURL := os.Getenv("SUPABASE_URL")
	anonKey := os.Getenv("SUPABASE_ANON_KEY")
	geminiKey := os.Getenv("GEMINI_API_KEY")

	embedded := repository.NewEmbeddedRepository(backend.DataFS)

	var primary repository.DataRepository
	var supabase *repository.SupabaseRepository
	if dbURL := os.Getenv("DATABASE_URL"); dbURL != "" {
		var err error
		supabase, err = repository.NewSupabaseRepository(dbURL)
		if err != nil {
			supabase = nil
		} else {
			primary = supabase
		}
	}

	svc := service.NewPortfolioService(primary, embedded, supabase)
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
		r.Get("/project-statuses", h.HandleGetProjectStatuses)
		r.Get("/github-contributions", h.HandleGetGitHubContributions)

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
			r.Post("/project-statuses", h.HandleCreateProjectStatus)
			r.Put("/project-statuses/{id}", h.HandleUpdateProjectStatus)
			r.Delete("/project-statuses/{id}", h.HandleDeleteProjectStatus)
			r.Post("/hackathons", h.HandleCreateHackathon)
			r.Put("/hackathons/{id}", h.HandleUpdateHackathon)
			r.Delete("/hackathons/{id}", h.HandleDeleteHackathon)
			r.Post("/experience", h.HandleCreateExperience)
			r.Put("/experience/{id}", h.HandleUpdateExperience)
			r.Delete("/experience/{id}", h.HandleDeleteExperience)
			r.Post("/generate-draft", h.HandleGenerateDraft(geminiKey))
			r.Post("/refine-draft", h.HandleRefineDraft(geminiKey))
		})
	})

	router = r
}

// Handler is the Vercel serverless function entrypoint.
func Handler(w http.ResponseWriter, r *http.Request) {
	once.Do(initRouter)
	router.ServeHTTP(w, r)
}
