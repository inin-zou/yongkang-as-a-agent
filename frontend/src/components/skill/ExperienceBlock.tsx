import type { Experience } from '../../types'

function formatDate(d: string) {
  const [year, month] = d.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[parseInt(month) - 1]} ${year}`
}

export default function ExperienceBlock({ experience }: { experience: Experience }) {
  const start = formatDate(experience.startDate)
  const end = experience.endDate ? formatDate(experience.endDate) : 'Present'

  return (
    <div className="experience-block">
      <div className="experience-date">{start} — {end}</div>
      <div className="experience-role">{experience.role}</div>
      <div className="experience-company">{experience.company}</div>
      <div className="experience-location">{experience.location}</div>

      <p className="experience-narrative">{experience.skillAssembled}</p>

      <ul className="experience-highlights">
        {experience.highlights.map((h, i) => (
          <li key={i}>{h}</li>
        ))}
      </ul>

      {experience.note && (
        <div className="experience-note">Note: {experience.note}</div>
      )}
    </div>
  )
}
