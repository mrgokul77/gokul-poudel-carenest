import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// wrapping everything in context providers for auth and notifications
import { AuthProvider } from './context/AuthContext'
import { NotificationsProvider } from './context/NotificationsContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <NotificationsProvider>
        <App />
      </NotificationsProvider>
    </AuthProvider>
  </StrictMode>,
)
