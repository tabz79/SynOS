import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext'

// One-time startup cleanup to reclaim space from legacy browser cache
localStorage.removeItem("synos_test_catalog");
localStorage.removeItem("synos_report_templates");

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
