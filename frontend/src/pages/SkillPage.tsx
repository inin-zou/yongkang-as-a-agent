import { useParams } from 'react-router-dom'
import SkillsView from '../components/skill/SkillsView'
import ResumeView from '../components/skill/ResumeView'
import HackathonsView from '../components/skill/HackathonsView'
import CertificationsView from '../components/skill/CertificationsView'

export default function SkillPage() {
  const { item } = useParams<{ item?: string }>()

  switch (item || '') {
    case '':
      return <SkillsView />
    case 'resume':
      return <ResumeView />
    case 'hackathons':
      return <HackathonsView />
    case 'certifications':
      return <CertificationsView />
    default:
      return <SkillsView />
  }
}
