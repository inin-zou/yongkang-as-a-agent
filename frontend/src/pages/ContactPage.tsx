import { queryKeys } from '../lib/queryKeys'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchPage, updatePage } from '../lib/api'
import { useAdminEdit } from '../hooks/useAdminEdit'
import AdminBar from '../components/admin/AdminBar'
import ContactForm from '../components/contact/ContactForm'

export default function ContactPage() {
  const { item } = useParams<{ item?: string }>()
  const { isAdmin, token } = useAdminEdit()
  const [isEditing, setIsEditing] = useState(false)
  const queryClient = useQueryClient()

  const { data: pageData } = useQuery({
    queryKey: queryKeys.page('contact'),
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
      queryClient.setQueryData(queryKeys.page('contact'), updated)
      setIsEditing(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

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
      <h1>Contact</h1>
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
            <ul className="document-contact-links">
              <li><a href={`mailto:${email}`}>{email}</a></li>
              <li><a href={github} target="_blank" rel="noopener noreferrer">GitHub ↗</a></li>
              <li><a href={linkedin} target="_blank" rel="noopener noreferrer">LinkedIn ↗</a></li>
              <li><a href={huggingface} target="_blank" rel="noopener noreferrer">Hugging Face ↗</a></li>
              <li><Link to="/files/skill/cv">CV ↗</Link></li>
            </ul>
            <section className="soul-section"><h2>Leave a message</h2><ContactForm /></section>
          </>
        )}
      </div>
    </div>
  )
}
