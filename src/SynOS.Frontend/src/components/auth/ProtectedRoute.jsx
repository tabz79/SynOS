import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export function ProtectedRoute({ allowedRoles = [] }) {
    const { user, isAuthenticated, isConfigured } = useAuth();
    const location = useLocation();

    if (!isConfigured) {
        return <Navigate to="/activate" replace />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    const isAdmin = Array.isArray(user?.role) ? user.role.includes('Admin') : user?.role === 'Admin';

    const hasRole = Array.isArray(user?.role)
        ? user.role.some(r => allowedRoles.includes(r))
        : allowedRoles.includes(user?.role);

    if (allowedRoles.length > 0 && !hasRole) {
        const displayedRole = Array.isArray(user?.role) ? user.role.join(', ') : user?.role;
        return (
            <div className="h-screen w-screen bg-synos-background flex items-center justify-center text-white">
                <div className="text-center">
                    <h1 className="text-xl font-bold text-red-500 mb-2">Access Denied</h1>
                    <p className="text-zinc-500">Role '{displayedRole}' is not authorized for this workspace.</p>
                </div>
            </div>
        );
    }

    // Check workspace-based access (Admins bypass all workspace restrictions)
    if (!isAdmin) {
        const currentPath = location.pathname;
        const cleanPath = currentPath.replace(/\/$/, "");
        const hasWorkspaceAccess = user?.workspaces?.some(wsRoute => {
            const cleanWs = wsRoute.replace(/\/$/, "");
            return cleanPath === cleanWs || cleanPath.startsWith(cleanWs + '/');
        });

        // Global/HR routes accessible to all authenticated users
        const isGlobalRoute = cleanPath === "/my-hr" || cleanPath.startsWith("/my-hr/");

        if (!isGlobalRoute && !hasWorkspaceAccess) {
            return (
                <div className="h-screen w-screen bg-synos-background flex items-center justify-center text-white">
                    <div className="text-center">
                        <h1 className="text-xl font-bold text-red-500 mb-2">Access Denied</h1>
                        <p className="text-zinc-500 font-medium">You do not have workspace access permissions for '{currentPath}'.</p>
                    </div>
                </div>
            );
        }
    }

    return <Outlet />;
}
