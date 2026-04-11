import { useState, type FormEvent, type CSSProperties } from 'react'
import { submitContact } from '../../lib/api'

type FormStatus = 'idle' | 'sending' | 'success' | 'error'

const labelStyle: CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--color-ink-muted)',
  marginBottom: 6,
}

const inputStyle: CSSProperties = {
  border: '1px solid var(--color-ink-faint)',
  background: 'var(--color-surface-0)',
  color: 'var(--color-ink)',
  padding: 12,
  borderRadius: 'var(--radius-sm)',
  fontFamily: 'var(--font-sans)',
  fontSize: '0.9rem',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s ease',
}

const honeypotStyle: CSSProperties = {
  position: 'absolute',
  left: '-9999px',
  opacity: 0,
  height: 0,
  width: 0,
  overflow: 'hidden',
}

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
    website: '', // honeypot
  })
  const [status, setStatus] = useState<FormStatus>('idle')
  const [statusMessage, setStatusMessage] = useState('')

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    e.target.style.borderColor = 'var(--color-ink)'
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    e.target.style.borderColor = 'var(--color-ink-faint)'
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    // Honeypot check -- silently bail if filled
    if (formData.website) return

    setStatus('sending')
    setStatusMessage('')

    try {
      const res = await submitContact(formData)
      setStatus('success')
      setStatusMessage(res.message || 'Message sent successfully.')
      setFormData({ name: '', email: '', message: '', website: '' })
    } catch (err) {
      setStatus('error')
      setStatusMessage(
        err instanceof Error ? err.message : 'Something went wrong.',
      )
    }
  }

  const isSending = status === 'sending'

  return (
    <form
      onSubmit={handleSubmit}
      aria-describedby="contact-status"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}
    >
      {/* Name */}
      <div>
        <label htmlFor="contact-name" style={labelStyle}>
          Name
        </label>
        <input
          id="contact-name"
          name="name"
          type="text"
          required
          value={formData.name}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={inputStyle}
        />
      </div>

      {/* Email */}
      <div>
        <label htmlFor="contact-email" style={labelStyle}>
          Email
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          required
          value={formData.email}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={inputStyle}
        />
      </div>

      {/* Message */}
      <div>
        <label htmlFor="contact-message" style={labelStyle}>
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          value={formData.message}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {/* Honeypot -- hidden from humans, visible to bots */}
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={formData.website}
        onChange={handleChange}
        style={honeypotStyle}
        aria-hidden="true"
      />

      {/* Submit */}
      <button
        type="submit"
        disabled={isSending}
        data-interactive
        style={{
          padding: '1rem 2.5rem',
          background: 'var(--color-ink)',
          color: 'var(--color-void)',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.85rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          cursor: 'pointer',
          alignSelf: 'flex-start',
          opacity: isSending ? 0.6 : 1,
          transition: 'opacity 0.15s ease',
        }}
      >
        {isSending ? 'SENDING...' : 'SEND'}
      </button>

      {/* Status message */}
      <div id="contact-status" aria-live="polite">
        {status === 'success' && (
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              color: 'var(--color-win)',
              margin: 0,
            }}
          >
            {statusMessage}
          </p>
        )}
        {status === 'error' && (
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              color: 'var(--color-highlight)',
              margin: 0,
            }}
          >
            {statusMessage}
          </p>
        )}
      </div>
    </form>
  )
}
