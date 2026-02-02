import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { NotificationProvider } from './context/NotificationContext.tsx'
import { TreatmentProvider } from './context/TreatmentContext.tsx'
import { StaffProvider } from './context/StaffContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <NotificationProvider>
        <TreatmentProvider>
          <StaffProvider>
            <App />
          </StaffProvider>
        </TreatmentProvider>
      </NotificationProvider>
    </AuthProvider>
  </StrictMode>,
)
