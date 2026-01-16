import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export function ProtectedRoute({ allowedRoles = [] }) {
    const { user, isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return (
            <div className="h-screen w-screen bg-synos-background flex items-center justify-center text-white">
                <div className="text-center">
                    <h1 className="text-xl font-bold text-red-500 mb-2">Access Denied</h1>
                    <p className="text-zinc-500">Role '{user.role}' is not authorized for this workspace.</p>
                </div>
            </div>
        );
    }

    return <Outlet />;
}
