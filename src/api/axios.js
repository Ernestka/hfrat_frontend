import axios from 'axios';

/**
 * API Configuration
 * 
 * IMPORTANT: Vite embeds environment variables at build time, not runtime.
 * If you change VITE_API_URL in .env, you MUST restart the Vite dev server
 * for the new value to take effect. This is because Vite statically replaces
 * import.meta.env.* references during the build/dev compilation step.
 * 
 * The /api prefix is appended automatically here so that .env only needs
 * the base backend URL (e.g., http://localhost:5000)
 */
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const baseURL = `${API_BASE}/api`;

// Create axios instance with base configuration
const api = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // 10 second timeout for requests
});

// Request interceptor - attach JWT token to all requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handle 401 errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Clear stored auth data
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');

            // Redirect to login page
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
