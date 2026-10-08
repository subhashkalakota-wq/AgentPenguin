import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// /admin is a separate console with its own login; it's loaded only when visited
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))
const isAdminPath = /^\/admin(\/|$)/i.test(window.location.pathname)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isAdminPath ? <Suspense fallback={null}><AdminApp /></Suspense> : <App />}
  </StrictMode>,
)
