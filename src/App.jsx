import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Facilities from './pages/admin/Facilities';
import Users from './pages/admin/Users';
import ReportForm from './pages/reporter/ReportForm';
import Dashboard from './pages/monitor/Dashboard';

// Layout wrapper for authenticated pages
const AuthenticatedLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>{children}</main>
    </div>
  );
};

// Home redirect based on role
const HomeRedirect = () => {
  const { role, isAuthenticated } = useAuth();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

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
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public route - Login */}
          <Route path="/login" element={<Login />} />

          {/* Home route - redirect based on role */}
          <Route path="/" element={<HomeRedirect />} />

          {/* Admin routes */}
          <Route
            path="/admin/facilities"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AuthenticatedLayout>
                  <Facilities />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AuthenticatedLayout>
                  <Users />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          {/* Reporter route */}
          <Route
            path="/report"
            element={
              <ProtectedRoute allowedRoles={['REPORTER', 'ADMIN']}>
                <AuthenticatedLayout>
                  <ReportForm />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          {/* Monitor route */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['MONITOR', 'ADMIN']}>
                <AuthenticatedLayout>
                  <Dashboard />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          {/* 404 - Redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
