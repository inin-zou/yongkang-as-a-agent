import { Link } from 'react-router-dom'

export default function SoulPage() {
  return (
    <div className="editor-page">
      {/* Editor meta */}
      <div className="editor-meta">Last updated — April 2026</div>

      {/* Title */}
      <h1 className="editor-title">Yongkang ZOU</h1>

      {/* Content — reads like a markdown document */}
      <div className="editor-content">
        <p className="editor-subtitle">AI Engineer / Creative Technologist</p>

        <p>
          Creative technologist assembling skills across domains — from enterprise
          RAG pipelines and multi-agent orchestration to 3D spatial intelligence
          and music AI.
        </p>

        <p>
          Part engineer, part artist. Every role, every hackathon, every domain
          shift was equipping the agent with a new capability. Not just building
          on API wrappers — exploring where cutting-edge tech takes us towards
          the future.
        </p>

        <div className="editor-divider" />

        <p className="editor-label">Stats</p>
        <ul className="editor-list">
          <li>24 hackathons, 9 wins</li>
          <li>0 → demo in under 20 hours</li>
          <li>Based in Paris, France</li>
          <li>8+ domains explored</li>
          <li>Trilingual: Chinese (native), French (DALF C2), English (IELTS 7.0)</li>
        </ul>

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
