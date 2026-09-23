import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchBlogPosts } from '../../lib/api'
import SoulReveal from './SoulReveal'

// Hand-picked from the CV (owner-provided). Update here when the selection changes.
const SELECTED_WORK = [
  {
    title: 'Codex Privacy HUD',
    meta: 'OpenAI Privacy Hackathon Paris · Winner · 100+ GitHub stars',
    date: '2026.09 – now',
    description: 'A runtime privacy and audit plugin for OpenAI Codex: tracks sensitive data crossing agent boundaries, with a session disclosure ledger and a Codex CLI status line.',
    href: 'https://github.com/inin-zou/codex-privacy-hud',
  },
  {
    title: 'Clio',
    meta: 'Big Berlin Hack · Inca Track winner',
    date: '2026',
    description: 'A full-duplex speech-to-speech voice agent for insurance claims on real phone lines (Twilio / LiveKit), with ~450–650 ms round-trip latency.',
    href: 'https://github.com/inin-zou/Clio',
  },
  {
    title: 'KernelGen',
    meta: 'GOSIM KernelGen 2026 · 1st, Sparse Attention track',
    date: '2026.05',
    description: 'Triton / FlagTree kernels for dynamic sparse attention and DeepSeek mHC across five AI accelerator backends: 1.97× average speedup on sparse attention, 71.85× on mHC.',
    href: 'https://github.com/inin-zou/kernelgen-challenge',
  },
]

export default function SoulReadmeContent({ subtitle, bio, currently }: { subtitle: string; bio: string[]; currently: string }) {
  const posts = useQuery({ queryKey: ['posts'], queryFn: fetchBlogPosts })
  const latest = [...(posts.data ?? [])].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)).slice(0, 3)

  return <>
    <SoulReveal><header className="soul-hero soul-readme-hero">
      <div>
        <h1>Yongkang Zou</h1>
        {bio.filter(Boolean).map((paragraph, index) => <p className={index === 0 ? 'soul-lead' : 'soul-bio-secondary'} key={index}>{paragraph}</p>)}
        <p className="soul-journey-line soul-mono"><Link to="/files/soul/journey" aria-label="Journey: Nanjing to Paris"><span lang="zh">南京 → 巴黎</span> · economics → engineering → AI</Link></p>
        {subtitle && <p className="soul-subtitle">{subtitle}</p>}
      </div>
    </header></SoulReveal>
    <SoulReveal><section className="soul-section" aria-labelledby="soul-work-title">
      <div><h2 id="soul-work-title">Selected work</h2>
        {SELECTED_WORK.map(project => <article className="soul-project-row" key={project.title}>
          <div className="soul-project-head">
            <h3><a href={project.href} target="_blank" rel="noreferrer">{project.title}</a></h3>
            <span className="soul-mono">{project.date}</span>
          </div>
          <p className="soul-mono soul-project-meta">{project.meta}</p>
          <p>{project.description}</p>
        </article>)}
      </div>
    </section></SoulReveal>
    <SoulReveal><section className="soul-section" aria-labelledby="soul-writing-title">
      <div><h2 id="soul-writing-title">Recent writing</h2>
        {posts.isPending && <p role="status">Loading recent writing…</p>}
        {posts.isError && <p role="status">Recent writing could not be loaded. <button onClick={() => void posts.refetch()}>Try again</button></p>}
        {posts.isSuccess && !latest.length && <p>No writing published yet.</p>}
        {latest.map(post => <article className="soul-post-row" key={post.id}>
          <div><h3><Link to={`/files/memory/${encodeURIComponent(post.category)}/${encodeURIComponent(post.slug)}`}>{post.title}</Link></h3><p className="soul-mono">{post.category}</p></div>
          <time className="soul-mono" dateTime={post.publishedAt}>{Number.isNaN(Date.parse(post.publishedAt)) ? '' : new Date(post.publishedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).toUpperCase()}</time>
        </article>)}
        <Link className="soul-browse" to="/files/memory">Browse all writing →</Link>
      </div>
    </section></SoulReveal>
    <SoulReveal><div className="soul-bottom-blocks">
      <p><span className="soul-mono">Currently: </span><span>{currently}</span></p>
      <p><span className="soul-mono">Off the clock: </span>Alternative R&amp;B and lo-fi as inhibitor. <Link to="/files/music">Listen →</Link></p>
    </div></SoulReveal>
  </>
}
