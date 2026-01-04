import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Helper function to decode JWT payload
const decodeToken = (token) => {
    try {
        const payload = token.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        return decoded;
    } catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    // Load auth state from localStorage on mount
    useEffect(() => {
        const storedToken = localStorage.getItem('access_token');
        const storedUser = localStorage.getItem('user');
        const storedRole = localStorage.getItem('role');

        if (storedToken && storedUser && storedRole) {
            // Verify token is not expired
            const decoded = decodeToken(storedToken);
            if (decoded && decoded.exp * 1000 > Date.now()) {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
                setRole(storedRole);
            } else {
                // Token expired, clear storage
                logout();
            }
        }
        setLoading(false);
    }, []);

    // Login function - stores auth data
    const login = (accessToken, userData, userRole) => {
        setToken(accessToken);
        setUser(userData);
        setRole(userRole);

        // Persist to localStorage
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('role', userRole);
    };

    // Secure logout - clears all auth data
    const logout = () => {
        setToken(null);
        setUser(null);
        setRole(null);

        // Clear all auth-related data from localStorage
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        localStorage.removeItem('role');
    };

    // Check if user is authenticated
    const isAuthenticated = () => {
        return !!token && !!user && !!role;
    };

    // Check if token is expired
    const isTokenExpired = () => {
        if (!token) return true;
        const decoded = decodeToken(token);
        if (!decoded || !decoded.exp) return true;
        return decoded.exp * 1000 < Date.now();
    };

    const value = {
        user,
        role,
        token,
        login,
        logout,
        isAuthenticated,
        isTokenExpired,
        loading,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
