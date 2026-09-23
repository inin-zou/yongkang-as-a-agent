import { lazy, Suspense } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import SkillsView from '../components/skill/SkillsView'
import ResumeView from '../components/skill/ResumeView'
import CvView from '../components/skill/CvView'

const HackathonsView = lazy(() => import('../components/skill/HackathonsView'))

export default function SkillPage() {
  const { item } = useParams<{ item?: string }>()

  switch (item || '') {
    case '':
      return <SkillsView />
    case 'cv':
      return <CvView />
    case 'experience':
      return <ResumeView />
    case 'resume':
      // Old URL kept working after the rename to /experience.
      return <Navigate to="/files/skill/experience" replace />
    case 'hackathons':
      return <Suspense fallback={null}><HackathonsView /></Suspense>
    default:
      return <SkillsView />
  }
}
