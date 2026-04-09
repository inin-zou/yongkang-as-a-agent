import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Navigate, useParams, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './lib/AuthContext'
import Layout from './components/global/Layout'
import FileSystemLayout from './components/global/FileSystemLayout'
import NoiseOverlay from './components/global/NoiseOverlay'

const queryClient = new QueryClient()

// Lazy-loaded pages
const Landing = lazy(() => import('./pages/Landing'))
const SoulPage = lazy(() => import('./pages/SoulPage'))
const SkillPage = lazy(() => import('./pages/SkillPage'))
const MemoryPage = lazy(() => import('./pages/MemoryPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const MusicPage = lazy(() => import('./pages/MusicPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))

function PageLoader() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '200px',
      fontFamily: 'var(--font-mono)',
      fontSize: '0.8rem',
      color: 'var(--color-ink-faint)',
    }}>
      Loading...
    </div>
  )
}

function LandingLayout() {
  return (
    <>
      <NoiseOverlay />
      <Suspense fallback={<PageLoader />}>
        <Landing />
      </Suspense>
    </>
  )
}

function TabRouter() {
  const { tab } = useParams<{ tab: string }>()
  const { pathname } = useLocation()

  // Use pathname as key so React remounts the page component
  // when navigating between index (/files/skill) and sub-item (/files/skill/resume)
  const page = (() => {
    switch (tab) {
      case 'soul': return <SoulPage key={pathname} />
      case 'skill': return <SkillPage key={pathname} />
      case 'memory': return <MemoryPage key={pathname} />
      case 'contact': return <ContactPage key={pathname} />
      case 'music': return <MusicPage key={pathname} />
      case 'admin': return <AdminPage key={pathname} />
      default: return <Navigate to="/files/soul" replace />
    }
  })()

  return <Suspense fallback={<PageLoader />}>{page}</Suspense>
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingLayout />,
  },
  {
    path: '/files',
    element: <Navigate to="/files/soul" replace />,
  },
  {
    path: '/files/:tab',
    element: <Layout><FileSystemLayout /></Layout>,
    children: [
      { index: true, element: <TabRouter /> },
      { path: ':item', element: <TabRouter /> },
      { path: ':item/:sub', element: <TabRouter /> },
    ],
  },
  {
    path: '/admin',
    element: <Navigate to="/files/admin" replace />,
  },
])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  )
}
