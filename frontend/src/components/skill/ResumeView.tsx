import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import gsap from 'gsap'
import { fetchExperience } from '../../lib/api'
import AsciiTitle from '../global/AsciiTitle'
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

    gsap.fromTo(blocks,
      { opacity: 0, y: 20, filter: 'blur(6px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.5, stagger: 0.1, ease: 'power2.out', clearProps: 'all' },
    )
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

  const sorted = experience ? [...experience].reverse() : []

  return (
    <div className="editor-page">
      <div className="editor-meta">Every role assembled a new skill</div>
      <AsciiTitle name="resume" />
      <div className="editor-content" ref={listRef}>
        {sorted.map((exp) => (
          <ExperienceBlock key={`${exp.company}-${exp.startDate}`} experience={exp} />
        ))}

        <div className="editor-divider" />

        <p className="editor-label">Education</p>
        <div className="resume-compact-list">
          <div className="resume-compact-item">
            <span className="resume-compact-title">M.S. Computer Science (2nd Year)</span>
            <span className="resume-compact-detail">Université Paris Dauphine-PSL · 2023–2024</span>
          </div>
          <div className="resume-compact-item">
            <span className="resume-compact-title">M.S. Computer Science (1st Year)</span>
            <span className="resume-compact-detail">Université Paris-Saclay · 2022–2023</span>
          </div>
          <div className="resume-compact-item">
            <span className="resume-compact-title">B.S. Computer Science</span>
            <span className="resume-compact-detail">Université Toulouse 1 Capitole · 2019–2022</span>
          </div>
        </div>

        <div className="editor-divider" />

        <p className="editor-label">Certifications</p>
        <div className="resume-compact-list">
          <div className="resume-compact-item">
            <span className="resume-compact-title">Machine Learning in Production (MLOps)</span>
            <span className="resume-compact-detail">DeepLearning.AI / Coursera · 2024</span>
          </div>
          <div className="resume-compact-item">
            <span className="resume-compact-title">AI Agents</span>
            <span className="resume-compact-detail">HuggingFace · 2025</span>
          </div>
          <div className="resume-compact-item">
            <span className="resume-compact-title">31st China Chemistry Olympiad — National 2nd Prize (Top 5%)</span>
            <span className="resume-compact-detail">2017</span>
          </div>
        </div>
      </div>
    </div>
  )
}
