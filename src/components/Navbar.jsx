import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const Navbar = () => {
    const { user, role, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="bg-gradient-to-r from-indigo-600 to-indigo-700 shadow-xl border-b border-indigo-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Left side - Logo and navigation */}
                    <div className="flex">
                        {/* Logo */}
                        <div className="flex-shrink-0 flex items-center">
                            <Link to="/" className="text-xl font-bold text-white hover:text-indigo-100 transition-colors flex items-center space-x-2">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <span>HFRAT System</span>
                            </Link>
                        </div>

                        {/* Navigation links */}
                        <div className="hidden sm:ml-8 sm:flex sm:space-x-2">
                            {/* Admin links */}
                            {role?.toUpperCase() === 'ADMIN' && (
                                <>
                                    <Link
                                        to="/admin/facilities"
                                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 rounded-lg transition-colors"
                                    >
                                        Facilities
                                    </Link>
                                    <Link
                                        to="/admin/users"
                                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 rounded-lg transition-colors"
                                    >
                                        Users
                                    </Link>
                                    <Link
                                        to="/dashboard"
                                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 rounded-lg transition-colors"
                                    >
                                        Dashboard
                                    </Link>
                                </>
                            )}

                            {/* Reporter links */}
                            {role?.toUpperCase() === 'REPORTER' && (
                                <Link
                                    to="/report"
                                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 rounded-lg transition-colors"
                                >
                                    Submit Report
                                </Link>
                            )}

                            {/* Monitor links */}
                            {role?.toUpperCase() === 'MONITOR' && (
                                <Link
                                    to="/dashboard"
                                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 rounded-lg transition-colors"
                                >
                                    Dashboard
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Right side - User info and logout */}
                    <div className="flex items-center space-x-4">
                        {/* User info */}
                        <div className="hidden md:flex items-center space-x-3 border-r border-indigo-500 pr-4">
                            <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-indigo-300 rounded-full flex items-center justify-center">
                                    <span className="text-indigo-900 text-sm font-bold">
                                        {user?.email?.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <div className="text-sm">
                                    <p className="font-medium text-white">{user?.email}</p>
                                    <p className="text-xs text-indigo-200">{role}</p>
                                </div>
                            </div>
                        </div>

                        {/* Logout button */}
                        <button
                            onClick={handleLogout}
                            className="inline-flex items-center px-4 py-2 border border-indigo-300 text-sm font-medium rounded-lg text-white bg-indigo-500 hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-300 transition-colors"
                        >
                            <svg
                                className="w-4 h-4 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                />
                            </svg>
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile navigation */}
            <div className="sm:hidden border-t border-gray-200">
                <div className="px-2 pt-2 pb-3 space-y-1">
                    {/* Admin mobile links */}
                    {role === 'ADMIN' && (
                        <>
                            <Link
                                to="/admin/facilities"
                                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50 rounded-md"
                            >
                                Facilities
                            </Link>
                            <Link
                                to="/admin/users"
                                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50 rounded-md"
                            >
                                Users
                            </Link>
                            <Link
                                to="/dashboard"
                                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50 rounded-md"
                            >
                                Dashboard
                            </Link>
                        </>
                    )}

                    {/* Reporter mobile links */}
                    {role === 'REPORTER' && (
                        <Link
                            to="/report"
                            className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50 rounded-md"
                        >
                            Submit Report
                        </Link>
                    )}

                    {/* Monitor mobile links */}
                    {role === 'MONITOR' && (
                        <Link
                            to="/dashboard"
                            className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50 rounded-md"
                        >
                            Dashboard
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
