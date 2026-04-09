package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
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
- If media URLs are provided, embed them in the HTML using these patterns. Use ALL provided media — don't skip any.

MEDIA LAYOUT PATTERNS (choose the best fit for each image):
1. Standard image with caption (default): <figure><img src="URL" alt="brief description" style="max-width:100%;border-radius:6px" /><figcaption>Caption describing what the image shows</figcaption></figure>
2. Side-by-side pair (for comparisons, before/after, or related screenshots): <div class="img-pair"><figure><img src="URL1" alt="desc" /><figcaption>Left caption</figcaption></figure><figure><img src="URL2" alt="desc" /><figcaption>Right caption</figcaption></figure></div>
3. Video: <figure><video src="URL" controls style="max-width:100%;border-radius:6px"></video><figcaption>Video caption</figcaption></figure>
- Always use <figure> with <figcaption> for images and videos. The caption should describe what the reader is seeing, not repeat the alt text verbatim.
- Use side-by-side pairs when two images are related (e.g. two views of the same thing, comparison screenshots, before/after).
- Place media where it best illustrates the surrounding text, not clustered together.

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

// RefineRequest represents the input for AI blog draft refinement.
type RefineRequest struct {
	Title           string   `json:"title"`
	Category        string   `json:"category"`
	ExistingContent string   `json:"existingContent"` // HTML content from Supabase
	MediaURLs       []string `json:"mediaUrls,omitempty"`
}

const refineSystemPrompt = `You are a writing assistant for Yongkang ZOU's technical blog on his portfolio site.
Your job is to refine an existing blog post, NOT write from scratch.

RULES:
- Keep the author's content mostly intact — don't rewrite their voice
- Make only reasonable, reader-friendly improvements to structure and flow
- Your main job: look at the provided media files and place them at contextually relevant positions using the patterns below
- Use ALL provided media — don't skip any
- Return clean HTML suitable for rendering. Use <h2>, <h3>, <p>, <pre><code>, <ul>, <li>, <blockquote> tags. No <h1> (the title is separate).

MEDIA LAYOUT PATTERNS (choose the best fit for each image):
1. Standard image with caption (default): <figure><img src="URL" alt="brief description" style="max-width:100%;border-radius:6px" /><figcaption>Caption describing what the image shows</figcaption></figure>
2. Side-by-side pair (for comparisons, before/after, or related screenshots): <div class="img-pair"><figure><img src="URL1" alt="desc" /><figcaption>Left caption</figcaption></figure><figure><img src="URL2" alt="desc" /><figcaption>Right caption</figcaption></figure></div>
3. Video: <figure><video src="URL" controls style="max-width:100%;border-radius:6px"></video><figcaption>Video caption</figcaption></figure>
- Always use <figure> with <figcaption>. The caption should describe what the reader is seeing.
- Use side-by-side pairs when two images are related (e.g. two views of the same thing, comparison screenshots).
- Place media where it best illustrates the surrounding text, not clustered together.
- NEVER use em dashes (—). Use commas, periods, or restructure the sentence.
- NEVER use these words/phrases: "delve", "landscape", "tapestry", "paradigm", "synergy", "seamless", "robust", "innovative", "leverage", "game-changer", "deep dive", "it's worth noting", "at the end of the day", "in today's world", "without further ado"
- NEVER use: "What surprised me most", "Here's the thing", "Let's break this down", "In this article we'll explore", "buckle up", "let's dive in"
- NO bold abuse. ONE bold phrase per section maximum.
- NO formulaic headers like "Overview", "Key Points", "Summary", "Conclusion"

Also return a short preview (1-2 sentences, plain text) and a suggested URL slug. Keep the preview and slug from the original unless they clearly need improvement.

Respond in this exact JSON format:
{
  "content": "<h2>...</h2><p>...</p>...",
  "preview": "One or two sentence summary",
  "slug": "suggested-url-slug"
}`

// geminiUploadedFile holds the result of uploading a file to the Gemini File API.
type geminiUploadedFile struct {
	URI      string
	MIMEType string
}

// uploadToGeminiFileAPI uploads media bytes to the Gemini File API using the resumable upload protocol.
// Returns the file URI that can be used in fileData parts.
func uploadToGeminiFileAPI(apiKey string, mediaBytes []byte, mimeType string, displayName string) (*geminiUploadedFile, error) {
	client := &http.Client{Timeout: 60 * time.Second}

	// Step 1: Start resumable upload — get the upload URL
	startURL := "https://generativelanguage.googleapis.com/upload/v1beta/files"
	metaBody, _ := json.Marshal(map[string]interface{}{
		"file": map[string]string{"display_name": displayName},
	})
	startReq, err := http.NewRequest(http.MethodPost, startURL, bytes.NewReader(metaBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create start request: %w", err)
	}
	startReq.Header.Set("x-goog-api-key", apiKey)
	startReq.Header.Set("Content-Type", "application/json")
	startReq.Header.Set("X-Goog-Upload-Protocol", "resumable")
	startReq.Header.Set("X-Goog-Upload-Command", "start")
	startReq.Header.Set("X-Goog-Upload-Header-Content-Length", strconv.Itoa(len(mediaBytes)))
	startReq.Header.Set("X-Goog-Upload-Header-Content-Type", mimeType)

	startResp, err := client.Do(startReq)
	if err != nil {
		return nil, fmt.Errorf("start upload failed: %w", err)
	}
	defer startResp.Body.Close()

	uploadURL := startResp.Header.Get("X-Goog-Upload-Url")
	if uploadURL == "" {
		body, _ := io.ReadAll(startResp.Body)
		return nil, fmt.Errorf("no upload URL in response (status %d): %s", startResp.StatusCode, string(body))
	}

	// Step 2: Upload the actual bytes
	uploadReq, err := http.NewRequest(http.MethodPost, uploadURL, bytes.NewReader(mediaBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create upload request: %w", err)
	}
	uploadReq.Header.Set("x-goog-api-key", apiKey)
	uploadReq.Header.Set("Content-Length", strconv.Itoa(len(mediaBytes)))
	uploadReq.Header.Set("X-Goog-Upload-Offset", "0")
	uploadReq.Header.Set("X-Goog-Upload-Command", "upload, finalize")

	uploadResp, err := client.Do(uploadReq)
	if err != nil {
		return nil, fmt.Errorf("upload failed: %w", err)
	}
	defer uploadResp.Body.Close()

	uploadBody, err := io.ReadAll(uploadResp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read upload response: %w", err)
	}

	if uploadResp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("upload returned %d: %s", uploadResp.StatusCode, string(uploadBody))
	}

	// Parse the file info to get the URI
	var fileInfo struct {
		File struct {
			URI      string `json:"uri"`
			MIMEType string `json:"mimeType"`
		} `json:"file"`
	}
	if err := json.Unmarshal(uploadBody, &fileInfo); err != nil {
		return nil, fmt.Errorf("failed to parse file info: %w", err)
	}

	return &geminiUploadedFile{
		URI:      fileInfo.File.URI,
		MIMEType: fileInfo.File.MIMEType,
	}, nil
}

// geminiSupportedMIME returns true if Gemini can analyze this media type.
// Images: PNG, JPEG, WEBP, HEIC, HEIF. Videos: MP4, MPEG, MOV, AVI, FLV, MPG, WebM, WMV, 3GPP.
// Unsupported (e.g. GIF, SVG, BMP): upload to Supabase only, user places manually.
func geminiSupportedMIME(mimeType string) bool {
	supported := map[string]bool{
		"image/png": true, "image/jpeg": true, "image/webp": true,
		"image/heic": true, "image/heif": true,
		"video/mp4": true, "video/mpeg": true, "video/quicktime": true,
		"video/x-msvideo": true, "video/x-flv": true, "video/mpg": true,
		"video/webm": true, "video/x-ms-wmv": true, "video/3gpp": true,
	}
	return supported[mimeType]
}

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

		// Build the user prompt (text-only context)
		userPrompt := fmt.Sprintf("Category: %s\nTitle: %s\n\nRough idea:\n%s", req.Category, req.Title, req.RoughIdea)
		if len(req.MediaURLs) > 0 {
			userPrompt += fmt.Sprintf("\n\n%d media file(s) are attached below. Each has a label with its URL — use that exact URL in the <img>/<video> tag. Look at each image/video to understand what it shows, then place it where it best illustrates the surrounding text.", len(req.MediaURLs))
		}

		// Build Gemini API request parts.
		// For each media: fetch from Supabase → upload to Gemini File API → get fileUri.
		// Interleave [text label with Supabase URL] [fileData with Gemini URI] so Gemini
		// can see the content AND knows which Supabase URL to use in the output HTML.
		parts := []map[string]interface{}{
			{"text": userPrompt},
		}

		fetchClient := &http.Client{Timeout: 30 * time.Second}
		for i, mediaURL := range req.MediaURLs {
			isVideo := strings.Contains(mediaURL, ".mp4") || strings.Contains(mediaURL, ".webm") || strings.Contains(mediaURL, ".mov") || strings.Contains(mediaURL, "video")
			mediaType := "image"
			if isVideo {
				mediaType = "video"
			}

			// Text label so Gemini knows which Supabase URL corresponds to the next file
			parts = append(parts, map[string]interface{}{
				"text": fmt.Sprintf("\n[Media %d - %s] Supabase URL to use in HTML: %s\nThe following is the actual %s content — look at it to understand what it shows:", i+1, mediaType, mediaURL, mediaType),
			})

			// Fetch the media from Supabase Storage
			mediaResp, err := fetchClient.Get(mediaURL)
			if err != nil {
				log.Printf("failed to fetch media %s: %v", mediaURL, err)
				parts = append(parts, map[string]interface{}{
					"text": fmt.Sprintf("(Could not load %s — still use the Supabase URL above in an <%s> tag)", mediaType, mediaType),
				})
				continue
			}
			mediaBytes, err := io.ReadAll(io.LimitReader(mediaResp.Body, 50<<20)) // 50MB max
			mediaResp.Body.Close()
			if err != nil {
				log.Printf("failed to read media %s: %v", mediaURL, err)
				continue
			}

			// Detect MIME type from Content-Type header, fall back to extension
			mimeType := mediaResp.Header.Get("Content-Type")
			if mimeType == "" || mimeType == "application/octet-stream" {
				switch {
				case strings.HasSuffix(mediaURL, ".png"):
					mimeType = "image/png"
				case strings.HasSuffix(mediaURL, ".gif"):
					mimeType = "image/gif"
				case strings.HasSuffix(mediaURL, ".webp"):
					mimeType = "image/webp"
				case strings.HasSuffix(mediaURL, ".mp4"):
					mimeType = "video/mp4"
				case strings.HasSuffix(mediaURL, ".webm"):
					mimeType = "video/webm"
				default:
					mimeType = "image/jpeg"
				}
			}

			// Skip Gemini upload for unsupported types (e.g. GIF) — user places manually
			if !geminiSupportedMIME(mimeType) {
				log.Printf("skipping Gemini upload for unsupported type %s (%s)", mimeType, mediaURL)
				parts = append(parts, map[string]interface{}{
					"text": fmt.Sprintf("(This %s file cannot be analyzed — still use the Supabase URL above in an <%s> tag, placed where it seems relevant based on context)", mimeType, mediaType),
				})
				continue
			}

			// Upload to Gemini File API to get a fileUri
			displayName := fmt.Sprintf("blog-media-%d", i+1)
			uploaded, err := uploadToGeminiFileAPI(geminiKey, mediaBytes, mimeType, displayName)
			if err != nil {
				log.Printf("failed to upload to Gemini File API %s: %v", mediaURL, err)
				parts = append(parts, map[string]interface{}{
					"text": fmt.Sprintf("(Upload failed — still use the Supabase URL above in an <%s> tag)", mediaType),
				})
				continue
			}

			parts = append(parts, map[string]interface{}{
				"fileData": map[string]string{
					"mimeType": uploaded.MIMEType,
					"fileUri":  uploaded.URI,
				},
			})
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

// HandleRefineDraft calls the Gemini API to refine an existing blog post, optionally placing media.
func (h *APIHandler) HandleRefineDraft(geminiKey string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if geminiKey == "" {
			writeError(w, http.StatusServiceUnavailable, "AI drafting not configured")
			return
		}

		var req RefineRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		if strings.TrimSpace(req.ExistingContent) == "" {
			writeError(w, http.StatusBadRequest, "existingContent is required")
			return
		}

		// Build the user prompt
		userPrompt := fmt.Sprintf("Category: %s\nTitle: %s\n\nExisting post content to refine:\n%s", req.Category, req.Title, req.ExistingContent)

		// Deduplicate media URLs
		var dedupedURLs []string
		if len(req.MediaURLs) > 0 {
			seen := make(map[string]bool, len(req.MediaURLs))
			for _, u := range req.MediaURLs {
				if !seen[u] {
					seen[u] = true
					dedupedURLs = append(dedupedURLs, u)
				}
			}
			userPrompt += fmt.Sprintf("\n\n%d media file(s) are attached below. Each has a label with its URL — use that exact URL in the <img>/<video> tag. Look at each image/video to understand what it shows, then place it where it best illustrates the surrounding text.", len(dedupedURLs))
		}

		// Build Gemini API request parts
		parts := []map[string]interface{}{
			{"text": userPrompt},
		}

		fetchClient := &http.Client{Timeout: 30 * time.Second}
		for i, mediaURL := range dedupedURLs {
			isVideo := strings.Contains(mediaURL, ".mp4") || strings.Contains(mediaURL, ".webm") || strings.Contains(mediaURL, ".mov") || strings.Contains(mediaURL, "video")
			mediaType := "image"
			if isVideo {
				mediaType = "video"
			}

			// Text label so Gemini knows which Supabase URL corresponds to the next file
			parts = append(parts, map[string]interface{}{
				"text": fmt.Sprintf("\n[Media %d - %s] Supabase URL to use in HTML: %s\nThe following is the actual %s content — look at it to understand what it shows:", i+1, mediaType, mediaURL, mediaType),
			})

			// Fetch the media from Supabase Storage
			mediaResp, err := fetchClient.Get(mediaURL)
			if err != nil {
				log.Printf("failed to fetch media %s: %v", mediaURL, err)
				parts = append(parts, map[string]interface{}{
					"text": fmt.Sprintf("(Could not load %s — still use the Supabase URL above in an <%s> tag)", mediaType, mediaType),
				})
				continue
			}
			if mediaResp.StatusCode != http.StatusOK {
				mediaResp.Body.Close()
				log.Printf("media fetch returned HTTP %d for %s", mediaResp.StatusCode, mediaURL)
				parts = append(parts, map[string]interface{}{
					"text": fmt.Sprintf("(Could not load %s (HTTP %d) — still use the Supabase URL above in an <%s> tag)", mediaType, mediaResp.StatusCode, mediaType),
				})
				continue
			}
			mediaBytes, err := io.ReadAll(io.LimitReader(mediaResp.Body, 50<<20)) // 50MB max
			mediaResp.Body.Close()
			if err != nil {
				log.Printf("failed to read media %s: %v", mediaURL, err)
				continue
			}

			// Detect MIME type from Content-Type header, fall back to extension
			mimeType := mediaResp.Header.Get("Content-Type")
			if mimeType == "" || mimeType == "application/octet-stream" {
				switch {
				case strings.HasSuffix(mediaURL, ".png"):
					mimeType = "image/png"
				case strings.HasSuffix(mediaURL, ".gif"):
					mimeType = "image/gif"
				case strings.HasSuffix(mediaURL, ".webp"):
					mimeType = "image/webp"
				case strings.HasSuffix(mediaURL, ".mp4"):
					mimeType = "video/mp4"
				case strings.HasSuffix(mediaURL, ".webm"):
					mimeType = "video/webm"
				default:
					mimeType = "image/jpeg"
				}
			}

			// Skip Gemini upload for unsupported types (e.g. GIF) — user places manually
			if !geminiSupportedMIME(mimeType) {
				log.Printf("skipping Gemini upload for unsupported type %s (%s)", mimeType, mediaURL)
				parts = append(parts, map[string]interface{}{
					"text": fmt.Sprintf("(This %s file cannot be analyzed — still use the Supabase URL above in an <%s> tag, placed where it seems relevant based on context)", mimeType, mediaType),
				})
				continue
			}

			// Upload to Gemini File API to get a fileUri
			displayName := fmt.Sprintf("blog-media-%d", i+1)
			uploaded, err := uploadToGeminiFileAPI(geminiKey, mediaBytes, mimeType, displayName)
			if err != nil {
				log.Printf("failed to upload to Gemini File API %s: %v", mediaURL, err)
				parts = append(parts, map[string]interface{}{
					"text": fmt.Sprintf("(Upload failed — still use the Supabase URL above in an <%s> tag)", mediaType),
				})
				continue
			}

			parts = append(parts, map[string]interface{}{
				"fileData": map[string]string{
					"mimeType": uploaded.MIMEType,
					"fileUri":  uploaded.URI,
				},
			})
		}

		geminiBody := map[string]interface{}{
			"system_instruction": map[string]interface{}{
				"parts": []map[string]string{
					{"text": refineSystemPrompt},
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
						"content": map[string]interface{}{"type": "string", "description": "Refined blog post HTML content"},
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
