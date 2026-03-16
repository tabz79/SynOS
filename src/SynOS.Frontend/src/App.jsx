import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { PrintOrchestratorProvider } from '@/context/PrintOrchestratorContext'
import { ReceptionProvider } from '@/features/reception/hooks/useReceptionPanelUI'
import { ReceptionScreen } from '@/features/reception/ReceptionScreen'
import { PhlebotomyScreen } from '@/features/phlebotomy/PhlebotomyScreen'
import { DepartmentWorkbenchScreen } from '@/features/processing/DepartmentWorkbenchScreen'
import { LoginPage } from '@/pages/LoginPage'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

function RootRedirect() {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'Receptionist') return <Navigate to="/reception" replace />;
  if (user?.role === 'Phlebotomist') return <Navigate to="/phlebotomist" replace />;
  if (user?.role === 'Technician' || user?.role === 'Admin') return <Navigate to="/workbench" replace />;
  if (user?.role === 'Pathologist') return <Navigate to="/pathologist" replace />;
  
  return (
    <div className="h-screen w-screen bg-synos-background flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-xl font-bold text-white mb-2">Access Portal</h1>
        <p className="text-zinc-500">Workspace for role '{user?.role}' is coming soon.</p>
        <button 
          onClick={() => window.location.href = '/login'}
          className="mt-4 text-synos-primary hover:underline text-sm"
        >
          Return to Login
        </button>
      </div>
    </div>
  );
}
function PathologistTerminal() {
  const { logout } = useAuth();
  return (
    <div className="h-screen w-screen bg-synos-background flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Pathologist Review Terminal</h1>
        <p className="text-zinc-500 mb-6">Diagnostic Module Coming Soon</p>
        <button 
          onClick={logout}
          className="px-6 py-2 bg-white text-black font-bold rounded hover:bg-zinc-200 transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <PrintOrchestratorProvider>
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

            <Route element={<ProtectedRoute allowedRoles={['Phlebotomist', 'Receptionist']} />}>
              <Route path="/phlebotomist" element={<PhlebotomyScreen />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['Technician', 'Admin']} />}>
              <Route path="/workbench" element={<DepartmentWorkbenchScreen />} />
            </Route>

            <Route path="/pathologist" element={
              <PathologistTerminal />
            } />

            {/* Root Redirection */}
            <Route path="/" element={<RootRedirect />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </PrintOrchestratorProvider>
    </AuthProvider>
  )
}

export default App

