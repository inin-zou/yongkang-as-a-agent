package repository

import (
	"bytes"
	"errors"
	"log"
	"strings"
	"testing"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/model"
)

type fallbackDataFake struct {
	DataRepository
	projects []model.Project
	music    *model.Music
	project  *model.Project
	err      error
	calls    int
}

func (f *fallbackDataFake) GetProjects() ([]model.Project, error) {
	f.calls++
	return f.projects, f.err
}
func (f *fallbackDataFake) GetProjectBySlug(string) (*model.Project, error) {
	f.calls++
	return f.project, f.err
}
func (f *fallbackDataFake) GetMusic() (*model.Music, error) { f.calls++; return f.music, f.err }

func TestFallbackSelectionAndLogging(t *testing.T) {
	for _, tc := range []struct {
		name     string
		primary  *fallbackDataFake
		fallback bool
		logs     int
	}{
		{"missing primary", nil, true, 0},
		{"nil slice", &fallbackDataFake{}, true, 0},
		{"empty slice", &fallbackDataFake{projects: []model.Project{}}, true, 0},
		{"primary data", &fallbackDataFake{projects: []model.Project{{Slug: "primary"}}}, false, 0},
		{"primary error", &fallbackDataFake{err: errors.New("secret connection details")}, true, 1},
		{"unsupported read is silent", &fallbackDataFake{err: ErrNotSupported}, true, 0},
		{"data plus error", &fallbackDataFake{projects: []model.Project{{Slug: "partial"}}, err: errors.New("secret")}, true, 1},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var logs bytes.Buffer
			oldWriter := log.Writer()
			log.SetOutput(&logs)
			defer log.SetOutput(oldWriter)
			fallback := &fallbackDataFake{projects: []model.Project{{Slug: "fallback"}}}
			var primary DataRepository
			if tc.primary != nil {
				primary = tc.primary
			}
			got, err := WithFallback(primary, fallback).GetProjects()
			if err != nil || len(got) != 1 {
				t.Fatalf("got %v, %v", got, err)
			}
			want := "primary"
			if tc.fallback {
				want = "fallback"
			}
			if got[0].Slug != want {
				t.Fatalf("got %s want %s", got[0].Slug, want)
			}
			if (fallback.calls == 1) != tc.fallback {
				t.Fatalf("fallback calls %d", fallback.calls)
			}
			if strings.Count(logs.String(), "GetProjects") != tc.logs || strings.Contains(logs.String(), "secret") {
				t.Fatalf("unsafe or unexpected log: %q", logs.String())
			}
		})
	}
}

func TestFallbackItemsAndErrors(t *testing.T) {
	fallbackErr := errors.New("fallback failed")
	for _, tc := range []struct {
		name    string
		primary *model.Project
		err     error
		want    string
	}{
		{"nil", nil, nil, "fallback"},
		{"present", &model.Project{Slug: "primary"}, nil, "primary"},
		{"error with item", &model.Project{Slug: "partial"}, errors.New("failed"), "fallback"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			f := &fallbackDataFake{project: &model.Project{Slug: "fallback"}}
			got, err := WithFallback(&fallbackDataFake{project: tc.primary, err: tc.err}, f).GetProjectBySlug("slug")
			if err != nil || got.Slug != tc.want {
				t.Fatalf("got %v %v", got, err)
			}
		})
	}
	f := &fallbackDataFake{err: fallbackErr}
	if _, err := WithFallback(nil, f).GetProjects(); err != fallbackErr {
		t.Fatalf("lost fallback error: %v", err)
	}
	music := &model.Music{}
	got, err := WithFallback(&fallbackDataFake{}, &fallbackDataFake{music: music}).GetMusic()
	if err != nil || got != music {
		t.Fatalf("nil music fallback: %v %v", got, err)
	}
}
