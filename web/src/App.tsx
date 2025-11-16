// File: web/src/App.tsx
// Author: Gemini
// Date: 2025-11-13

import { Routes, Route, Link } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import PatientSearchPage from './pages/PatientSearchPage';
import PatientDetailPage from './pages/PatientDetailPage';
import './App.css'; // Assuming some basic app-wide styles

// Dummy components for demonstration
const Dashboard = () => <h2>Welcome to the Dashboard!</h2>;
const VisitsPage = () => <h2>Visits Management</h2>;
const DeliveryPage = () => <h2>Delivery Management</h2>;
const SamplesPage = () => <h2>Samples Management</h2>;
const ResultsPage = () => <h2>Results Management</h2>;
const QualityPage = () => <h2>Quality Control</h2>;
const ReportsPage = () => <h2>Reports</h2>;
const SignPage = () => <h2>Sign Reports</h2>;
const AdminPage = () => <h2>Admin Panel</h2>;
const UnauthorizedPage = () => <h2>403 - Unauthorized Access</h2>;


function App() {
  const { isAuthenticated, user, logout, hasRole } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <nav className="bg-white p-4 shadow-md flex justify-between items-center">
        <Link to="/" className="text-xl font-bold text-blue-600">SynOS</Link>
        <div className="flex items-center">
          {isAuthenticated ? (
            <>
              <span className="mr-4 text-gray-700">Welcome, {user?.name || 'User'}</span>
              <ul className="flex space-x-4 mr-4">
                {(hasRole('Reception') || hasRole('Admin')) && (
                  <>
                    <li><Link to="/patients" className="text-blue-600 hover:text-blue-800">Patients</Link></li>
                    <li><Link to="/visits" className="text-blue-600 hover:text-blue-800">Visits</Link></li>
                    <li><Link to="/delivery" className="text-blue-600 hover:text-blue-800">Delivery</Link></li>
                  </>
                )}
                {(hasRole('PathTech') || hasRole('Admin')) && (
                  <>
                    <li><Link to="/samples" className="text-blue-600 hover:text-blue-800">Samples</Link></li>
                    <li><Link to="/results" className="text-blue-600 hover:text-blue-800">Results</Link></li>
                    <li><Link to="/quality" className="text-blue-600 hover:text-blue-800">Quality</Link></li>
                  </>
                )}
                {(hasRole('Pathologist') || hasRole('Admin')) && (
                  <>
                    <li><Link to="/reports" className="text-blue-600 hover:text-blue-800">Reports</Link></li>
                    <li><Link to="/sign" className="text-blue-600 hover:text-blue-800">Sign</Link></li>
                  </>
                )}
                {hasRole('Admin') && (
                  <li><Link to="/admin" className="text-blue-600 hover:text-blue-800">Admin</Link></li>
                )}
              </ul>
              <button onClick={logout} className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">Logout</button>
            </>
          ) : (
            <Link to="/login" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Login</Link>
          )}
        </div>
      </nav>

      <main className="p-4">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Reception', 'Admin']} />}>
            <Route path="/patients" element={<PatientSearchPage />} />
            <Route path="/patients/:id" element={<PatientDetailPage />} />
            <Route path="/visits" element={<VisitsPage />} />
            <Route path="/delivery" element={<DeliveryPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['PathTech', 'Admin']} />}>
            <Route path="/samples" element={<SamplesPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/quality" element={<QualityPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Pathologist', 'Admin']} />}>
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/sign" element={<SignPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>

          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
