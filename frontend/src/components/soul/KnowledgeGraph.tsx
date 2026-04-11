import { useEffect, useRef, useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchSkills, fetchHackathons, fetchExperience } from '../../lib/api'
import type { SkillDomain, Hackathon, Experience } from '../../types'

/* ── types ─────────────────────────────────────────────────── */

type NodeKind = 'skill' | 'company' | 'domain' | 'hackathon'

interface GraphNode {
  id: string
  label: string
  kind: NodeKind
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  pinned?: boolean
}

interface GraphEdge {
  source: string
  target: string
}

/* ── colors per kind ───────────────────────────────────────── */

const KIND_COLORS: Record<NodeKind, string> = {
  skill: '#4ecdc4',     // teal
  company: '#f4a261',   // amber
  domain: '#a78bfa',    // purple
  hackathon: '#6b7280', // grey
}

const KIND_GLOW: Record<NodeKind, string> = {
  skill: 'rgba(78, 205, 196, 0.3)',
  company: 'rgba(244, 162, 97, 0.3)',
  domain: 'rgba(167, 139, 250, 0.3)',
  hackathon: 'rgba(107, 114, 128, 0.15)',
}

/* ── domain → skill domain mapping ─────────────────────────── */

const DOMAIN_SKILL_MAP: Record<string, string[]> = {
  'Spatial Intelligence': ['Frontend', 'AI Integration', 'ML Training'],
  'LLM Infrastructure': ['Backend', 'AI Integration', 'Agent Orchestration'],
  'Creative AI': ['AI Integration', 'Agent Orchestration', 'Frontend'],
  'Emotion & Vision AI': ['ML Training', 'AI Integration', 'Data & Visualization'],
  'Quantum Computing': ['Backend', 'ML Training'],
  'Healthcare & Biotech': ['Agent Orchestration', 'AI Integration', 'Backend'],
  'Music & Audio AI': ['AI Integration', 'ML Training', 'Frontend'],
  'Geospatial ML': ['ML Training', 'Data & Visualization', 'Cloud & Deploy'],
}

/* ── build graph from API data ─────────────────────────────── */

function buildGraph(
  skills: SkillDomain[],
  hackathons: Hackathon[],
  experience: Experience[],
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const nodeIds = new Set<string>()

  function addNode(id: string, label: string, kind: NodeKind, radius: number) {
    if (nodeIds.has(id)) return
    nodeIds.add(id)
    nodes.push({ id, label, kind, x: 0, y: 0, vx: 0, vy: 0, radius })
  }

  function addEdge(source: string, target: string) {
    if (source === target) return
    if (!nodeIds.has(source) || !nodeIds.has(target)) return
    // deduplicate
    if (edges.some(e => (e.source === source && e.target === target) || (e.source === target && e.target === source))) return
    edges.push({ source, target })
  }

  // 1. Skill domains (large)
  for (const s of skills) {
    addNode(`skill:${s.title}`, s.title, 'skill', 18)
  }

  // 2. Companies from experience (medium)
  for (const e of experience) {
    addNode(`company:${e.company}`, e.company, 'company', 14)
  }

  // 3. Hackathon domains (medium)
  const hackDomains = [...new Set(hackathons.map(h => h.domain).filter(Boolean))]
  for (const d of hackDomains) {
    addNode(`domain:${d}`, d, 'domain', 14)
  }

  // 4. Individual hackathons (small)
  for (const h of hackathons) {
    addNode(`hack:${h.name}`, h.projectName || h.name, 'hackathon', 6)
    // edge: hackathon → its domain
    if (h.domain) addEdge(`hack:${h.name}`, `domain:${h.domain}`)
  }

  // 5. Edges: skill domain → company (via battle_tested)
  for (const s of skills) {
    const bt = (s as Record<string, unknown>).battle_tested as string[] | undefined
    const battleTested = bt ?? s.battleTested ?? []
    for (const companyName of battleTested) {
      if (nodeIds.has(`company:${companyName}`)) {
        addEdge(`skill:${s.title}`, `company:${companyName}`)
      }
    }
  }

  // 6. Edges: hackathon domain → skill domains (via semantic mapping)
  for (const d of hackDomains) {
    const related = DOMAIN_SKILL_MAP[d] ?? []
    for (const skillTitle of related) {
      addEdge(`domain:${d}`, `skill:${skillTitle}`)
    }
  }

  // Initialize positions in a circle
  const cx = 0, cy = 0, r = 250
  nodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length
    n.x = cx + r * Math.cos(angle) + (Math.random() - 0.5) * 50
    n.y = cy + r * Math.sin(angle) + (Math.random() - 0.5) * 50
  })

  return { nodes, edges }
}

/* ── force simulation (manual, no d3 dependency) ───────────── */

function simulate(
  nodes: GraphNode[],
  edges: GraphEdge[],
  alpha: number,
) {
  const repulsion = 2500
  const attraction = 0.008
  const damping = 0.85
  const centerStrength = 0.01

  // Repulsion between all nodes
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j]
      let dx = b.x - a.x, dy = b.y - a.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const force = (repulsion * alpha) / (dist * dist)
      dx = (dx / dist) * force
      dy = (dy / dist) * force
      if (!a.pinned) { a.vx -= dx; a.vy -= dy }
      if (!b.pinned) { b.vx += dx; b.vy += dy }
    }
  }

  // Attraction along edges
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  for (const e of edges) {
    const a = nodeMap.get(e.source), b = nodeMap.get(e.target)
    if (!a || !b) continue
    const dx = b.x - a.x, dy = b.y - a.y
    const fx = dx * attraction * alpha
    const fy = dy * attraction * alpha
    if (!a.pinned) { a.vx += fx; a.vy += fy }
    if (!b.pinned) { b.vx -= fx; b.vy -= fy }
  }

  // Center gravity
  for (const n of nodes) {
    if (n.pinned) continue
    n.vx -= n.x * centerStrength * alpha
    n.vy -= n.y * centerStrength * alpha
  }

  // Apply velocity
  for (const n of nodes) {
    if (n.pinned) continue
    n.vx *= damping
    n.vy *= damping
    n.x += n.vx
    n.y += n.vy
  }
}

/* ── component ─────────────────────────────────────────────── */

export default function KnowledgeGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<{ nodes: GraphNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] })
  const alphaRef = useRef(1)
  const rafRef = useRef(0)
  const [hovered, setHovered] = useState<GraphNode | null>(null)
  const [dragging, setDragging] = useState<GraphNode | null>(null)
  const panRef = useRef({ x: 0, y: 0 })
  const scaleRef = useRef(1)

  const { data: skills } = useQuery({ queryKey: ['skills'], queryFn: fetchSkills })
  const { data: hackathons } = useQuery({ queryKey: ['hackathons'], queryFn: fetchHackathons })
  const { data: experience } = useQuery({ queryKey: ['experience'], queryFn: fetchExperience })

  // Build graph when data arrives
  useEffect(() => {
    if (!skills || !hackathons || !experience) return
    graphRef.current = buildGraph(skills, hackathons, experience)
    alphaRef.current = 1
  }, [skills, hackathons, experience])

  // Resize canvas
  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    function resize() {
      const dpr = window.devicePixelRatio || 1
      const rect = container!.getBoundingClientRect()
      canvas!.width = rect.width * dpr
      canvas!.height = rect.height * dpr
      canvas!.style.width = rect.width + 'px'
      canvas!.style.height = rect.height + 'px'
    }
    resize()
    const obs = new ResizeObserver(resize)
    obs.observe(container)
    return () => obs.disconnect()
  }, [])

  // Draw loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr
    const h = canvas.height / dpr

    const { nodes, edges } = graphRef.current

    // Simulate
    if (alphaRef.current > 0.001) {
      simulate(nodes, edges, alphaRef.current)
      alphaRef.current *= 0.995
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    // Transform: center + pan + scale
    const cx = w / 2 + panRef.current.x
    const cy = h / 2 + panRef.current.y
    const s = scaleRef.current
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(s, s)

    const nodeMap = new Map(nodes.map(n => [n.id, n]))

    // Draw edges
    ctx.lineWidth = 0.5
    for (const e of edges) {
      const a = nodeMap.get(e.source), b = nodeMap.get(e.target)
      if (!a || !b) continue
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }

    // Highlight edges for hovered node
    if (hovered) {
      ctx.lineWidth = 1
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'
      for (const e of edges) {
        if (e.source !== hovered.id && e.target !== hovered.id) continue
        const a = nodeMap.get(e.source), b = nodeMap.get(e.target)
        if (!a || !b) continue
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      }
    }

    // Draw nodes
    for (const n of nodes) {
      const isHovered = hovered?.id === n.id
      const isConnected = hovered && edges.some(
        e => (e.source === hovered.id && e.target === n.id) ||
             (e.target === hovered.id && e.source === n.id)
      )
      const dimmed = hovered && !isHovered && !isConnected

      // Glow
      if ((isHovered || isConnected) && n.kind !== 'hackathon') {
        ctx.shadowColor = KIND_GLOW[n.kind]
        ctx.shadowBlur = 12
      }

      ctx.fillStyle = dimmed
        ? 'rgba(255,255,255,0.08)'
        : KIND_COLORS[n.kind]
      ctx.globalAlpha = dimmed ? 0.3 : (n.kind === 'hackathon' ? 0.5 : 0.9)
      ctx.beginPath()
      ctx.arc(n.x, n.y, isHovered ? n.radius * 1.3 : n.radius, 0, Math.PI * 2)
      ctx.fill()

      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1

      // Labels (skip small hackathon nodes unless hovered/connected)
      if (n.kind === 'hackathon' && !isHovered && !isConnected) continue

      ctx.fillStyle = dimmed ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.85)'
      ctx.font = n.kind === 'hackathon' ? '8px system-ui' : '10px system-ui'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(n.label, n.x, n.y + n.radius + 4)
    }

    ctx.restore()

    // Legend (top-right)
    const legendX = w - 140, legendY = 16
    ctx.font = '10px system-ui'
    const kinds: { kind: NodeKind; label: string }[] = [
      { kind: 'skill', label: 'Skill Domain' },
      { kind: 'company', label: 'Company' },
      { kind: 'domain', label: 'Hackathon Domain' },
      { kind: 'hackathon', label: 'Hackathon' },
    ]
    kinds.forEach(({ kind, label }, i) => {
      const y = legendY + i * 18
      ctx.fillStyle = KIND_COLORS[kind]
      ctx.globalAlpha = kind === 'hackathon' ? 0.5 : 0.9
      ctx.beginPath()
      ctx.arc(legendX, y + 5, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, legendX + 10, y + 5)
    })

    rafRef.current = requestAnimationFrame(draw)
  }, [hovered])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [draw])

  // Hit testing
  function nodeAt(clientX: number, clientY: number): GraphNode | null {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const mx = (clientX - rect.left - rect.width / 2 - panRef.current.x) / scaleRef.current
    const my = (clientY - rect.top - rect.height / 2 - panRef.current.y) / scaleRef.current

    for (const n of [...graphRef.current.nodes].reverse()) {
      const dx = n.x - mx, dy = n.y - my
      if (dx * dx + dy * dy < (n.radius + 4) * (n.radius + 4)) return n
    }
    return null
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (dragging) {
      const dx = e.movementX / scaleRef.current
      const dy = e.movementY / scaleRef.current
      dragging.x += dx
      dragging.y += dy
      dragging.vx = 0
      dragging.vy = 0
      alphaRef.current = Math.max(alphaRef.current, 0.3)
      return
    }
    const node = nodeAt(e.clientX, e.clientY)
    setHovered(node)
    canvasRef.current!.style.cursor = node ? 'pointer' : 'default'
  }

  function handleMouseDown(e: React.MouseEvent) {
    const node = nodeAt(e.clientX, e.clientY)
    if (node) {
      node.pinned = true
      setDragging(node)
    }
  }

  function handleMouseUp() {
    if (dragging) {
      dragging.pinned = false
      setDragging(null)
    }
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    scaleRef.current = Math.min(3, Math.max(0.3, scaleRef.current * delta))
  }

  const isLoading = !skills || !hackathons || !experience

  return (
    <div className="editor-page" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="editor-meta">Knowledge Graph — auto-generated from Supabase data</div>
      <div
        ref={containerRef}
        style={{ flex: 1, minHeight: 400, position: 'relative' }}
      >
        {isLoading && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-ink-faint)',
          }}>
            Loading graph data...
          </div>
        )}
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  )
}
