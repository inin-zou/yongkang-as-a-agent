package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"time"
)

const githubUsername = "inin-zou"

// GitHubService fetches the contribution calendar and caches it for one hour.
type GitHubService struct {
	token    string
	client   *http.Client
	mu       sync.Mutex
	cache    []byte
	cachedAt time.Time
}

func NewGitHubService(token string) *GitHubService {
	return &GitHubService{token: token, client: &http.Client{Timeout: 10 * time.Second}}
}

func (s *GitHubService) Contributions() ([]byte, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.cache != nil && time.Since(s.cachedAt) < time.Hour {
		return s.cache, nil
	}
	githubToken := s.token
	if githubToken == "" {
		log.Printf("GITHUB_TOKEN is empty — check Vercel env vars")
		return nil, &ExternalError{StatusCode: http.StatusServiceUnavailable, Message: "GitHub token not configured"}
	}
	log.Printf("GitHub contributions: token present (%d chars), fetching from API", len(githubToken))

	query := `{"query":"{ user(login: \"` + githubUsername + `\") { contributionsCollection { contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } } } } }"}`

	client := s.client
	ghReq, err := http.NewRequest(http.MethodPost, "https://api.github.com/graphql", bytes.NewBufferString(query))
	if err != nil {
		return nil, &ExternalError{StatusCode: http.StatusInternalServerError, Message: "failed to build GitHub request"}
	}
	ghReq.Header.Set("Content-Type", "application/json")
	ghReq.Header.Set("Authorization", "Bearer "+githubToken)
	ghReq.Header.Set("User-Agent", "yongkang-portfolio")

	resp, err := client.Do(ghReq)
	if err != nil {
		log.Printf("GitHub API request failed: %v", err)
		return nil, &ExternalError{StatusCode: http.StatusBadGateway, Message: fmt.Sprintf("GitHub API error: %v", err)}
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, &ExternalError{StatusCode: http.StatusBadGateway, Message: "failed to read GitHub response"}
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("GitHub API returned %d: %s", resp.StatusCode, string(body[:min(len(body), 200)]))
		return nil, &ExternalError{StatusCode: http.StatusBadGateway, Message: fmt.Sprintf("GitHub API returned %d", resp.StatusCode)}
	}

	var ghResp struct {
		Data struct {
			User struct {
				ContributionsCollection struct {
					ContributionCalendar json.RawMessage `json:"contributionCalendar"`
				} `json:"contributionsCollection"`
			} `json:"user"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &ghResp); err != nil || ghResp.Data.User.ContributionsCollection.ContributionCalendar == nil {
		return nil, &ExternalError{StatusCode: http.StatusBadGateway, Message: "failed to parse GitHub response"}
	}

	// Update cache
	s.cache = ghResp.Data.User.ContributionsCollection.ContributionCalendar
	s.cachedAt = time.Now()

	return s.cache, nil
}
