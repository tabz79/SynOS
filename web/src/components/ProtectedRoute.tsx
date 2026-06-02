import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAccessToken } from '../services/apiClient';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, hasRole } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // If not authenticated, redirect to login page
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userHasRequiredRole = allowedRoles.some(role => hasRole(role));
    if (!userHasRequiredRole) {
      // If user does not have required role, redirect to unauthorized page or dashboard
      return <Navigate to="/" replace />;
    }
  }

  // Workspaces claim checking (Admins bypass workspace checks)
  const token = getAccessToken();
  const isAdmin = hasRole('Admin');
  if (!isAdmin && token) {
    const decoded = parseJwt(token);
    const workspacesClaim = decoded?.workspaces || decoded?.["workspaces"];
    const workspaces: string[] = workspacesClaim ? workspacesClaim.split(',') : [];

    const currentPath = location.pathname;
    const cleanPath = currentPath.replace(/\/$/, "");

    const hasWorkspaceAccess = workspaces.some(wsRoute => {
      const cleanWs = wsRoute.replace(/\/$/, "");
      return cleanPath === cleanWs || cleanPath.startsWith(cleanWs + '/');
    });

    const isGlobalRoute = cleanPath === "/my-hr" || cleanPath.startsWith("/my-hr/");

    if (!isGlobalRoute && !hasWorkspaceAccess) {
      return (
        <div className="h-screen w-screen bg-card flex items-center justify-center text-textPrimary">
          <div className="text-center">
            <h1 className="text-xl font-bold text-red-500 mb-2">Access Denied</h1>
            <p className="text-textSecondary font-medium">You do not have workspace access permissions for '{currentPath}'.</p>
          </div>
        </div>
      );
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
