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
      <h3>{experience.role} — {experience.company}</h3>
      <div className="experience-location">{experience.location}</div>

      <p className="experience-narrative">{experience.skillAssembled}</p>

      <ul className="experience-highlights">
        {experience.highlights.slice(0, 3).map((h, i) => (
          <li key={i}>{h}</li>
        ))}
      </ul>

      {experience.note && (
        <div className="experience-note">Note: {experience.note}</div>
      )}
    </div>
  )
}
