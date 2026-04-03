import { useState, type FormEvent } from 'react'
import { submitContact } from '../lib/api'

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '', website: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    // Honeypot check
    if (formData.website) return

    setStatus('sending')
    try {
      const res = await submitContact(formData)
      setStatus('success')
      setStatusMessage(res.message || 'Message sent successfully.')
      setFormData({ name: '', email: '', message: '', website: '' })
    } catch (err) {
      setStatus('error')
      setStatusMessage(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: '1px solid var(--color-ink-faint)',
    background: 'var(--color-surface-0)',
    color: 'var(--color-ink)',
    padding: 12,
    borderRadius: 'var(--radius-sm)',
    fontFamily: 'var(--font-sans)',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease',
  }

  return (
    <div style={{ padding: 'var(--space-lg)', maxWidth: '600px' }}>
      <h2
        style={{
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontSize: '0.85rem',
          color: 'var(--color-ink-muted)',
          marginBottom: 'var(--space-lg)',
        }}
      >
        Get in Touch
      </h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        <div>
          <label
            htmlFor="name"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: 'var(--color-ink-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'block',
              marginBottom: 6,
            }}
          >
            Name
          </label>
          <input
            id="name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            style={inputStyle}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-ink)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-ink-faint)')}
          />
        </div>

        <div>
          <label
            htmlFor="email"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: 'var(--color-ink-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'block',
              marginBottom: 6,
            }}
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            style={inputStyle}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-ink)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-ink-faint)')}
          />
        </div>

        <div>
          <label
            htmlFor="message"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: 'var(--color-ink-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'block',
              marginBottom: 6,
            }}
          >
            Message
          </label>
          <textarea
            id="message"
            required
            rows={5}
            value={formData.message}
            onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
            style={{ ...inputStyle, resize: 'vertical' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-ink)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-ink-faint)')}
          />
        </div>

        {/* Honeypot */}
        <input
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={formData.website}
          onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
          style={{ display: 'none' }}
        />

        <button
          type="submit"
          disabled={status === 'sending'}
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
            cursor: 'none',
            transition: 'opacity 0.15s ease',
            alignSelf: 'flex-start',
            opacity: status === 'sending' ? 0.6 : 1,
          }}
          onMouseEnter={(e) => {
            if (status !== 'sending') e.currentTarget.style.opacity = '0.8'
          }}
          onMouseLeave={(e) => {
            if (status !== 'sending') e.currentTarget.style.opacity = '1'
          }}
          data-interactive
        >
          {status === 'sending' ? 'Sending...' : 'Send'}
        </button>

        {status === 'success' && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-win)', margin: 0 }}>
            {statusMessage}
          </p>
        )}
        {status === 'error' && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-highlight)', margin: 0 }}>
            {statusMessage}
          </p>
        )}
      </form>

      {/* Social links */}
      <section style={{ marginTop: 'var(--space-xl)' }}>
        <h3
          style={{
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontSize: '0.75rem',
            color: 'var(--color-ink-muted)',
            marginBottom: 'var(--space-sm)',
          }}
        >
          Elsewhere
        </h3>
        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
          <a
            href="https://github.com/yongkangc"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem',
              color: 'var(--color-ink)',
              textDecoration: 'none',
              borderBottom: '1px solid var(--color-ink-faint)',
              paddingBottom: 2,
              transition: 'border-color 0.15s ease',
              cursor: 'none',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-ink)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-ink-faint)')}
            data-interactive
          >
            GitHub
          </a>
          <a
            href="https://linkedin.com/in/yongkangzou"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem',
              color: 'var(--color-ink)',
              textDecoration: 'none',
              borderBottom: '1px solid var(--color-ink-faint)',
              paddingBottom: 2,
              transition: 'border-color 0.15s ease',
              cursor: 'none',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-ink)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-ink-faint)')}
            data-interactive
          >
            LinkedIn
          </a>
          <a
            href="mailto:yongkang@example.com"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem',
              color: 'var(--color-ink)',
              textDecoration: 'none',
              borderBottom: '1px solid var(--color-ink-faint)',
              paddingBottom: 2,
              transition: 'border-color 0.15s ease',
              cursor: 'none',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-ink)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-ink-faint)')}
            data-interactive
          >
            Email
          </a>
        </div>
      </section>
    </div>
  )
}
