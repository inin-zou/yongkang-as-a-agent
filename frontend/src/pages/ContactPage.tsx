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
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.025 1.13c-5.77 0-10.449 4.647-10.449 10.378 0 1.112.178 2.181.503 3.185.064-.222.203-.444.416-.577a.96.96 0 0 1 .524-.15c.293 0 .584.124.84.284.278.173.48.408.71.694.226.282.458.611.684.951v-.014c.017-.324.106-.622.264-.874s.403-.487.762-.543c.3-.047.596.06.787.203s.31.313.4.467c.15.257.212.468.233.542.01.026.653 1.552 1.657 2.54.616.605 1.01 1.223 1.082 1.912.055.537-.096 1.059-.38 1.572.637.121 1.294.187 1.967.187.657 0 1.298-.063 1.921-.178-.287-.517-.44-1.041-.384-1.581.07-.69.465-1.307 1.081-1.913 1.004-.987 1.647-2.513 1.657-2.539.021-.074.083-.285.233-.542.09-.154.208-.323.4-.467a1.08 1.08 0 0 1 .787-.203c.359.056.604.29.762.543s.247.55.265.874v.015c.225-.34.457-.67.683-.952.23-.286.432-.52.71-.694.257-.16.547-.284.84-.285a.97.97 0 0 1 .524.151c.228.143.373.388.43.625l.006.04a10.3 10.3 0 0 0 .534-3.273c0-5.731-4.678-10.378-10.449-10.378M8.327 6.583a1.5 1.5 0 0 1 .713.174 1.487 1.487 0 0 1 .617 2.013c-.183.343-.762-.214-1.102-.094-.38.134-.532.914-.917.71a1.487 1.487 0 0 1 .69-2.803m7.486 0a1.487 1.487 0 0 1 .689 2.803c-.385.204-.536-.576-.916-.71-.34-.12-.92.437-1.103.094a1.487 1.487 0 0 1 .617-2.013 1.5 1.5 0 0 1 .713-.174m-10.68 1.55a.96.96 0 1 1 0 1.921.96.96 0 0 1 0-1.92m13.838 0a.96.96 0 1 1 0 1.92.96.96 0 0 1 0-1.92M8.489 11.458c.588.01 1.965 1.157 3.572 1.164 1.607-.007 2.984-1.155 3.572-1.164.196-.003.305.12.305.454 0 .886-.424 2.328-1.563 3.202-.22-.756-1.396-1.366-1.63-1.32q-.011.001-.02.006l-.044.026-.01.008-.03.024q-.018.017-.035.036l-.032.04a1 1 0 0 0-.058.09l-.014.025q-.049.088-.11.19a1 1 0 0 1-.083.116 1.2 1.2 0 0 1-.173.18q-.035.029-.075.058a1.3 1.3 0 0 1-.251-.243 1 1 0 0 1-.076-.107c-.124-.193-.177-.363-.337-.444-.034-.016-.104-.008-.2.022q-.094.03-.216.087-.06.028-.125.063l-.13.074q-.067.04-.136.086a3 3 0 0 0-.135.096 3 3 0 0 0-.26.219 2 2 0 0 0-.12.121 2 2 0 0 0-.106.128l-.002.002a2 2 0 0 0-.09.132l-.001.001a1.2 1.2 0 0 0-.105.212q-.013.036-.024.073c-1.139-.875-1.563-2.317-1.563-3.203 0-.334.109-.457.305-.454"/></svg>
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
