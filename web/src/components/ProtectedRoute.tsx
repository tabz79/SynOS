import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, user, logout, hasRole } = useAuth();

  if (!isAuthenticated) {
    // If not authenticated, redirect to login page
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userHasRequiredRole = allowedRoles.some(role => hasRole(role));
    if (!userHasRequiredRole) {
      // If user does not have required role, redirect to unauthorized page or dashboard
      // For now, let's redirect to home/dashboard
      return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
