import { createBrowserRouter, RouterProvider, Navigate, useParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Layout from './components/global/Layout'
import FileSystemLayout from './components/global/FileSystemLayout'
import NoiseOverlay from './components/global/NoiseOverlay'
import Landing from './pages/Landing'
import SoulPage from './pages/SoulPage'
import SkillPage from './pages/SkillPage'
import MemoryPage from './pages/MemoryPage'
import ContactPage from './pages/ContactPage'
import MusicPage from './pages/MusicPage'

const queryClient = new QueryClient()

/**
 * LandingLayout renders only the noise overlay and crosshair cursor
 * — no grid background, no tab navigation, no margins.
 * The landing page has its own full-viewport Three.js canvas.
 */
function LandingLayout() {
  return (
    <>
      <NoiseOverlay />
      <Landing />
    </>
  )
}

/**
 * TabRouter resolves which page component to render based on the :tab param.
 * This avoids duplicating the page imports across multiple route definitions.
 */
function TabRouter() {
  const { tab } = useParams<{ tab: string }>()

  switch (tab) {
    case 'soul': return <SoulPage />
    case 'skill': return <SkillPage />
    case 'memory': return <MemoryPage />
    case 'contact': return <ContactPage />
    case 'music': return <MusicPage />
    default: return <Navigate to="/files/soul" replace />
  }
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingLayout />,
  },
  // Redirect bare /files to /files/soul
  {
    path: '/files',
    element: <Navigate to="/files/soul" replace />,
  },
  {
    path: '/files/:tab',
    element: <Layout><FileSystemLayout /></Layout>,
    children: [
      // Tab-level routes (no sub-item)
      { index: true, element: <TabRouter /> },
      // Sub-item routes
      { path: ':item', element: <TabRouter /> },
    ],
  },
])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
