import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext'

// Global DOM Safety Patch for Third-Party Libraries (Cornerstone3D, TipTap, etc.)
// Prevents unhandled NotFoundError exceptions when third-party canvas or DOM managers
// attempt to remove child nodes during React unmount/teardown cycles.
if (typeof window !== 'undefined' && typeof Node !== 'undefined' && Node.prototype && Node.prototype.removeChild) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (!child) return child;
    if (child.parentNode !== this) {
      if (child.parentNode) {
        try {
          return originalRemoveChild.call(child.parentNode, child);
        } catch (e) {
          return child;
        }
      }
      return child;
    }
    try {
      return originalRemoveChild.call(this, child);
    } catch (e) {
      if (e && (e.name === 'NotFoundError' || (e.message && e.message.includes('not a child')))) {
        return child;
      }
      throw e;
    }
  };
}

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
