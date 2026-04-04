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
  const { tab, item } = useParams<{ tab: string; item?: string }>()
  const location = useLocation()

  const page = (() => {
    switch (tab) {
      case 'soul': return <SoulPage />
      case 'skill': return <SkillPage />
      case 'memory': return <MemoryPage />
      case 'contact': return <ContactPage />
      case 'music': return <MusicPage />
      default: return <Navigate to="/files/soul" replace />
    }
  })()

  // Key on the full path to force re-render when navigating between
  // index route (/files/skill) and sub-item route (/files/skill/resume)
  return <Suspense key={location.pathname} fallback={<PageLoader />}>{page}</Suspense>
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
    ],
  },
  {
    path: '/admin',
    element: <Layout><Suspense fallback={<PageLoader />}><AdminPage /></Suspense></Layout>,
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
