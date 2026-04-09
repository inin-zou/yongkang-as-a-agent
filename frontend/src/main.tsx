import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Clear stale-chunk reload guard so future deploys can trigger a reload
sessionStorage.removeItem('chunk_reload')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
