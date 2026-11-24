import { lazy, Suspense } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import SkillsView from '../components/skill/SkillsView'
import ResumeView from '../components/skill/ResumeView'
import { pageTitle, usePageMeta, type PageMeta } from '../lib/seo'

const HackathonsView = lazy(() => import('../components/skill/HackathonsView'))

const SKILL_META: Record<string, PageMeta> = {
  '': { title: pageTitle('Skills'), description: 'Skill domains, tools and the projects that tested them.', path: '/files/skill' },
  experience: { title: pageTitle('Experience'), description: 'Where Yongkang Zou has worked, and what shipped there.', path: '/files/skill/experience' },
  hackathons: { title: pageTitle('Hackathons'), description: 'Hackathons Yongkang Zou has built at, and what came out of them.', path: '/files/skill/hackathons' },
}

export default function SkillPage() {
  const { item } = useParams<{ item?: string }>()
  usePageMeta(SKILL_META[item || ''] ?? SKILL_META[''])

  switch (item || '') {
    case '':
      return <SkillsView />
    case 'cv':
      // The CV page is offline; old links land on Experience.
      return <Navigate to="/files/skill/experience" replace />
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
