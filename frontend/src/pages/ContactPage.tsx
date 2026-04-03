import ContactForm from '../components/contact/ContactForm'

export default function ContactPage() {
  return (
    <div className="editor-page">
      {/* Editor meta */}
      <div className="editor-meta">Signal channels — always open</div>

      {/* Title */}
      <h1 className="editor-title">Contact</h1>

      {/* Content — reads like a document */}
      <div className="editor-content">
        <p className="editor-label">Direct Channels</p>
        <ul className="editor-list">
          <li>
            <a href="mailto:yongkang.zou1999@gmail.com" data-interactive>
              yongkang.zou1999@gmail.com
            </a>
          </li>
          <li>
            <a href="https://github.com/inin-zou" target="_blank" rel="noopener noreferrer" data-interactive>
              github.com/inin-zou
            </a>
          </li>
          <li>
            <a href="https://www.linkedin.com/in/yongkang-zou" target="_blank" rel="noopener noreferrer" data-interactive>
              linkedin.com/in/yongkang-zou
            </a>
          </li>
        </ul>

        <div className="editor-divider" />

        <p className="editor-label">Leave a Message</p>
        <ContactForm />
      </div>
    </div>
  )
}
