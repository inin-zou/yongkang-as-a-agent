package handler

import (
	"encoding/json"
	"testing"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/model"
)

func TestBlogPostArchiveRequest(t *testing.T) {
	for _, tc := range []struct {
		name string
		body string
		want *bool
	}{
		{"ordinary edit leaves archive unchanged", `{}`, nil},
		{"archive", `{"archived":true}`, boolPointer(true)},
		{"unarchive", `{"archived":false}`, boolPointer(false)},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var req blogPostRequest
			if err := json.Unmarshal([]byte(tc.body), &req); err != nil {
				t.Fatal(err)
			}
			if tc.want == nil {
				if req.Archived != nil {
					t.Fatal("omitted archive field must preserve existing state")
				}
			} else if req.Archived == nil || *req.Archived != *tc.want {
				t.Fatalf("archive field = %v, want %v", req.Archived, *tc.want)
			}
		})
	}
}

func TestBlogPostArchiveJSON(t *testing.T) {
	for _, body := range []string{`{"slug":"legacy"}`, `{"slug":"archived","archived":true}`} {
		var post model.BlogPost
		if err := json.Unmarshal([]byte(body), &post); err != nil {
			t.Fatal(err)
		}
		encoded, err := json.Marshal(post)
		if err != nil {
			t.Fatal(err)
		}
		var response map[string]any
		if err := json.Unmarshal(encoded, &response); err != nil {
			t.Fatal(err)
		}
		if response["archived"] != (post.Slug == "archived") {
			t.Fatalf("unexpected public archive flag: %s", encoded)
		}
	}
}

func boolPointer(value bool) *bool { return &value }
