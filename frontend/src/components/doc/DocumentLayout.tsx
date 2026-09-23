import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchBlogPosts } from '../../lib/api'
import { useAuth } from '../../lib/AuthContext'
import AuthButton from '../global/AuthButton'
import MusicPlayerBar from '../global/MusicPlayerBar'
import '../../styles/document.css'

function Directory() {
  const { tab, item } = useParams()
  const { user } = useAuth()
  const { pathname } = useLocation()
  const { data: posts } = useQuery({ queryKey: ['posts'], queryFn: fetchBlogPosts, enabled: tab === 'memory' })
  const categories = [...new Set(posts?.filter(post => !post.archived).map(post => post.category) ?? [])]
  const archiveOpen = tab === 'skill' || tab === 'contact' || item === 'guestbook' || item === 'graph' || item === 'commits'
  return <nav aria-label="Directory" className="soul-directory">
    <p className="soul-mono soul-index-label">YONGKANG / INDEX</p>
    <ul className="dir-tree">
      <li><NavLink className="dir-file" end to="/files/soul">SOUL.md</NavLink></li>
      <li><NavLink className="dir-file" end to="/files/memory">MEMORY.md</NavLink>
        {tab === 'memory' && categories.length > 0 && <ul className="dir-children">
          {categories.map(category => <li key={category}><NavLink className="dir-child" to={`/files/memory/${category}`}>{category}</NavLink></li>)}
        </ul>}
      </li>
      <li><NavLink className="dir-file" to="/files/music">MUSIC.md</NavLink></li>
    </ul>
    <details className="dir-archive" open={archiveOpen || undefined}>
      <summary className="dir-file">MORE / ARCHIVE</summary>
      <ul className="dir-children">
        {[['/files/skill', 'Skills', true], ['/files/skill/experience', 'Experience'], ['/files/skill/cv', 'CV'], ['/files/skill/hackathons', 'Hackathons'], ['/files/soul/graph', 'KnowledgeGraph'], ['/files/soul/commits', 'Commits'], ['/files/contact', 'Contact'], ['/files/memory/guestbook', 'Guestbook']].map(([to, label, end]) =>
          <li key={to as string}><NavLink className="dir-child" end={Boolean(end)} to={to as string}>{label}</NavLink></li>)}
      </ul>
    </details>
    {user && <div className="dir-admin">
      <NavLink className="dir-file" end to="/files/admin">ADMIN.md</NavLink>
      <ul className="dir-children">
        {['posts', 'music', 'feedback', 'notifications'].map(section => <li key={section}><Link className="dir-child" aria-current={tab === 'admin' && (item === section || (section === 'posts' && pathname === '/files/admin')) ? 'page' : undefined} to={`/files/admin/${section}`}>{section}</Link></li>)}
      </ul>
    </div>}
    <AuthButton />
  </nav>
}

function IndexDisclosure() {
  const [open, setOpen] = useState(false)
  return <div className={`soul-index-disclosure${open ? ' soul-index-open' : ''}`}>
    <button className="soul-index-toggle" aria-expanded={open} aria-controls="soul-directory-content" onClick={() => setOpen(!open)}>Index <span aria-hidden="true">{open ? '−' : '+'}</span></button>
    <div id="soul-directory-content" className="soul-index-content"><Directory /></div>
  </div>
}

export default function DocumentLayout() {
  const { tab, item, sub } = useParams()
  const { pathname, hash, key } = useLocation()
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'instant', block: 'start' })
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }
  }, [pathname, hash, key])

  return <div className="document-layout">
    <div className="soul-paper" aria-hidden="true" />
    <a className="soul-skip" href="#document-main">Skip to content</a>
    <div className="soul-frame">
      <header className="soul-topbar">
        <Link to="/files/soul" className="soul-brand"><svg width="20" height="28" viewBox="0 0 20 28" aria-hidden="true"><ellipse cx="11" cy="3" rx="2.5" ry="3" fill="#171717" /><path d="m9 7 4 0 3 9-3 1-2-5-1 7 7 7-3 2-6-8-3 8-4-1 5-12 1-6z" fill="var(--soul-accent)" /></svg>yongkang.dev</Link>
        <nav aria-label="Main navigation">
          <Link to="/files/soul#work">work</Link><Link to="/files/memory">writing</Link><Link to="/files/music">music</Link><Link to="/files/soul#background">about</Link><a href="https://github.com/inin-zou" target="_blank" rel="noreferrer">github ↗</a>
        </nav>
      </header>
      <div className="soul-columns">
        <aside className="soul-index">
          <IndexDisclosure key={pathname} />
        </aside>
        <main id="document-main" tabIndex={-1}>
          <div className="soul-breadcrumb soul-mono">~/yongkang/<span>{[`${tab?.toUpperCase()}.md`, item, sub].filter(Boolean).join(' / ')}</span></div>
          <div className={`soul-page-content${item === 'graph' ? ' soul-graph-page' : ''}${item === 'graph' || item === 'commits' ? ' soul-canvas-page' : ''}`} key={pathname}><Outlet /></div>
          <footer className="soul-footer">
            <div><p>Say hello.</p><a href="mailto:yongkang.zou.ai@gmail.com">yongkang.zou.ai@gmail.com</a></div>
            <div className="soul-footer-right"><nav aria-label="Footer"><Link to="/">my story ↗</Link><Link to="/files/memory/guestbook">guestbook ↗</Link></nav><p>© Yongkang Zou</p></div>
          </footer>
        </main>
      </div>
      <MusicPlayerBar />
    </div>
  </div>
}
