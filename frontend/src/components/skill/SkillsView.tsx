import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import gsap from 'gsap'
import { fetchSkills } from '../../lib/api'
import SkillDomainCard from './SkillDomainCard'
import '../../styles/skill.css'

export default function SkillsView() {
  const gridRef = useRef<HTMLDivElement>(null)
  const { data: skills, isLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: fetchSkills,
  })

  useEffect(() => {
    if (!skills || !gridRef.current) return
    const cards = gridRef.current.querySelectorAll('.skill-domain-card')
    if (cards.length === 0) return

    gsap.from(cards, {
      opacity: 0,
      y: 30,
      filter: 'blur(8px)',
      duration: 0.6,
      stagger: 0.1,
      ease: 'power2.out',
    })
  }, [skills])

  if (isLoading) {
    return (
      <div className="editor-page">
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-ink-faint)' }}>
          Loading skills...
        </p>
      </div>
    )
  }

  return (
    <div className="editor-page">
      <div className="editor-meta">10 domains · battle-tested across hackathons + industry</div>
      <h1 className="editor-title">Skills</h1>
      <div className="editor-content">
        <div className="skill-grid" ref={gridRef}>
          {skills?.map((domain) => (
            <SkillDomainCard key={domain.title} domain={domain} />
          ))}
        </div>
      </div>
    </div>
  )
}
