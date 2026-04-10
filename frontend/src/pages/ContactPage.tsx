import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchPage, updatePage } from '../lib/api'
import { useAdminEdit } from '../hooks/useAdminEdit'
import AdminBar from '../components/admin/AdminBar'
import ContactForm from '../components/contact/ContactForm'
import AsciiTitle from '../components/global/AsciiTitle'

export default function ContactPage() {
  const { item } = useParams<{ item?: string }>()
  const { isAdmin, token } = useAdminEdit()
  const [isEditing, setIsEditing] = useState(false)
  const queryClient = useQueryClient()

  const { data: pageData } = useQuery({
    queryKey: ['pages', 'contact'],
    queryFn: () => fetchPage('contact'),
  })

  // Data with fallbacks
  const meta = (pageData?.meta as string) ?? 'Signal channels — always open'
  const email = (pageData?.email as string) ?? 'yongkang.zou.ai@gmail.com'
  const github = (pageData?.github as string) ?? 'https://github.com/inin-zou'
  const linkedin = (pageData?.linkedin as string) ?? 'https://www.linkedin.com/in/yongkang-zou'
  const huggingface = (pageData?.huggingface as string) ?? 'https://huggingface.co/YongkangZOU'

  // Edit form state
  const [editMeta, setEditMeta] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editGithub, setEditGithub] = useState('')
  const [editLinkedin, setEditLinkedin] = useState('')
  const [editHuggingface, setEditHuggingface] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggleEditing() {
    if (isEditing) {
      setIsEditing(false)
      setError('')
    } else {
      setEditMeta(meta)
      setEditEmail(email)
      setEditGithub(github)
      setEditLinkedin(linkedin)
      setEditHuggingface(huggingface)
      setIsEditing(true)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const updated = await updatePage(token, 'contact', {
        meta: editMeta,
        email: editEmail,
        github: editGithub,
        linkedin: editLinkedin,
        huggingface: editHuggingface,
      })
      queryClient.setQueryData(['pages', 'contact'], updated)
      setIsEditing(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  // Extract display names from URLs
  const githubDisplay = github.replace(/^https?:\/\/(www\.)?/, '')
  const linkedinDisplay = linkedin.replace(/^https?:\/\/(www\.)?/, '')
  const huggingfaceDisplay = huggingface.replace(/^https?:\/\/(www\.)?/, '')

  if (item === 'message') {
    return (
      <div className="editor-page">
        <div className="editor-meta">{meta}</div>
        <h1 className="editor-title">Leave a Message</h1>
        <div className="editor-content">
          <ContactForm />
        </div>
      </div>
    )
  }

  // Default: channels view
  return (
    <div className="editor-page">
      <div className="editor-meta">{meta}</div>
      <AsciiTitle name="contact" />
      <div className="editor-content">
        {isAdmin && (
          <AdminBar
            isEditing={isEditing}
            onToggleEdit={toggleEditing}
            onSave={handleSave}
            saving={saving}
          />
        )}

        {isEditing ? (
          <div className="admin-editor">
            {error && <div className="admin-error">{error}</div>}

            <div>
              <label htmlFor="contact-meta" className="memory-feedback-label">Meta text</label>
              <input
                id="contact-meta"
                type="text"
                className="memory-feedback-input"
                value={editMeta}
                onChange={(e) => setEditMeta(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="contact-email" className="memory-feedback-label">Email</label>
              <input
                id="contact-email"
                type="email"
                className="memory-feedback-input"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="contact-github" className="memory-feedback-label">GitHub URL</label>
              <input
                id="contact-github"
                type="url"
                className="memory-feedback-input"
                value={editGithub}
                onChange={(e) => setEditGithub(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="contact-linkedin" className="memory-feedback-label">LinkedIn URL</label>
              <input
                id="contact-linkedin"
                type="url"
                className="memory-feedback-input"
                value={editLinkedin}
                onChange={(e) => setEditLinkedin(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="contact-huggingface" className="memory-feedback-label">Hugging Face URL</label>
              <input
                id="contact-huggingface"
                type="url"
                className="memory-feedback-input"
                value={editHuggingface}
                onChange={(e) => setEditHuggingface(e.target.value)}
              />
            </div>

          </div>
        ) : (
          <>
            <p className="editor-label">Direct Channels</p>
            <ul className="editor-list">
              <li>
                <a href={`mailto:${email}`} data-interactive style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  {email}
                </a>
              </li>
              <li>
                <a href={github} target="_blank" rel="noopener noreferrer" data-interactive style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                  {githubDisplay}
                </a>
              </li>
              <li>
                <a href={linkedin} target="_blank" rel="noopener noreferrer" data-interactive style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  {linkedinDisplay}
                </a>
              </li>
              <li>
                <a href={huggingface} target="_blank" rel="noopener noreferrer" data-interactive style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 120 120" fill="currentColor"><path d="M60 0C26.9 0 0 26.9 0 60s26.9 60 60 60 60-26.9 60-60S93.1 0 60 0zm-9.8 80.5c-6.8 0-12.3-5.5-12.3-12.3 0-2.5.8-4.9 2.1-6.8-.3-1.3-.5-2.7-.5-4.1 0-9.6 7.8-17.4 17.4-17.4 3.2 0 6.2.9 8.8 2.4 2.6-1.5 5.6-2.4 8.8-2.4 9.6 0 17.4 7.8 17.4 17.4 0 1.4-.2 2.8-.5 4.1 1.3 1.9 2.1 4.3 2.1 6.8 0 6.8-5.5 12.3-12.3 12.3-3.3 0-6.3-1.3-8.5-3.5-2.2 2.2-5.2 3.5-8.5 3.5s-6.3-1.3-8.5-3.5c-2.2 2.2-5.2 3.5-8.5 3.5z"/></svg>
                  {huggingfaceDisplay}
                </a>
              </li>
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
