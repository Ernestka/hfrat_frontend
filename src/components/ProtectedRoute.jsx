import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const { user, role, isAuthenticated, loading } = useAuth();

    // Show loading state while checking authentication
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }

    // Check if user has required role
    if (allowedRoles.length > 0 && !allowedRoles.includes(role?.toUpperCase())) {
        // Redirect to appropriate dashboard based on user's role
        switch (role?.toUpperCase()) {
            case 'ADMIN':
                return <Navigate to="/admin/facilities" replace />;
            case 'REPORTER':
                return <Navigate to="/report" replace />;
            case 'MONITOR':
                return <Navigate to="/dashboard" replace />;
            default:
                return <Navigate to="/login" replace />;
        }
    }

    // User is authenticated and has correct role
    return children;
};

export default ProtectedRoute;
