import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { PrintOrchestratorProvider } from '@/context/PrintOrchestratorContext'
import { ReceptionProvider } from '@/features/reception/hooks/useReceptionPanelUI'
import { ReceptionScreen } from '@/features/reception/ReceptionScreen'
import { PhlebotomyScreen } from '@/features/phlebotomy/PhlebotomyScreen'
import { DepartmentWorkbenchScreen } from '@/features/processing/DepartmentWorkbenchScreen'
import { LoginPage } from '@/pages/LoginPage'
import { PathologistTerminal } from '@/features/pathology/PathologistTerminal'
import { TypistTerminal } from '@/features/typing/TypistTerminal'
import { DeliveryTerminal } from '@/features/delivery/DeliveryTerminal'
import { DocumentPrinter } from '@/features/documents/DocumentPrinter'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

function RootRedirect() {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'Receptionist') return <Navigate to="/reception" replace />;
  if (user?.role === 'Phlebotomist') return <Navigate to="/phlebotomist" replace />;
  if (user?.role === 'Technician' || user?.role === 'Admin') return <Navigate to="/workbench" replace />;
  if (user?.role === 'Pathologist') return <Navigate to="/pathologist" replace />;
  if (user?.role === 'Typist') return <Navigate to="/typist" replace />;
  if (user?.role === 'DeliveryDesk') return <Navigate to="/delivery" replace />;
  
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

function App() {
  return (
    <AuthProvider>
      <PrintOrchestratorProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Document Engine (Decoupled Print Pipeline) */}
            <Route path="/print/report/:id" element={<DocumentPrinter />} />

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

            <Route element={<ProtectedRoute allowedRoles={['Pathologist']} />}>
              <Route path="/pathologist" element={<PathologistTerminal />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['Typist']} />}>
              <Route path="/typist" element={<TypistTerminal />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['DeliveryDesk']} />}>
              <Route path="/delivery" element={<DeliveryTerminal />} />
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

