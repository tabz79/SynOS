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
  if (user?.role === 'Phlebotomist' || user?.role === 'Pathologist') return <Navigate to="/phlebotomist" replace />;
  
  const technicianRoles = ["HEM Technician", "BIO Technician", "IMM Technician", "MIC Technician", "HST Technician"];
  if (technicianRoles.includes(user?.role)) return <Navigate to="/workbench" replace />;

  return <div className="p-10 text-white">Role {user?.role} not supported yet.</div>;
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

            <Route element={<ProtectedRoute allowedRoles={["HEM Technician", "BIO Technician", "IMM Technician", "MIC Technician", "HST Technician"]} />}>
              <Route path="/workbench" element={<DepartmentWorkbenchScreen />} />
            </Route>

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

