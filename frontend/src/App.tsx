import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Layout from './components/global/Layout'
import Landing from './pages/Landing'
import About from './pages/About'
import Projects from './pages/Projects'
import Contact from './pages/Contact'

const queryClient = new QueryClient()

// Layout wrapper for inner pages (with grid + tabs)
function InnerLayout() {
  return <Layout showTabs={true} useOutlet={true} />
}

// Landing wrapper (no tabs)
function LandingLayout() {
  return <Layout showTabs={false} useOutlet={false}><Landing /></Layout>
}

const router = createBrowserRouter([
  { path: '/', element: <LandingLayout /> },
  {
    element: <InnerLayout />,
    children: [
      { path: '/about', element: <About /> },
      { path: '/projects', element: <Projects /> },
      { path: '/contact', element: <Contact /> },
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
