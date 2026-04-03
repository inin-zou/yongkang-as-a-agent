import { useParams } from 'react-router-dom'
import ContactForm from '../components/contact/ContactForm'

export default function ContactPage() {
  const { item } = useParams<{ item?: string }>()

  if (item === 'message') {
    return (
      <div className="editor-page">
        <div className="editor-meta">Signal channels — always open</div>
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
      <div className="editor-meta">Signal channels — always open</div>
      <h1 className="editor-title">Contact</h1>
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
      </div>
    </div>
  )
}
