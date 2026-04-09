package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// DraftRequest represents the input for AI blog draft generation.
type DraftRequest struct {
	Title     string   `json:"title"`
	Category  string   `json:"category"` // hackathon, technical, research
	RoughIdea string   `json:"roughIdea"`
	MediaURLs []string `json:"mediaUrls,omitempty"` // URLs to images/videos already uploaded
}

// DraftResponse represents the AI-generated blog draft output.
type DraftResponse struct {
	Content string `json:"content"` // generated HTML
	Preview string `json:"preview"` // short summary for blog list
	Slug    string `json:"slug"`    // suggested URL slug
}

const blogSystemPrompt = `You are a writing assistant for Yongkang ZOU's technical blog on his portfolio site.
Your job is to expand his rough draft ideas into polished blog posts while preserving his authentic voice.

RULES:
- Make MINIMAL changes to his original words — enhance structure and flow, don't rewrite his voice
- Write like a developer talking to developers, not a content marketer
- Short paragraphs. Vary sentence length. No filler.
- NEVER use em dashes (—). Use commas, periods, or restructure the sentence.
- NEVER use these words/phrases: "delve", "landscape", "tapestry", "paradigm", "synergy", "seamless", "robust", "innovative", "leverage", "game-changer", "deep dive", "it's worth noting", "at the end of the day", "in today's world", "without further ado"
- NEVER use: "What surprised me most", "Here's the thing", "Let's break this down", "In this article we'll explore", "buckle up", "let's dive in"
- NO bold abuse. ONE bold phrase per section maximum.
- NO formulaic headers like "Overview", "Key Points", "Summary", "Conclusion"
- NO emotional claims without evidence ("I was fascinated to discover")
- Code blocks should be real, runnable examples when relevant
- Technical accuracy > writing style. Never sacrifice correctness for flair.
- If media URLs are provided, embed them directly in the HTML output as <img> or <video> tags at the most relevant positions in the post. Use: <img src="URL" alt="brief description" style="max-width:100%;border-radius:6px;margin:1rem 0" /> for images and <video src="URL" controls style="max-width:100%;border-radius:6px;margin:1rem 0"></video> for videos. Place them where they best illustrate the surrounding text. Use ALL provided media — don't skip any.

CATEGORIES:
- hackathon: Competition stories. What was built, how, what went wrong, what was learned. Include timeline, team dynamics, technical decisions.
- technical: Engineering deep-dives. Real problems, real solutions. Code examples. System design thinking. Book notes.
- research: Paper summaries, tech trend analysis. What's changing, why it matters, your take on it.

TONE: Direct, curious, slightly informal. Like explaining to a smart friend over coffee. Think Paul Graham meets a hackathon dev log.

FORMAT: Return the blog post content as clean HTML suitable for rendering. Use <h2>, <h3>, <p>, <pre><code>, <ul>, <li>, <blockquote> tags. No <h1> (the title is separate). Keep it clean and semantic.

Also return a short preview (1-2 sentences, plain text) and a suggested URL slug.

Respond in this exact JSON format:
{
  "content": "<h2>...</h2><p>...</p>...",
  "preview": "One or two sentence summary",
  "slug": "suggested-url-slug"
}`

// HandleGenerateDraft calls the Gemini API to generate a blog draft from a rough idea.
func (h *APIHandler) HandleGenerateDraft(geminiKey string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if geminiKey == "" {
			writeError(w, http.StatusServiceUnavailable, "AI drafting not configured")
			return
		}

		var req DraftRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		if strings.TrimSpace(req.RoughIdea) == "" && len(req.MediaURLs) == 0 {
			writeError(w, http.StatusBadRequest, "roughIdea or mediaUrls required")
			return
		}

		// Build the user prompt
		userPrompt := fmt.Sprintf("Category: %s\nTitle: %s\n\nRough idea:\n%s", req.Category, req.Title, req.RoughIdea)
		if len(req.MediaURLs) > 0 {
			userPrompt += "\n\nMedia files attached (use these exact URLs in <img>/<video> tags, placed where they best fit the content):"
			for i, url := range req.MediaURLs {
				label := "image"
				if strings.Contains(url, ".mp4") || strings.Contains(url, ".webm") || strings.Contains(url, ".mov") || strings.Contains(url, "video") {
					label = "video"
				}
				userPrompt += fmt.Sprintf("\n%d. [%s] %s", i+1, label, url)
			}
		}

		// Build Gemini API request
		parts := []map[string]interface{}{
			{"text": userPrompt},
		}

		// Add image/video parts if URLs provided
		for _, url := range req.MediaURLs {
			if strings.Contains(url, ".mp4") || strings.Contains(url, "video") {
				parts = append(parts, map[string]interface{}{
					"fileData": map[string]string{
						"mimeType": "video/mp4",
						"fileUri":  url,
					},
				})
			} else {
				parts = append(parts, map[string]interface{}{
					"fileData": map[string]string{
						"mimeType": "image/jpeg",
						"fileUri":  url,
					},
				})
			}
		}

		geminiBody := map[string]interface{}{
			"system_instruction": map[string]interface{}{
				"parts": []map[string]string{
					{"text": blogSystemPrompt},
				},
			},
			"contents": []map[string]interface{}{
				{
					"parts": parts,
				},
			},
			"generationConfig": map[string]interface{}{
				"temperature":      0.7,
				"topP":             0.9,
				"maxOutputTokens":  4096,
				"responseMimeType": "application/json",
				"responseJsonSchema": map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"content": map[string]interface{}{"type": "string", "description": "Blog post HTML content"},
						"preview": map[string]interface{}{"type": "string", "description": "Short 1-2 sentence summary"},
						"slug":    map[string]interface{}{"type": "string", "description": "URL-friendly slug"},
					},
					"required": []string{"content", "preview", "slug"},
				},
			},
		}

		bodyBytes, err := json.Marshal(geminiBody)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to build AI request")
			return
		}

		// Call Gemini API
		apiURL := "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent"

		client := &http.Client{Timeout: 120 * time.Second}
		req2, err := http.NewRequest(http.MethodPost, apiURL, bytes.NewReader(bodyBytes))
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to build AI request")
			return
		}
		req2.Header.Set("Content-Type", "application/json")
		req2.Header.Set("x-goog-api-key", geminiKey)

		resp, err := client.Do(req2)
		if err != nil {
			writeError(w, http.StatusBadGateway, fmt.Sprintf("AI service error: %v", err))
			return
		}
		defer resp.Body.Close()

		respBody, err := io.ReadAll(resp.Body)
		if err != nil {
			writeError(w, http.StatusBadGateway, "failed to read AI response")
			return
		}

		if resp.StatusCode != http.StatusOK {
			truncated := string(respBody)
			if len(truncated) > 200 {
				truncated = truncated[:200]
			}
			writeError(w, http.StatusBadGateway, fmt.Sprintf("AI service returned %d: %s", resp.StatusCode, truncated))
			return
		}

		// Parse Gemini response
		var geminiResp struct {
			Candidates []struct {
				Content struct {
					Parts []struct {
						Text string `json:"text"`
					} `json:"parts"`
				} `json:"content"`
			} `json:"candidates"`
		}
		if err := json.Unmarshal(respBody, &geminiResp); err != nil {
			writeError(w, http.StatusBadGateway, "failed to parse AI response")
			return
		}

		if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
			writeError(w, http.StatusBadGateway, "AI returned empty response")
			return
		}

		// Extract the text and parse as DraftResponse JSON
		text := geminiResp.Candidates[0].Content.Parts[0].Text

		var draft DraftResponse
		if err := json.Unmarshal([]byte(text), &draft); err != nil {
			// If not valid JSON, use the raw text as content
			previewEnd := len(text)
			if previewEnd > 150 {
				previewEnd = 150
			}
			draft = DraftResponse{
				Content: text,
				Preview: text[:previewEnd],
				Slug:    strings.ToLower(strings.ReplaceAll(req.Title, " ", "-")),
			}
		}

		writeJSON(w, http.StatusOK, draft)
	}
}
