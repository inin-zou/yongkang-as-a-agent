import type { SkillDomain } from '../../types'

export default function SkillDomainCard({ domain }: { domain: SkillDomain }) {
  return (
    <div className="skill-domain-card">
      <div className="skill-domain-header">
        <span className="skill-domain-icon">[{domain.icon}]</span>
        <span className="skill-domain-title">{domain.title}</span>
      </div>

      {domain.subcategories?.map((sub) => (
        <div key={sub.name} className="skill-subcategory">
          <div className="skill-subcategory-name">{sub.name}</div>
          <div className="skill-tags">
            {sub.skills.map((skill) => (
              <span key={skill} className="skill-tag">{skill}</span>
            ))}
          </div>
        </div>
      ))}

      {domain.skills && (
        <div className="skill-tags">
          {domain.skills.map((skill) => (
            <span key={skill} className="skill-tag">{skill}</span>
          ))}
        </div>
      )}

      <div className="skill-battle-tested">
        Battle tested: <span>{domain.battleTested.join(' · ')}</span>
      </div>
    </div>
  )
}
