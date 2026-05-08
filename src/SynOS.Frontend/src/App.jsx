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
import { AdminLayout } from '@/features/admin/AdminLayout'
import { ControlTowerDashboard } from '@/features/admin/ControlTowerDashboard'
import { PendingRequestsQueue } from '@/features/admin/PendingRequestsQueue'
import { ImsRoleMappingScreen } from '@/features/admin/ImsRoleMappingScreen'
import { InventoryTerminal } from '@/features/inventory/InventoryTerminal'
import { FinanceLayout } from '@/features/finance/FinanceLayout'
import { FinanceOverview } from '@/features/finance/FinanceOverview'
import { BillsCollectionsScreen, PendingReceivablesScreen, CollectionHistoryScreen, RevenueOverview } from '@/features/finance/RevenueScreens'
import { VendorPayablesScreen, OverheadBillsScreen, OutsourcedPayablesScreen } from '@/features/finance/ExpenseScreens'
import { PartnerRegistryScreen, CommissionPayoutsScreen, CommissionRulesScreen } from '@/features/finance/ReferralScreens'
import { IntelligenceDashboard } from '@/features/finance/IntelligenceScreens'
import { RoleTakeoverBanner } from '@/features/admin/components/RoleTakeoverBanner'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

function RootRedirect() {
  const { isAuthenticated, user } = useAuth();
  const role = user?.role;
  const isAdmin = Array.isArray(role) ? role.includes('Admin') : role === 'Admin';

  console.info('[RootRedirect] Evaluating redirect:', { 
    isAuthenticated, 
    role, 
    isAdmin,
    sessionMode: user?.sessionMode 
  });

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  if (isAdmin) return <Navigate to="/admin" replace />;
  if (role === 'Receptionist') return <Navigate to="/reception" replace />;
  if (role === 'Phlebotomist') return <Navigate to="/phlebotomist" replace />;
  if (role === 'Technician' || role === 'LabTech') return <Navigate to="/workbench" replace />;
  if (role === 'Pathologist') return <Navigate to="/pathologist" replace />;
  if (role === 'Typist') return <Navigate to="/typist" replace />;
  if (role === 'DeliveryDesk') return <Navigate to="/delivery" replace />;
  if (role === 'InventoryManager') return <Navigate to="/inventory" replace />;
  if (role === 'Finance') return <Navigate to="/finance" replace />;
  
  return (
    <div className="h-screen w-screen bg-synos-background flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-xl font-bold dark:text-white text-zinc-900 mb-2">Access Portal</h1>
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

function AdminProtectedWrapper({ children, roleName }) {
  const { user } = useAuth();
  const isAdmin = Array.isArray(user?.role) ? user.role.includes('Admin') : user?.role === 'Admin';
  
  return (
    <>
      {isAdmin && <RoleTakeoverBanner roleName={roleName} />}
      <div className={isAdmin ? 'pt-10 h-full w-full' : 'h-full w-full'}>
        {children}
      </div>
    </>
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
            <Route element={<ProtectedRoute allowedRoles={['Receptionist', 'Admin']} />}>
              <Route
                path="/reception"
                element={
                  <AdminProtectedWrapper roleName="Reception">
                    <ReceptionProvider>
                      <ReceptionScreen />
                    </ReceptionProvider>
                  </AdminProtectedWrapper>
                }
              />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['Phlebotomist', 'Receptionist', 'Admin']} />}>
              <Route path="/phlebotomist" element={
                <AdminProtectedWrapper roleName="Phlebotomy">
                  <PhlebotomyScreen />
                </AdminProtectedWrapper>
              } />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['Technician', 'Admin', 'LabTech']} />}>
              <Route path="/workbench" element={
                <AdminProtectedWrapper roleName="Lab Workbench">
                  <DepartmentWorkbenchScreen />
                </AdminProtectedWrapper>
              } />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['Pathologist', 'Admin']} />}>
              <Route path="/pathologist" element={
                <AdminProtectedWrapper roleName="Pathologist">
                  <PathologistTerminal />
                </AdminProtectedWrapper>
              } />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['Typist', 'Admin']} />}>
              <Route path="/typist" element={
                <AdminProtectedWrapper roleName="Reports Typing">
                  <TypistTerminal />
                </AdminProtectedWrapper>
              } />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['DeliveryDesk', 'Admin']} />}>
              <Route path="/delivery" element={
                <AdminProtectedWrapper roleName="Delivery Desk">
                  <DeliveryTerminal />
                </AdminProtectedWrapper>
              } />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['InventoryManager', 'Admin']} />}>
              <Route path="/inventory" element={
                <AdminProtectedWrapper roleName="Inventory Operations">
                  <InventoryTerminal />
                </AdminProtectedWrapper>
              } />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['Finance', 'Admin']} />}>
              <Route element={
                <AdminProtectedWrapper roleName="Finance Hub">
                  <FinanceLayout />
                </AdminProtectedWrapper>
              }>
                <Route path="/finance" element={<FinanceOverview />} />
                {/* Revenue Department */}
                <Route path="/finance/revenue" element={<RevenueOverview />} />
                <Route path="/finance/revenue/bills" element={<BillsCollectionsScreen />} />
                <Route path="/finance/revenue/receivables" element={<PendingReceivablesScreen />} />
                <Route path="/finance/revenue/history" element={<CollectionHistoryScreen />} />
                
                {/* Expense Department */}
                <Route path="/finance/expenses" element={<VendorPayablesScreen />} />
                <Route path="/finance/expenses/payables" element={<VendorPayablesScreen />} />
                <Route path="/finance/overheads" element={<OverheadBillsScreen />} />
                <Route path="/finance/outsourcing" element={<OutsourcedPayablesScreen />} />
                <Route path="/finance/outsourcing/pending" element={<OutsourcedPayablesScreen />} />

                {/* Referral Department */}
                <Route path="/finance/referrals" element={<PartnerRegistryScreen />} />
                <Route path="/finance/referrals/registry" element={<PartnerRegistryScreen />} />
                <Route path="/finance/referrals/payouts" element={<CommissionPayoutsScreen />} />
                <Route path="/finance/referrals/rules" element={<CommissionRulesScreen />} />

                {/* Intelligence Department */}
                <Route path="/finance/intelligence" element={<IntelligenceDashboard />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<ControlTowerDashboard />} />
                <Route path="/admin/inventory" element={<PendingRequestsQueue />} />
                <Route path="/admin/inventory/setup" element={<ImsRoleMappingScreen />} />
              </Route>
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

