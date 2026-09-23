import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchBlogPosts, fetchProjects, fetchProjectStatuses } from '../../lib/api'
import SoulReveal from './SoulReveal'

export default function SoulReadmeContent({ subtitle, bio, currently }: { subtitle: string; bio: string[]; currently: string }) {
  const projects = useQuery({ queryKey: ['projects'], queryFn: () => fetchProjects() })
  const posts = useQuery({ queryKey: ['posts'], queryFn: fetchBlogPosts })
  const validProjects = (projects.data ?? []).filter(project => project.title && project.slug)
  // The legacy /projects endpoint can decode status records without titles/slugs.
  // Fall back to the existing status API instead of fabricating project metadata.
  const needsStatuses = projects.isSuccess && validProjects.length === 0
  const statuses = useQuery({ queryKey: ['project-statuses'], queryFn: fetchProjectStatuses, enabled: needsStatuses })
  const selected = validProjects.length
    ? [...validProjects].sort((a, b) => Number(!!b.isFavorite) - Number(!!a.isFavorite)).slice(0, 3)
    : (statuses.data ?? []).slice(0, 3).map(status => ({
      slug: status.id ?? status.name, title: status.name, description: status.description,
      tags: [status.status], demoUrl: undefined,
      codeUrl: status.links?.split(/[\s,]+/).find(link => /^https?:\/\//i.test(link)),
    }))
  const workPending = projects.isPending || (needsStatuses && statuses.isPending)
  const workError = projects.isError || (needsStatuses && statuses.isError)
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
        {workPending && <p role="status">Loading selected work…</p>}
        {workError && <p role="status">Selected work could not be loaded. <button onClick={() => void (needsStatuses ? statuses.refetch() : projects.refetch())}>Try again</button></p>}
        {!workPending && !workError && !selected.length && <p>No projects published yet.</p>}
        {selected.map(project => <article className="soul-project-row" key={project.slug}>
          <h3>{project.demoUrl || project.codeUrl ? <a href={project.demoUrl || project.codeUrl} target="_blank" rel="noreferrer">{project.title}</a> : <Link to="/files/soul/projects">{project.title}</Link>}</h3>
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
