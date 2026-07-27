import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { PrintOrchestratorProvider } from '@/context/PrintOrchestratorContext'
import { ReceptionProvider } from '@/features/reception/hooks/useReceptionPanelUI'
import { ReceptionScreen } from '@/features/reception/ReceptionScreen'
import { PhlebotomyScreen } from '@/features/phlebotomy/PhlebotomyScreen'
import { DepartmentWorkbenchScreen } from '@/features/processing/DepartmentWorkbenchScreen'
import { LoginPage } from '@/pages/LoginPage'
import { FirstRunWizard } from '@/pages/FirstRunWizard'
import { PathologistTerminal } from '@/features/pathology/PathologistTerminal'
import { TypistTerminal } from '@/features/typing/TypistTerminal'
import { DeliveryTerminal } from '@/features/delivery/DeliveryTerminal'
import { DocumentPrinter } from '@/features/documents/DocumentPrinter'
import { AdminLayout } from '@/features/admin/AdminLayout'
import { ControlTowerDashboard } from '@/features/admin/ControlTowerDashboard'
import { PendingRequestsQueue } from '@/features/admin/PendingRequestsQueue'
import { ImsRoleMappingScreen } from '@/features/admin/ImsRoleMappingScreen'
import { TestMasterScreen } from '@/features/admin/TestMasterScreen'
import { ReportTemplatesScreen } from '@/features/admin/ReportTemplatesScreen'
import { SystemSettingsScreen } from '@/features/admin/SystemSettingsScreen'
import { InventoryTerminal } from '@/features/inventory/InventoryTerminal'
import { FinanceLayout } from '@/features/finance/FinanceLayout'
import { FinanceOverview } from '@/features/finance/FinanceOverview'
import { RevenueTerminal } from '@/features/finance/RevenueScreens'
import { ExpenseTerminal, OutsourcingTerminal } from '@/features/finance/ExpenseScreens'
import { VendorMasterScreen } from '@/features/finance/VendorMasterScreen'
import { OverheadExpensesScreen } from '@/features/finance/OverheadScreens'
import { IntelligenceDashboard } from '@/features/finance/IntelligenceScreens'
import { ReferralTerminal } from '@/features/finance/ReferralTerminal'
import { WorkforceTerminal, IdentityProvisioningScreen } from '@/features/finance/WorkforceScreens'
import { StaffLayout } from '@/features/employee/StaffLayout'
import { MyHRDashboard } from '@/features/employee/MyHRDashboard'
import { LeaveApplication } from '@/features/employee/LeaveApplication'
import { MyAttendance, RequestStatus } from '@/features/employee/EmployeeStubs'
import { RoleTakeoverBanner } from '@/features/admin/components/RoleTakeoverBanner'
import { ReportArchiveScreen } from '@/features/admin/ReportArchiveScreen'
import { PatientSearchScreen } from '@/features/patient/PatientSearchScreen'
import { PatientDetailScreen } from '@/features/patient/PatientDetailScreen'
import { XRayTechTerminal } from '@/features/radiology/XRayTechTerminal'
import { MriTechTerminal } from '@/features/radiology/MriTechTerminal'
import { CTTechTerminal } from '@/features/radiology/CTTechTerminal'
import { USTechTerminal } from '@/features/radiology/USTechTerminal'
import { RadiologistTerminal } from '@/features/radiology/RadiologistTerminal'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

function RootRedirect() {
  const { isAuthenticated, user, isConfigured } = useAuth();
  const role = user?.role;
  const isAdmin = Array.isArray(role) ? role.includes('Admin') : role === 'Admin';

  console.info('[RootRedirect] Evaluating redirect:', { 
    isAuthenticated, 
    role, 
    isAdmin,
    isConfigured
  });

  if (!isConfigured) return <Navigate to="/setup" replace />;

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
  if (role === 'XRayTech') return <Navigate to="/xraytech" replace />;
  if (role === 'MriTech') return <Navigate to="/mritech" replace />;
  if (role === 'CTTech') return <Navigate to="/cttech" replace />;
  if (role === 'USTech') return <Navigate to="/ustech" replace />;
  if (role === 'Radiologist') return <Navigate to="/radiologist" replace />;
  
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
      <div className="h-full w-full">
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
            <Route path="/setup" element={<FirstRunWizard />} />

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

            {/* Radiology Acquisition & Radiologist Workstations */}
            <Route element={<ProtectedRoute allowedRoles={['XRayTech', 'Admin']} />}>
              <Route path="/xraytech" element={
                <AdminProtectedWrapper roleName="X-Ray Tech">
                  <XRayTechTerminal />
                </AdminProtectedWrapper>
              } />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['MriTech', 'Admin']} />}>
              <Route path="/mritech" element={
                <AdminProtectedWrapper roleName="MRI Tech">
                  <MriTechTerminal />
                </AdminProtectedWrapper>
              } />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['CTTech', 'Admin']} />}>
              <Route path="/cttech" element={
                <AdminProtectedWrapper roleName="CT Tech">
                  <CTTechTerminal />
                </AdminProtectedWrapper>
              } />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['USTech', 'Admin']} />}>
              <Route path="/ustech" element={
                <AdminProtectedWrapper roleName="Ultrasound Tech">
                  <USTechTerminal />
                </AdminProtectedWrapper>
              } />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['Radiologist', 'Admin']} />}>
              <Route path="/radiologist" element={
                <AdminProtectedWrapper roleName="Radiologist Console">
                  <RadiologistTerminal />
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
                <Route path="/finance/revenue" element={<RevenueTerminal />} />
                <Route path="/finance/revenue/:tab" element={<RevenueTerminal />} />
                
                {/* Expense Department */}
                <Route path="/finance/expenses" element={<ExpenseTerminal />} />
                <Route path="/finance/expenses/:tab" element={<ExpenseTerminal />} />
                <Route path="/finance/outsourcing" element={<OutsourcingTerminal />} />
                <Route path="/finance/outsourcing/:tab" element={<OutsourcingTerminal />} />

                {/* Referral Department */}
                <Route path="/finance/referrals" element={<ReferralTerminal />} />
                <Route path="/finance/referrals/:tab" element={<ReferralTerminal />} />

                {/* Workforce & Payroll Department */}
                <Route path="/finance/workforce" element={<WorkforceTerminal />} />
                <Route path="/finance/workforce/:tab" element={<WorkforceTerminal />} />

                {/* Intelligence Department */}
                <Route path="/finance/intelligence" element={<IntelligenceDashboard />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<ControlTowerDashboard />} />
                <Route path="/admin/inventory" element={<PendingRequestsQueue />} />
                <Route path="/admin/inventory/setup" element={<ImsRoleMappingScreen />} />
                <Route path="/admin/test-master" element={<TestMasterScreen />} />
                <Route path="/admin/report-templates" element={<ReportTemplatesScreen />} />
                <Route path="/admin/staff" element={<IdentityProvisioningScreen />} />
                <Route path="/admin/settings" element={<SystemSettingsScreen />} />
                <Route path="/admin/patients" element={<PatientSearchScreen />} />
                <Route path="/admin/patients/:id" element={<PatientDetailScreen />} />
                <Route path="/admin/report-archive" element={<ReportArchiveScreen />} />
              </Route>
            </Route>

            {/* My HR / Employee Portal */}
            <Route element={<ProtectedRoute allowedRoles={['Admin', 'Receptionist', 'Phlebotomist', 'Technician', 'LabTech', 'Pathologist', 'Typist', 'DeliveryDesk', 'InventoryManager', 'Finance']} />}>
              <Route element={<StaffLayout />} >
                <Route path="/my-hr" element={<MyHRDashboard />} />
                <Route path="/my-hr/attendance" element={<MyAttendance />} />
                <Route path="/my-hr/leave" element={<LeaveApplication />} />
                <Route path="/my-hr/requests" element={<RequestStatus />} />
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

