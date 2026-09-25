// Hand-picked from the CV (owner-provided). Update here when the selection changes,
// and in backend/pkg/service/content.go (crawler copy and /llms.txt).
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

export function SelectedWorkList() {
  return <>{SELECTED_WORK.map(project => <article className="soul-project-row" key={project.title}>
    <div>
      <h3><a href={project.href} target="_blank" rel="noreferrer">{project.title}</a></h3>
      <p className="soul-project-description">{project.description}</p>
      <p className="soul-mono soul-project-meta">{project.meta} · {project.date}</p>
    </div>
  </article>)}</>
}
