import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// Only one app is loaded: /admin is a separate console with its own login and Supabase
// session, and must not load the user app's client (which would also read sign-in links).
const isAdminPath = /^\/admin(\/|$)/i.test(window.location.pathname)
const Root = isAdminPath ? lazy(() => import('./admin/AdminApp.jsx')) : lazy(() => import('./App.jsx'))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={null}><Root /></Suspense>
  </StrictMode>,
)
