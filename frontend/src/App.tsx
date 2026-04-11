import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Navigate, useParams, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './lib/AuthContext'
import { MusicPlayerProvider } from './lib/MusicPlayerContext'
import Layout from './components/global/Layout'
import FileSystemLayout from './components/global/FileSystemLayout'
import NoiseOverlay from './components/global/NoiseOverlay'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 0,                  // don't keep stale data after unmount
      refetchOnWindowFocus: false, // don't refetch when tabbing back to browser
    },
  },
})

// Lazy-loaded pages — retryImport reloads on stale chunk errors after deploys
function retryImport<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((err) => {
    // After a new deploy, old chunk hashes no longer exist on the CDN.
    // The SPA rewrite serves index.html instead, causing a MIME type error.
    // Reload once so the browser fetches the new index.html with correct chunks.
    if (!sessionStorage.getItem('chunk_reload')) {
      sessionStorage.setItem('chunk_reload', '1')
      window.location.reload()
    }
    throw err
  })
}

const Landing = lazy(() => retryImport(() => import('./pages/Landing')))
const SoulPage = lazy(() => retryImport(() => import('./pages/SoulPage')))
const SkillPage = lazy(() => retryImport(() => import('./pages/SkillPage')))
const MemoryPage = lazy(() => retryImport(() => import('./pages/MemoryPage')))
const ContactPage = lazy(() => retryImport(() => import('./pages/ContactPage')))
const MusicPage = lazy(() => retryImport(() => import('./pages/MusicPage')))
const AdminPage = lazy(() => retryImport(() => import('./pages/AdminPage')))

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
      <MusicPlayerProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </MusicPlayerProvider>
    </QueryClientProvider>
  )
}
