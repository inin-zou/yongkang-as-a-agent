import PostMetadataFields from './PostMetadataFields'
import { formatTags, parseTags } from '../../lib/postTags'
import { queryKeys } from '../../lib/queryKeys'
import { useState, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../lib/auth'
import { useBlogMediaUpload } from '../../hooks/useBlogMediaUpload'
import MediaUploadBar from './MediaUploadBar'
import { createBlogPost, updateBlogPost, generateDraft, refineDraft } from '../../lib/api'
import type { BlogPost } from '../../types/index'
import type { DraftResponse } from '../../lib/api'
import { htmlToMarkdown, markdownToHtml } from '../../lib/markdown'

/* ─── Draft Creator (AI-assisted blog draft) ─── */

export default function DraftCreator({ onDone, initial }: { onDone: () => void; initial?: BlogPost }) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const token = session?.access_token ?? ''

  // Step 1: Input rough idea
  const [title, setTitle] = useState(initial?.title ?? '')
  const [tags, setTags] = useState(formatTags(initial?.tags))
  const [result, setResult] = useState(initial?.result ?? '')
  const [category, setCategory] = useState(initial?.category ?? 'technical')
  const [publishedAt, setPublishedAt] = useState(initial?.publishedAt?.split('T')[0] ?? '')
  const [roughIdea, setRoughIdea] = useState(initial ? '' : '')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')

  // Media uploads (shared hook)
  const { mediaUrls, uploading, status: uploadStatus, error: uploadError, handleUpload, removeUrl } = useBlogMediaUpload()
  const editorTextareaRef = useRef<HTMLTextAreaElement>(null)
  const prevUrlCountRef = useRef(mediaUrls.length)

  // When a new URL is added in editor mode, insert media tag at cursor
  useEffect(() => {
    const prevCount = prevUrlCountRef.current
    prevUrlCountRef.current = mediaUrls.length
    if (mediaUrls.length > prevCount && draft && editorTextareaRef.current) {
      const newUrl = mediaUrls[mediaUrls.length - 1]
      const ta = editorTextareaRef.current
      const pos = ta.selectionStart ?? editContent.length
      const isVideo = newUrl.match(/\.(mp4|webm|mov)/i)
      const tag = isVideo
        ? `\n<video src="${newUrl}" controls style="max-width:100%;border-radius:6px;margin:8px 0"></video>\n`
        : `\n<img src="${newUrl}" alt="media" style="max-width:100%;border-radius:6px;margin:8px 0" />\n`
      const newContent = editContent.slice(0, pos) + tag + editContent.slice(pos)
      setEditContent(newContent)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaUrls.length])

  // Step 2: Review/edit generated draft
  const [draft, setDraft] = useState<DraftResponse | null>(
    initial ? { content: initial.content, preview: initial.preview, slug: initial.slug } : null
  )
  const [editContent, setEditContent] = useState(() =>
    initial?.content ? htmlToMarkdown(initial.content) : ''
  )
  const [editPreview, setEditPreview] = useState(initial?.preview ?? '')
  const [editSlug, setEditSlug] = useState(initial?.slug ?? '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [refining, setRefining] = useState(false)

  async function handleRefine() {
    if (!editContent.trim() && mediaUrls.length === 0) return
    setRefining(true)
    setSaveError('')
    try {
      const result = await refineDraft(token, {
        title,
        category,
        existingContent: editContent,
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
      })
      setEditContent(result.content)
      if (result.preview) setEditPreview(result.preview)
      if (result.slug) setEditSlug(result.slug)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Refine failed')
    }
    setRefining(false)
  }

  async function handleGenerate() {
    if (!title.trim() && !roughIdea.trim()) return
    setGenerating(true)
    setGenError('')
    try {
      const result = await generateDraft(token, { title, category, roughIdea, mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined })
      const cleanSlug = (result.slug || title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      setDraft(result)
      setEditContent(htmlToMarkdown(result.content))
      setEditPreview(result.preview)
      setEditSlug(cleanSlug)
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : 'Generation failed')
    }
    setGenerating(false)
  }

  function handleSkipAI() {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    setDraft({ content: roughIdea, preview: '', slug })
    setEditContent(roughIdea)
    setEditPreview('')
    setEditSlug(slug)
  }

  async function handlePublish() {
    setSaving(true)
    setSaveError('')
    const safeSlug = editSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    try {
      const htmlContent = markdownToHtml(editContent)
      if (initial?.id) {
        await updateBlogPost(token, initial.id, {
          slug: safeSlug,
          title,
          content: htmlContent,
          preview: editPreview,
          category,
          tags: parseTags(tags),
          result,
        })
      } else {
        await createBlogPost(token, {
          slug: safeSlug,
          title,
          content: htmlContent,
          preview: editPreview,
          category,
          tags: parseTags(tags),
          result,
          publishedAt: publishedAt || undefined,
        })
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPosts() })
      queryClient.invalidateQueries({ queryKey: queryKeys.posts() })
      onDone()
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
      setSaving(false)
    }
  }

  // Draft editing mode (step 2)
  if (draft) {
    return (
      <div className="admin-editor">
        {saveError && <div className="admin-error">{saveError}</div>}
        {uploadError && <div className="admin-error">{uploadError}</div>}

        <div>
          <label htmlFor="draft-slug" className="memory-feedback-label">Slug</label>
          <input
            id="draft-slug"
            type="text"
            className="memory-feedback-input"
            placeholder="my-post-slug"
            value={editSlug}
            onChange={(e) => setEditSlug(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="draft-title" className="memory-feedback-label">Title</label>
          <input
            id="draft-title"
            type="text"
            className="memory-feedback-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="draft-preview" className="memory-feedback-label">Preview</label>
          <input
            id="draft-preview"
            type="text"
            className="memory-feedback-input"
            placeholder="Short preview text..."
            value={editPreview}
            onChange={(e) => setEditPreview(e.target.value)}
          />
        </div>

        <PostMetadataFields
          idPrefix="draft"
          category={category} tags={tags} result={result}
          onCategoryChange={setCategory} onTagsChange={setTags} onResultChange={setResult}
        />

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label className="memory-feedback-label" style={{ margin: 0 }}>Content (Markdown) + Preview</label>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <MediaUploadBar
                mediaUrls={mediaUrls}
                uploading={uploading}
                status={uploadStatus}
                onUpload={handleUpload}
                onRemove={removeUrl}
                compact
              />
              <button
                type="button"
                className="admin-bar-btn admin-bar-btn-save"
                disabled={refining || (!editContent.trim() && mediaUrls.length === 0)}
                onClick={handleRefine}
              >
                {refining ? 'REFINING...' : 'REFINE WITH AI'}
              </button>
            </div>
          </div>
          <div className="admin-draft-split">
            <textarea
              ref={editorTextareaRef}
              className="memory-feedback-input admin-textarea-lg"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={20}
              placeholder={"## Section title\n\nWrite in markdown... **bold**, [links](url)\n\nUse 📷 ADD MEDIA to insert images/videos."}
            />
            <div
              className="admin-draft-preview blog-post-content"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(editContent) }}
            />
          </div>
        </div>

        <div className="admin-actions">
          <button
            type="button"
            className="admin-btn admin-bar-btn-save"
            disabled={saving || !editSlug.trim() || !title.trim()}
            onClick={handlePublish}
          >
            {saving ? 'SAVING...' : initial ? 'UPDATE' : 'PUBLISH'}
          </button>
          <button
            type="button"
            className="admin-btn"
            onClick={() => {
              setDraft(null)
              setEditContent('')
              setEditPreview('')
              setEditSlug('')
            }}
            disabled={saving}
          >
            BACK
          </button>
          <button type="button" className="admin-btn" onClick={onDone} disabled={saving}>
            CANCEL
          </button>
        </div>
      </div>
    )
  }

  // Rough idea input mode (step 1)
  return (
    <div className="admin-editor">
      {genError && <div className="admin-error">{genError}</div>}
      {uploadError && <div className="admin-error">{uploadError}</div>}

      <div>
        <label htmlFor="idea-title" className="memory-feedback-label">Title</label>
        <input
          id="idea-title"
          type="text"
          className="memory-feedback-input"
          placeholder="Post title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <PostMetadataFields
        idPrefix="idea"
        category={category} tags={tags} result={result}
        onCategoryChange={setCategory} onTagsChange={setTags} onResultChange={setResult}
      />

      <div>
        <label htmlFor="idea-published" className="memory-feedback-label">Published Date</label>
        <input
          id="idea-published"
          type="date"
          className="memory-feedback-input"
          value={publishedAt}
          onChange={(e) => setPublishedAt(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="idea-rough" className="memory-feedback-label">Rough Idea</label>
        <textarea
          id="idea-rough"
          className="memory-feedback-input admin-textarea-lg"
          placeholder="Write your rough draft, bullet points, or stream of consciousness here..."
          value={roughIdea}
          onChange={(e) => setRoughIdea(e.target.value)}
          rows={12}
        />
      </div>

      <div>
        <label className="memory-feedback-label">Attach Media (optional)</label>
        <MediaUploadBar
          mediaUrls={mediaUrls}
          uploading={uploading}
          status={uploadStatus}
          onUpload={handleUpload}
          onRemove={removeUrl}
        />
        {mediaUrls.length > 0 && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--color-ink-faint)', marginTop: '4px' }}>
            AI will analyze and place them
          </span>
        )}
      </div>

      {generating ? (
        <div className="admin-generating">
          <span className="admin-generating-dot" />
          <span className="admin-generating-dot" />
          <span className="admin-generating-dot" />
          <span>Generating draft with Gemini...</span>
        </div>
      ) : (
        <div className="admin-btn-row">
          <button
            type="button"
            className="admin-bar-btn admin-bar-btn-save"
            disabled={!title.trim() && !roughIdea.trim()}
            onClick={handleGenerate}
          >
            GENERATE WITH AI
          </button>
          <button
            type="button"
            className="admin-bar-btn admin-bar-btn-add"
            onClick={handleSkipAI}
          >
            SKIP AI
          </button>
          <button type="button" className="admin-bar-btn" onClick={onDone}>
            CANCEL
          </button>
        </div>
      )}
    </div>
  )
}
