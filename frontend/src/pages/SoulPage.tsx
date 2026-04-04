import { Link } from 'react-router-dom'
import '../styles/skill.css'

const ASCII_NAME = `███████╗ ██████╗ ██╗   ██╗
╚══███╔╝██╔═══██╗██║   ██║
  ███╔╝ ██║   ██║██║   ██║
 ███╔╝  ██║   ██║██║   ██║
███████╗╚██████╔╝╚██████╔╝
╚══════╝ ╚═════╝  ╚═════╝

██╗   ██╗ ██████╗ ███╗   ██╗ ██████╗ ██╗  ██╗ █████╗ ███╗   ██╗ ██████╗
╚██╗ ██╔╝██╔═══██╗████╗  ██║██╔════╝ ██║ ██╔╝██╔══██╗████╗  ██║██╔════╝
 ╚████╔╝ ██║   ██║██╔██╗ ██║██║  ███╗█████╔╝ ███████║██╔██╗ ██║██║  ███╗
  ╚██╔╝  ██║   ██║██║╚██╗██║██║   ██║██╔═██╗ ██╔══██║██║╚██╗██║██║   ██║
   ██║   ╚██████╔╝██║ ╚████║╚██████╔╝██║  ██╗██║  ██║██║ ╚████║╚██████╔╝
   ╚═╝    ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝`

const DOMAIN_TREE = `AI Engineering
├── Spatial Intelligence & 3D
├── Music & Audio AI
├── LLM Infrastructure
├── Healthcare & Biotech
├── Quantum Computing
├── Emotion & Vision AI
├── Geospatial ML
└── Creative AI & Content`

export default function SoulPage() {
  return (
    <div className="editor-page">
      <div className="editor-meta">Last updated — April 2026</div>

      <pre style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 'clamp(0.28rem, 0.75vw, 0.5rem)',
        lineHeight: 1.15,
        color: 'var(--color-ink)',
        margin: '0 0 var(--space-sm) 0',
        overflow: 'hidden',
      }}>
        {ASCII_NAME}
      </pre>

      <div className="editor-content">
        <p className="editor-subtitle">AI Engineer · Paris, France</p>

        <p>
          Part engineer, part artist.
          Building across RAG, multi-agent systems, 3D spatial intelligence, and music AI.
        </p>
        <p>
          Not assembling API wrappers. Exploring where cutting-edge tech takes us next.
        </p>

        <div className="editor-divider" />

        <p className="editor-label">Domains</p>
        <div className="cli-block" style={{ marginBottom: 'var(--space-md)' }}>
          <div className="cli-prompt">$ agent --tree domains</div>
          <div className="cli-output cli-tree">
            <pre style={{ margin: 0, fontFamily: 'inherit', fontSize: 'inherit', color: 'inherit' }}>
              {DOMAIN_TREE}
            </pre>
          </div>
        </div>

        <div className="editor-divider" />

        <p className="editor-label">Stats</p>
        <div className="cli-block">
          <div className="cli-prompt">$ agent --stats</div>
          <div className="cli-output" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
            <span><strong style={{ color: 'var(--color-ink)' }}>24</strong> hackathons</span>
            <span>│</span>
            <span><strong style={{ color: 'var(--color-ink)' }}>9</strong> wins</span>
            <span>│</span>
            <span><strong style={{ color: 'var(--color-ink)' }}>8+</strong> domains</span>
            <span>│</span>
            <span><strong style={{ color: 'var(--color-ink)' }}>3</strong> languages</span>
          </div>
        </div>

        <div className="cli-block" style={{ marginTop: 'var(--space-sm)' }}>
          <div className="cli-prompt">$ agent --info</div>
          <div className="cli-output">
            <div>SPEED    Full demo in {'<'} 20 hours avg</div>
            <div>LANGUAGE Chinese (native) · French (DALF C2) · English (IELTS 7.0)</div>
          </div>
        </div>

        <div className="editor-divider" />

        <p className="editor-label">See Also</p>
        <div className="editor-links">
          <Link to="/files/skill" data-interactive>SKILL.md</Link>
          <Link to="/files/memory" data-interactive>MEMORY.md</Link>
          <Link to="/files/contact" data-interactive>CONTACT.md</Link>
          <Link to="/files/music" data-interactive>MUSIC.md</Link>
        </div>
      </div>
    </div>
  )
}
