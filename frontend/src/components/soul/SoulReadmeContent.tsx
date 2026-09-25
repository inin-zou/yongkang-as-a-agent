import { queryKeys } from '../../lib/queryKeys'
import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchBlogPosts, fetchMusicTracks } from '../../lib/api'
import { useMusicPlayer } from '../../lib/musicPlayer'
import SoulReveal from './SoulReveal'
import { SelectedWorkList } from './selectedWork'

function FeaturedTrack() {
  const tracks = useQuery({ queryKey: queryKeys.musicTracks(), queryFn: fetchMusicTracks })
  const player = useMusicPlayer()
  const track = tracks.data?.[0]
  if (tracks.isPending) return <p role="status">Loading music…</p>
  if (tracks.isError) return <p role="status">Music could not be loaded. <button onClick={() => void tracks.refetch()}>Try again</button></p>
  if (!track) return <p className="document-muted">No recordings published yet.</p>
  const active = player.currentTrack?.slug === track.slug
  const playing = active && player.playing
  const time = active ? player.currentTime : 0
  const duration = active && Number.isFinite(player.duration) ? player.duration : 0
  return <div className="soul-featured-track">
    <button className="soul-track-play" aria-label={`${playing ? 'Pause' : 'Play'} ${track.name}`} onClick={() => active ? player.togglePlay() : player.play(track, tracks.data ?? [])}>
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">{playing ? <path d="M6 4h4v16H6zm8 0h4v16h-4z" fill="currentColor" /> : <path d="m6 3 16 9-16 9z" fill="currentColor" />}</svg>
    </button>
    <div><h3>{track.name}</h3><p className="document-muted">inhibitor{[track.genre, track.original].filter(Boolean).map(value => ` · ${value}`).join('')}</p>
      <div className="soul-track-timeline"><progress aria-label="Track progress" value={Math.min(time, duration)} max={duration || 1} /><span className="soul-mono">{Math.floor(time / 60)}:{String(Math.floor(time % 60)).padStart(2, '0')}</span></div>
    </div>
  </div>
}

// The hard-coded profile lines below (previously, background, education) are
// mirrored in backend/pkg/service/content.go for crawlers and /llms.txt.
export default function SoulReadmeContent({ bio, currently }: { bio: string[]; currently: string }) {
  const { hash, key } = useLocation()
  const posts = useQuery({ queryKey: queryKeys.posts(), queryFn: fetchBlogPosts })
  // The page can mount after the shell's scroll effect when its chunk is lazy-loaded.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'instant', block: 'start' })
  }, [hash, key])
  const latest = (posts.data ?? []).filter(post => !post.archived).sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)).slice(0, 3)

  return <>
    <SoulReveal><header id="hero" className="soul-hero soul-readme-hero">
      <h1>Yongkang Zou</h1>
      {bio.map((paragraph, index) => <p className={index === 0 ? 'soul-lead' : 'soul-bio-secondary'} key={index}>{paragraph}</p>)}
      <p className="soul-previously">Previously at <a href="https://epiminds.com/" target="_blank" rel="noreferrer">Epiminds</a> and <a href="https://mozartai.com/" target="_blank" rel="noreferrer">Mozart AI</a>. I also make music as <strong>inhibitor</strong>.</p>
      <p className="document-muted soul-currently">{currently}</p>
      <nav className="soul-social-links" aria-label="Social links"><a href="mailto:yongkang.zou.ai@gmail.com">email</a><a href="https://github.com/inin-zou" target="_blank" rel="noreferrer">github</a><a href="https://linkedin.com/in/yongkang-zou" target="_blank" rel="noreferrer">linkedin</a><Link to="/files/skill/cv">cv</Link></nav>
    </header></SoulReveal>
    <SoulReveal><section id="work" className="soul-section" aria-labelledby="soul-work-title">
      <h2 id="soul-work-title">Selected work</h2><SelectedWorkList />
    </section></SoulReveal>
    <SoulReveal><section id="writing" className="soul-section" aria-labelledby="soul-writing-title">
      <div className="soul-section-heading"><h2 id="soul-writing-title">Writing</h2><Link to="/files/memory">all writing ↗</Link></div>
      {posts.isPending && <p role="status">Loading recent writing…</p>}
      {posts.isError && <p role="status">Recent writing could not be loaded. <button onClick={() => void posts.refetch()}>Try again</button></p>}
      {posts.isSuccess && !latest.length && <p>No writing published yet.</p>}
      {latest.map(post => <article className="soul-post-row" key={post.id}>
        <h3><Link to={`/files/memory/${encodeURIComponent(post.category)}/${encodeURIComponent(post.slug)}`}>{post.title}</Link></h3>
        <time className="soul-mono" dateTime={post.publishedAt}>{Number.isNaN(Date.parse(post.publishedAt)) ? '' : new Date(post.publishedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}</time>
        <p>{post.preview?.trim() || post.category}</p>
      </article>)}
    </section></SoulReveal>
    <SoulReveal><section id="background" className="soul-section" aria-labelledby="soul-background-title">
      <div className="soul-section-heading"><h2 id="soul-background-title">A little background</h2><Link to="/files/skill/cv">cv ↗</Link></div>
      <div className="soul-background-row"><a href="https://epiminds.com/" target="_blank" rel="noreferrer">Epiminds</a><span>Founding AI Engineer</span><span className="document-muted">2026</span></div>
      <div className="soul-background-row"><a href="https://mozartai.com/" target="_blank" rel="noreferrer">Mozart AI</a><span>AI Engineer</span><span className="document-muted">2025–2026</span></div>
      <p className="soul-education">MSc Computer Science · Université Paris Dauphine–PSL</p>
      <p className="document-muted">From Nanjing to France, from economics to computer science.</p>
    </section></SoulReveal>
    <SoulReveal><section id="music" className="soul-section" aria-labelledby="soul-music-title">
      <div className="soul-section-heading"><h2 id="soul-music-title">Music</h2><Link to="/files/music">all music ↗</Link></div>
      <p className="document-muted">A different way of making things.</p>
      <FeaturedTrack />
      <Link to="/files/music">more recordings ↗</Link>
    </section></SoulReveal>
  </>
}
