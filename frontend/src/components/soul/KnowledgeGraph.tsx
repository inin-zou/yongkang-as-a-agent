import { useEffect, useRef, useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchSkills, fetchHackathons, fetchExperience } from '../../lib/api'
import type { SkillDomain, Hackathon, Experience } from '../../types'

/* ── types ─────────────────────────────────────────────────── */

type NodeKind = 'skill' | 'company' | 'domain' | 'hackathon' | 'tech'

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

/* ── colors per kind (holographic minimalism: desaturated fill + prismatic glow) */

// Desaturated fills — soft, milky versions that sit on warm grey
const KIND_FILL: Record<NodeKind, string> = {
  skill: 'rgba(77, 208, 225, 0.35)',    // teal, translucent
  company: 'rgba(255, 138, 101, 0.3)',   // coral, translucent
  domain: 'rgba(179, 136, 255, 0.3)',    // lavender, translucent
  hackathon: 'rgba(255, 255, 255, 0.06)', // barely visible
  tech: 'rgba(105, 240, 174, 0.25)',     // mint, translucent
}

// Full-saturation stroke for the ring
const KIND_STROKE: Record<NodeKind, string> = {
  skill: 'rgba(77, 208, 225, 0.7)',
  company: 'rgba(255, 138, 101, 0.6)',
  domain: 'rgba(179, 136, 255, 0.6)',
  hackathon: 'rgba(255, 255, 255, 0.1)',
  tech: 'rgba(105, 240, 174, 0.5)',
}

// Glow halo color (used with shadowBlur for holographic bleed)
const KIND_GLOW: Record<NodeKind, string> = {
  skill: '#4dd0e1',
  company: '#ff8a65',
  domain: '#b388ff',
  hackathon: 'transparent',
  tech: '#69f0ae',
}

// Solid colors for legend dots
const KIND_LEGEND: Record<NodeKind, string> = {
  skill: '#4dd0e1',
  company: '#ff8a65',
  domain: '#b388ff',
  hackathon: '#555',
  tech: '#69f0ae',
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

/* ── hackathon → tech stack (from GitHub repo analysis) ────── */

const HACKATHON_TECHS: Record<string, string[]> = {
  'TechEurope Stockholm': ['TypeScript', 'Go', 'React', 'Three.js', 'Tailwind', 'shadcn', 'Vite', 'TanStack', 'Supabase', 'Gemini', 'Playwright'],
  'Mistral Online': ['TypeScript', 'Python', 'Next.js', 'React', 'Tailwind', 'shadcn', 'Framer Motion', 'FastAPI', 'Express', 'PyTorch', 'Transformers', 'HuggingFace', 'Whisper', 'ElevenLabs', 'Gradio', 'Modal', 'Docker', 'Weights & Biases', 'LoRA', 'Mistral', 'WebSocket'],
  'HackEurope': ['TypeScript', 'Next.js', 'React', 'Three.js', 'Tailwind', 'shadcn', 'TanStack', 'Stripe', 'ElevenLabs', 'Gemini', 'Claude', 'Vercel', 'Redis', 'Zustand'],
  'Gemini Hackathon': ['TypeScript', 'Go', 'Next.js', 'React', 'Three.js', 'Tailwind', 'shadcn', 'Zustand', 'Supabase', 'PostgreSQL', 'Redis', 'Gemini', 'Modal'],
  'TechEurope Paris': ['TypeScript', 'Python', 'React', 'Vite', 'Tailwind', 'FastAPI', 'OpenAI', 'ElevenLabs', 'Modal'],
  'Project ElevenLabs': ['TypeScript', 'Python', 'Next.js', 'React', 'Three.js', 'Tailwind', 'shadcn', 'Zustand', 'ElevenLabs', 'FastAPI', 'PostgreSQL', 'Claude', 'OpenAI', 'Docker', 'AWS', 'Supabase'],
  'Junction': ['TypeScript', 'Next.js', 'React', 'Tailwind', 'shadcn', 'Framer Motion', 'Vercel'],
  'Entrepreneurs First': ['TypeScript', 'Express', 'Claude'],
  'Big Berlin': ['TypeScript', 'Python', 'Next.js', 'React', 'Three.js', 'Tailwind', 'shadcn', 'Framer Motion', 'FastAPI', 'Modal', 'Weaviate', 'n8n', 'Vercel'],
  'Datacraft': ['Python', 'Vue', 'Vite', 'Mistral', 'LlamaIndex', 'HuggingFace', 'Weaviate', 'FastAPI'],
  'Tech Europe Paris': ['TypeScript', 'Next.js', 'React', 'Tailwind', 'shadcn', 'Supabase', 'PostgreSQL', 'OpenAI', 'MCP'],
  'Mistral AI MCP': ['Python', 'Mistral', 'MCP', 'FastAPI', 'AWS', 'Vercel', 'Docker'],
  'ShipItSunday': ['Python', 'TypeScript', 'Supabase', 'PostgreSQL', 'FastAPI', 'OpenAI'],
  'Hack Nation MIT': ['TypeScript', 'Python', 'Next.js', 'React', 'Tailwind', 'Framer Motion', 'FastAPI', 'Gemini', 'ElevenLabs', 'OpenAI', 'Claude', 'LangChain', 'Playwright', 'Docker'],
  'Pond Speedrun': ['Python', 'FastAPI', 'OpenAI', 'ElevenLabs', 'TensorFlow', 'Docker', 'GCP', 'WebSocket'],
  'AMD Hackathon': ['Python', 'vLLM'],
  'RAISE Summit': ['TypeScript', 'Next.js', 'React', 'Tailwind', 'Vercel'],
  'Dify Paris': ['Python', 'Dify'],
  'Phagos': ['Python', 'PyTorch', 'scikit-learn', 'HuggingFace', 'Transformers'],
  'From RAG to Agentic AI': ['TypeScript', 'Python', 'React', 'Tailwind', 'Vite', 'Prisma', 'Streamlit', 'AWS', 'Claude', 'Mistral', 'scikit-learn'],
  'GeoAI Hack': ['Python', 'PyTorch', 'Streamlit', 'Docker', 'HuggingFace'],
  'Doctolib': ['Python', 'Streamlit', 'Mistral', 'scikit-learn', 'FastAPI', 'PyTorch'],
  'Quantum Challenge': ['Python', 'PyTorch'],
  'SpotOn Edge Device': ['Python', 'Gradio', 'LangChain', 'HuggingFace', 'PyTorch', 'PostgreSQL', 'scikit-learn', 'FastAPI'],
}

/* ── company → tech stack + extra skill domains ───────────── */

const COMPANY_TECHS: Record<string, string[]> = {
  'Mozart AI': [
    'TypeScript', 'Python', 'React', 'Vite', 'Tailwind', 'Zustand', 'Framer Motion',
    'Express', 'FastAPI', 'OpenAI', 'Claude', 'ElevenLabs', 'Replicate',
    'PyTorch', 'TensorFlow', 'ffmpeg', 'Docker', 'GCP', 'Playwright',
    'WebSocket', 'Stripe',
  ],
  'Epiminds': [
    'TypeScript', 'React', 'Vite', 'Tailwind', 'shadcn', 'Zustand', 'TanStack',
    'Framer Motion', 'Vercel AI SDK', 'Express', 'OpenAI', 'Claude', 'Gemini',
    'LangChain', 'LangGraph', 'MCP', 'Supabase', 'PostgreSQL', 'Redis', 'Prisma',
    'Docker', 'GCP', 'Stripe', 'Playwright', 'n8n',
  ],
  'Misogi Labs': ['Python', 'LangGraph', 'LangChain'],
  'Societe Generale': ['Python', 'Hadoop', 'Spark', 'Airflow', 'LangChain'],
  'CITIC Securities': ['Python', 'R', 'VBA'],
  'Smart Gadget Home': ['Python', 'Tableau'],
}

const COMPANY_EXTRA_SKILLS: Record<string, string[]> = {
  'Mozart AI': ['Agent Orchestration', 'AI Integration', 'Frontend', 'Cloud & Deploy', 'DevOps', 'ML Training'],
  'Epiminds': ['Agent Orchestration', 'AI Integration', 'Frontend', 'Cloud & Deploy', 'DevOps', 'Database & Storage'],
  'Misogi Labs': ['Agent Orchestration', 'AI Integration'],
  'Societe Generale': ['Data & Visualization', 'Agent Orchestration', 'AI Integration', 'Cloud & Deploy', 'DevOps'],
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
    // hackathon → tech edges are wired in step 8 (after tech nodes are created)
  }

  // 5. Edges: skill domain → company (via battle_tested)
  for (const s of skills) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bt = (s as any).battle_tested as string[] | undefined
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

  // 7. Tech stack nodes from individual skills within each domain
  // Count how many domains each tech connects to (for sizing)
  const techDomainCount = new Map<string, number>()
  for (const s of skills) {
    const allTechs = [...(s.skills ?? [])]
    const subs = (s as any).subcategories ?? s.subcategories ?? [] // eslint-disable-line @typescript-eslint/no-explicit-any
    for (const sub of subs) {
      allTechs.push(...(sub.skills ?? []))
    }
    for (const tech of allTechs) {
      techDomainCount.set(tech, (techDomainCount.get(tech) ?? 0) + 1)
    }
  }

  for (const s of skills) {
    const allTechs = [...(s.skills ?? [])]
    const subs = (s as any).subcategories ?? s.subcategories ?? [] // eslint-disable-line @typescript-eslint/no-explicit-any
    for (const sub of subs) {
      allTechs.push(...(sub.skills ?? []))
    }
    for (const tech of allTechs) {
      addNode(`tech:${tech}`, tech, 'tech', 4) // placeholder radius, resized below
      addEdge(`tech:${tech}`, `skill:${s.title}`)
    }
  }

  // 8. Create tech nodes from hackathon stacks that aren't already in skill domains
  //    and wire up the hackathon → tech edges (deferred from step 4)
  for (const h of hackathons) {
    const techs = HACKATHON_TECHS[h.name] ?? []
    for (const tech of techs) {
      addNode(`tech:${tech}`, tech, 'tech', 4)
      addEdge(`hack:${h.name}`, `tech:${tech}`)
    }
  }

  // 9. Company → tech stack + extra skill domain edges
  for (const e of experience) {
    const techs = COMPANY_TECHS[e.company] ?? []
    for (const tech of techs) {
      addNode(`tech:${tech}`, tech, 'tech', 4)
      addEdge(`company:${e.company}`, `tech:${tech}`)
    }
    const extraSkills = COMPANY_EXTRA_SKILLS[e.company] ?? []
    for (const skillTitle of extraSkills) {
      addEdge(`skill:${skillTitle}`, `company:${e.company}`)
    }
  }

  // Size ALL nodes by connection count (edge degree)
  const degreeMap = new Map<string, number>()
  for (const e of edges) {
    degreeMap.set(e.source, (degreeMap.get(e.source) ?? 0) + 1)
    degreeMap.set(e.target, (degreeMap.get(e.target) ?? 0) + 1)
  }
  // Min/max radius per kind
  const RADIUS_RANGE: Record<NodeKind, [number, number]> = {
    skill:     [12, 28],
    company:   [8, 18],
    domain:    [8, 18],
    hackathon: [3, 8],
    tech:      [3, 14],
  }
  for (const n of nodes) {
    const degree = degreeMap.get(n.id) ?? 1
    const [min, max] = RADIUS_RANGE[n.kind]
    n.radius = Math.min(max, min + degree * 1.5)
  }

  // Initialize positions in a circle
  const cx = 0, cy = 0, r = 300
  nodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length
    n.x = cx + r * Math.cos(angle) + (Math.random() - 0.5) * 60
    n.y = cy + r * Math.sin(angle) + (Math.random() - 0.5) * 60
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
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMiss, setSearchMiss] = useState(false)
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

    // Draw nodes (holographic: glow halo → translucent fill → thin stroke ring)
    for (const n of nodes) {
      const isHovered = hovered?.id === n.id
      const isConnected = hovered && edges.some(
        e => (e.source === hovered.id && e.target === n.id) ||
             (e.target === hovered.id && e.source === n.id)
      )
      const dimmed = hovered && !isHovered && !isConnected
      const r = isHovered ? n.radius * 1.3 : n.radius

      if (dimmed) {
        // Dimmed: barely visible dot
        ctx.globalAlpha = 0.15
        ctx.fillStyle = 'rgba(255,255,255,0.1)'
        ctx.beginPath()
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      } else {
        // 1. Glow halo (always on for non-hackathon, brighter on hover)
        if (n.kind !== 'hackathon') {
          ctx.shadowColor = KIND_GLOW[n.kind]
          ctx.shadowBlur = isHovered ? 24 : 10
          ctx.fillStyle = 'rgba(0,0,0,0.01)' // invisible fill to trigger shadow
          ctx.beginPath()
          ctx.arc(n.x, n.y, r + 2, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowColor = 'transparent'
          ctx.shadowBlur = 0
        }

        // 2. Translucent fill
        ctx.fillStyle = KIND_FILL[n.kind]
        ctx.beginPath()
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
        ctx.fill()

        // 3. Thin stroke ring
        ctx.strokeStyle = KIND_STROKE[n.kind]
        ctx.lineWidth = isHovered ? 1.5 : 0.8
        ctx.stroke()
      }

      // Labels: skip small nodes unless hovered/connected
      const isSmallNode = n.kind === 'hackathon' || (n.kind === 'tech' && n.radius <= 5)
      if (isSmallNode && !isHovered && !isConnected) continue

      ctx.fillStyle = dimmed ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.85)'
      ctx.font = (n.kind === 'hackathon' || n.kind === 'tech') ? '8px system-ui' : '10px system-ui'
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
      { kind: 'tech', label: 'Tech Stack' },
      { kind: 'company', label: 'Company' },
      { kind: 'domain', label: 'Hackathon Domain' },
      { kind: 'hackathon', label: 'Hackathon' },
    ]
    kinds.forEach(({ kind, label }, i) => {
      const y = legendY + i * 18
      ctx.fillStyle = KIND_LEGEND[kind]
      ctx.globalAlpha = kind === 'hackathon' ? 0.4 : 0.8
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

  function handleSearch(query: string) {
    setSearchQuery(query)
    setSearchMiss(false)
    if (!query.trim()) {
      setHovered(null)
      return
    }
    const q = query.trim().toLowerCase()
    const { nodes } = graphRef.current
    // Exact match first, then prefix, then substring
    const match = nodes.find(n => n.label.toLowerCase() === q)
      ?? nodes.find(n => n.label.toLowerCase().startsWith(q))
      ?? nodes.find(n => n.label.toLowerCase().includes(q))
    if (match) {
      setHovered(match)
      // Pan to center on the matched node
      panRef.current = { x: -match.x * scaleRef.current, y: -match.y * scaleRef.current }
    } else {
      setHovered(null)
      setSearchMiss(true)
    }
  }

  const isLoading = !skills || !hackathons || !experience

  return (
    <div className="editor-page" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="editor-meta" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
        <span>Knowledge Graph</span>
        <div style={{ position: 'relative', marginLeft: 'auto' }}>
          <input
            type="text"
            placeholder="Search tech, project, company..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              background: 'var(--color-surface-0)',
              border: '1px solid var(--color-ink-faint)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 10px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: 'var(--color-ink)',
              outline: 'none',
              width: 220,
            }}
          />
          {searchMiss && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 6,
              background: 'var(--color-surface-1)',
              border: '1px solid var(--color-ink-faint)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 12px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              color: 'var(--color-ink-muted)',
              width: 260,
              zIndex: 10,
              lineHeight: 1.5,
            }}>
              <div>Not found in the graph.</div>
              <div style={{ marginTop: 4 }}>
                Maybe I've used it but haven't recorded it yet.{' '}
                <a
                  href="/files/contact/message"
                  style={{ color: 'var(--color-prism-teal)', textDecoration: 'none' }}
                >
                  Leave me a note
                </a>
                {' '}and I'll add it!
              </div>
            </div>
          )}
        </div>
      </div>
      <div
        ref={containerRef}
        style={{ flex: 1, minHeight: 400, position: 'relative' }}
        onClick={() => setSearchMiss(false)}
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
