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
  const categories = [...new Set(posts?.map(post => post.category) ?? [])]
  return <nav aria-label="Directory" className="soul-directory">
    <p className="soul-mono soul-index-label">YONGKANG / INDEX</p>
    <div className="soul-directory-group"><p><Link to="/files/soul">SOUL.md</Link></p>
      <NavLink end to="/files/soul">README</NavLink>
      <NavLink to="/files/soul/journey">JOURNEY</NavLink>
    </div>
    <div className="soul-directory-group"><p><Link to="/files/soul/projects">WORK/</Link></p>
      <NavLink to="/files/soul/projects">Selected projects</NavLink>
      <NavLink to="/files/soul/in-progress">In progress</NavLink>
    </div>
    <div className="soul-directory-group"><p><Link to="/files/memory">MEMORY/</Link></p><NavLink end to="/files/memory">Writing</NavLink>
      {tab === 'memory' && categories.map(category => <NavLink key={category} className="document-category" to={`/files/memory/${category}`}>{category}</NavLink>)}
    </div>
    <NavLink className="soul-mono" to="/files/music">MUSIC.md</NavLink>
    <details className="soul-archive" open={tab === 'skill' || tab === 'contact' || item === 'guestbook' || item === 'graph' || item === 'commits' || undefined}>
      <summary className="soul-mono">+ MORE / ARCHIVE</summary>
      <NavLink end to="/files/skill">Skills</NavLink>
      <NavLink to="/files/skill/experience">Experience</NavLink>
      <NavLink to="/files/skill/hackathons">Hackathons</NavLink>
      <NavLink to="/files/soul/graph">Graph</NavLink>
      <NavLink to="/files/soul/commits">Commits</NavLink>
      <NavLink to="/files/contact">Contact</NavLink>
      <NavLink to="/files/memory/guestbook">Guestbook</NavLink>
    </details>
    {user && <div className="soul-directory-group"><p>ADMIN/</p>{['posts', 'music', 'feedback', 'notifications'].map(section => <Link key={section} aria-current={tab === 'admin' && (item === section || (section === 'posts' && pathname === '/files/admin')) ? 'page' : undefined} to={`/files/admin/${section}`}>{section}</Link>)}</div>}
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
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])

  return <div className="document-layout">
    <div className="soul-paper" aria-hidden="true" />
    <a className="soul-skip" href="#document-main">Skip to content</a>
    <div className="soul-frame">
      <header className="soul-topbar">
        <Link to="/files/soul" className="soul-brand"><svg width="25" height="32" viewBox="0 0 25 32" aria-hidden="true"><path d="M19 0 25 25 0 32Z" fill="currentColor" /></svg>yongkang.dev</Link>
        <nav aria-label="Main navigation">
          <Link to="/files/soul/projects">work</Link><Link to="/files/memory">writing</Link><Link to="/files/music">music</Link><Link to="/files/soul/journey">about</Link><a href="https://github.com/inin-zou" target="_blank" rel="noreferrer">github ↗</a>
        </nav>
      </header>
      <div className="soul-columns">
        <aside className="soul-index">
          <IndexDisclosure key={pathname} />
        </aside>
        <main id="document-main" tabIndex={-1}>
          <div className="soul-breadcrumb soul-mono">~/yongkang/<span>{item ? [tab?.toUpperCase(), item, sub].filter(Boolean).join(' / ') : `${tab?.toUpperCase()}.md`}</span></div>
          <div className={`soul-page-content${item === 'graph' ? ' soul-graph-page' : ''}${item === 'graph' || item === 'commits' ? ' soul-canvas-page' : ''}`} key={pathname}><Outlet /></div>
        </main>
      </div>
      <footer className="soul-footer soul-mono"><span>© YONGKANG ZOU / PARIS</span><nav aria-label="Footer"><Link to="/files/contact">contact ↗</Link><Link to="/files/memory/guestbook">guestbook ↗</Link><Link to="/">my story ↗</Link></nav></footer>
      <MusicPlayerBar />
    </div>
  </div>
}
