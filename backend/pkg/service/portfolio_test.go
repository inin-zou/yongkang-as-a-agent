package service

import (
	"encoding/json"
	"errors"
	"reflect"
	"testing"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/model"
	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/repository"
)

type postFake struct {
	PostStore
	id       string
	archived *bool
	err      error
}

func (f *postFake) SetBlogPostArchived(id string, archived bool) error {
	f.id = id
	f.archived = &archived
	return f.err
}
func (f *postFake) UpdateBlogPost(id, _, _, _, _, _, _, _ string, archived *bool, _ *[]string, _ *string) (*model.BlogPost, error) {
	f.id = id
	f.archived = archived
	return &model.BlogPost{ID: id}, f.err
}

type pageFake struct {
	content json.RawMessage
	id      string
	err     error
}

func (f *pageFake) GetPage(id string) (json.RawMessage, error) { f.id = id; return f.content, f.err }
func (f *pageFake) UpdatePage(id string, content json.RawMessage) (json.RawMessage, error) {
	f.id = id
	f.content = content
	return content, f.err
}

type adminFake struct {
	AdminStore
	id  string
	err error
}

func (f *adminFake) MarkNotificationRead(id string) error { f.id = id; return f.err }
func (f *adminFake) DeleteFeedback(id string) error       { f.id = id; return f.err }

func TestPortfolioArchiveAndAdminStores(t *testing.T) {
	sentinel := errors.New("storage failure")
	posts := &postFake{}
	pages := &pageFake{}
	admin := &adminFake{}
	s := NewPortfolioService(nil, PortfolioStores{Posts: posts, Pages: pages, Admin: admin})
	for _, archived := range []bool{true, false} {
		if err := s.SetBlogPostArchived("post", archived); err != nil || posts.id != "post" || posts.archived == nil || *posts.archived != archived {
			t.Fatalf("archive delegation failed: %v", err)
		}
	}
	for _, archived := range []*bool{nil, new(bool)} {
		if _, err := s.UpdateBlogPost("post", "slug", "title", "content", "preview", "category", "date", "updated", archived, nil, nil); err != nil || posts.archived != archived {
			t.Fatalf("archive patch changed: %v", err)
		}
	}
	posts.err = sentinel
	if err := s.SetBlogPostArchived("post", true); err != sentinel {
		t.Fatalf("lost archive error: %v", err)
	}
	content := json.RawMessage(`{"title":"hello"}`)
	got, err := s.UpdatePage("about", content)
	if err != nil || pages.id != "about" || string(got) != string(content) {
		t.Fatalf("page update: %s %v", got, err)
	}
	admin.err = sentinel
	if err := s.MarkNotificationRead("notification"); err != sentinel || admin.id != "notification" {
		t.Fatalf("notification: %v", err)
	}
	if err := s.DeleteFeedback("feedback"); err != sentinel || admin.id != "feedback" {
		t.Fatalf("feedback: %v", err)
	}
}

// Exercise every optional-store method so changes cannot homogenize the deliberately
// different offline results (silent submissions, empty reads, and rejected writes).
func TestPortfolioWithoutDatabase(t *testing.T) {
	s := reflect.ValueOf(NewPortfolioService(nil, PortfolioStores{}))
	reads := map[string]bool{
		"GetBlogPosts": true, "GetBlogPostBySlug": true, "CreateFeedback": true, "CreateContactSubmission": true,
		"GetFeedback": true, "GetGuestbook": true, "IncrementAndGetViews": true, "GetViews": true,
		"GetPostStats": true, "GetComments": true, "GetNotifications": true, "GetUnreadNotificationCount": true,
		"GetPage": true, "GetMusicTracks": true, "GetProjectStatuses": true,
	}
	data := map[string]bool{"GetProjects": true, "GetProjectBySlug": true, "GetHackathons": true, "GetExperience": true, "GetSkills": true, "GetMusic": true}
	for i := 0; i < s.NumMethod(); i++ {
		name := s.Type().Method(i).Name
		if data[name] {
			continue
		}
		t.Run(name, func(t *testing.T) {
			method := s.MethodByName(name)
			args := make([]reflect.Value, method.Type().NumIn())
			for j := range args {
				args[j] = reflect.Zero(method.Type().In(j))
			}
			result := method.Call(args)
			errValue := result[len(result)-1]
			if reads[name] {
				if !errValue.IsNil() {
					t.Fatalf("unexpected error: %v", errValue.Interface())
				}
			} else if errValue.IsNil() || errValue.Interface().(error).Error() != "database not configured" {
				t.Fatalf("wrong offline error: %v", errValue.Interface())
			}
			for _, v := range result[:len(result)-1] {
				if name == "GetPostStats" {
					if !reflect.DeepEqual(v.Interface(), &model.PostStats{}) {
						t.Fatalf("stats: %v", v.Interface())
					}
				} else if !v.IsZero() {
					t.Fatalf("offline value: %v", v.Interface())
				}
			}
		})
	}
}

type publicDataFake struct {
	PortfolioDataStore
	projects   []model.Project
	hackathons []model.Hackathon
	err        error
	category   string
}

func (f *publicDataFake) GetProjects() ([]model.Project, error) { return f.projects, f.err }
func (f *publicDataFake) GetProjectsByCategory(category string) ([]model.Project, error) {
	f.category = category
	return f.projects, f.err
}
func (f *publicDataFake) GetHackathons() ([]model.Hackathon, error) { return f.hackathons, f.err }

func TestPortfolioFallbackAndSorting(t *testing.T) {
	for _, primary := range []*publicDataFake{{}, {err: errors.New("unavailable")}, {projects: []model.Project{{Slug: "primary"}}}} {
		fallback := &publicDataFake{projects: []model.Project{{Slug: "fallback"}}, hackathons: []model.Hackathon{{Date: "2020"}, {Date: "2024"}}}
		s := NewPortfolioService(repository.WithFallback(primary, fallback), PortfolioStores{})
		got, err := s.GetProjects("tools")
		want := "fallback"
		if len(primary.projects) > 0 {
			want = "primary"
		}
		if err != nil || len(got) != 1 || got[0].Slug != want || primary.category != "tools" {
			t.Fatalf("projects: %v %v", got, err)
		}
		entries, err := s.GetHackathons()
		if err != nil || len(entries) != 2 || entries[0].Date != "2024" {
			t.Fatalf("hackathon order: %v %v", entries, err)
		}
	}
}
