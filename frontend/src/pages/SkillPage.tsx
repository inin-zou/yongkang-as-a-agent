import { lazy, Suspense } from 'react'
import { useParams } from 'react-router-dom'
import SkillsView from '../components/skill/SkillsView'
import ResumeView from '../components/skill/ResumeView'

const HackathonsView = lazy(() => import('../components/skill/HackathonsView'))

export default function SkillPage() {
  const { item } = useParams<{ item?: string }>()

  switch (item || '') {
    case '':
      return <SkillsView />
    case 'resume':
      return <ResumeView />
    case 'hackathons':
      return <Suspense fallback={null}><HackathonsView /></Suspense>
    default:
      return <SkillsView />
  }
}
