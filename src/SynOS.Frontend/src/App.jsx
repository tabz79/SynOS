import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { ReceptionProvider } from '@/features/reception/hooks/useReceptionPanelUI'
import { ReceptionScreen } from '@/features/reception/ReceptionScreen'
import { LoginPage } from '@/pages/LoginPage'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

function RootRedirect() {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'Receptionist') return <Navigate to="/reception" replace />;
  return <div className="p-10 text-white">Role {user?.role} not supported yet.</div>;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['Receptionist']} />}>
            <Route
              path="/reception"
              element={
                <ReceptionProvider>
                  <ReceptionScreen />
                </ReceptionProvider>
              }
            />
          </Route>

          {/* Root Redirection */}
          <Route path="/" element={<RootRedirect />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
