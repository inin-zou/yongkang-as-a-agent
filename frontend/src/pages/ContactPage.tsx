import type { CSSProperties } from 'react'
import ContactForm from '../components/contact/ContactForm'
import SocialLinks from '../components/contact/SocialLinks'

const pageStyle: CSSProperties = {
  padding: 'var(--space-lg)',
  maxWidth: 640,
  animation: 'fadeInFromBlur 0.6s ease forwards',
}

const sectionHeaderStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.85rem',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: 'var(--color-ink-muted)',
  marginBottom: 'var(--space-lg)',
  marginTop: 0,
}

const textureDividerStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.75rem',
  color: 'var(--color-ink-faint)',
  opacity: 0.2,
  letterSpacing: 1,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  margin: 'var(--space-xl) 0',
  userSelect: 'none',
}

export default function ContactPage() {
  return (
    <div style={pageStyle}>
      {/* Social links section */}
      <SocialLinks />

      {/* Texture divider */}
      <div style={textureDividerStyle} aria-hidden="true">
        {'|'.repeat(120)}
      </div>

      {/* Contact form section */}
      <section>
        <h2 style={sectionHeaderStyle}>Leave a Message</h2>
        <ContactForm />
      </section>
    </div>
  )
}
