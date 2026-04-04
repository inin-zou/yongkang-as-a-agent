import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import gsap from 'gsap'
import { fetchExperience } from '../../lib/api'
import ExperienceBlock from './ExperienceBlock'
import '../../styles/skill.css'

export default function ResumeView() {
  const listRef = useRef<HTMLDivElement>(null)
  const { data: experience, isLoading } = useQuery({
    queryKey: ['experience'],
    queryFn: fetchExperience,
  })

  useEffect(() => {
    if (!experience || !listRef.current) return
    const blocks = listRef.current.querySelectorAll('.experience-block')
    if (blocks.length === 0) return

    gsap.from(blocks, {
      opacity: 0,
      y: 20,
      filter: 'blur(6px)',
      duration: 0.5,
      stagger: 0.1,
      ease: 'power2.out',
    })
  }, [experience])

  if (isLoading) {
    return (
      <div className="editor-page">
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-ink-faint)' }}>
          Loading experience...
        </p>
      </div>
    )
  }

  // Reverse chronological order (newest first)
  const sorted = experience ? [...experience].reverse() : []

  return (
    <div className="editor-page">
      <div className="editor-meta">Every role assembled a new skill</div>
      <h1 className="editor-title">Resume</h1>
      <div className="editor-content" ref={listRef}>
        {sorted.map((exp) => (
          <ExperienceBlock key={`${exp.company}-${exp.startDate}`} experience={exp} />
        ))}
      </div>
    </div>
  )
}
