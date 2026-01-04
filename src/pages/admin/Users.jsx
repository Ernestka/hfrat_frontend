import { useState, useEffect, useMemo } from 'react';
import api from '../../api/axios';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [showForm, setShowForm] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        role: 'reporter',
        country: '',
        city: '',
        facility_id: '',
    });
    const [formErrors, setFormErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    // Get unique countries from facilities
    const uniqueCountries = useMemo(() => {
        const countries = [...new Set(facilities.map(f => f.country).filter(Boolean))];
        return countries.sort();
    }, [facilities]);

    // Get unique cities based on selected country
    const uniqueCities = useMemo(() => {
        let filteredFacilities = facilities;
        if (formData.country) {
            filteredFacilities = facilities.filter(f => f.country === formData.country);
        }
        const cities = [...new Set(filteredFacilities.map(f => f.city).filter(Boolean))];
        return cities.sort();
    }, [facilities, formData.country]);

    // Get filtered facilities based on country and city
    const filteredFacilities = useMemo(() => {
        let result = facilities;
        if (formData.country) {
            result = result.filter(f => f.country === formData.country);
        }
        if (formData.city) {
            result = result.filter(f => f.city === formData.city);
        }
        return result;
    }, [facilities, formData.country, formData.city]);

    // Fetch users and facilities on component mount
    useEffect(() => {
        fetchUsers();
        fetchFacilities();
    }, []);

    // Auto-dismiss messages after 5 seconds
    useEffect(() => {
        if (success || error) {
            const timer = setTimeout(() => {
                setSuccess(null);
                setError(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [success, error]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/users');
            setUsers(response.data.users || []);
            setError(null);
        } catch (err) {
            console.error('Error fetching users:', err);
            setError('Failed to load users. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const fetchFacilities = async () => {
        try {
            const response = await api.get('/admin/facilities');
            setFacilities(response.data.facilities || []);
        } catch (err) {
            console.error('Error fetching facilities:', err);
        }
    };

    const validateForm = () => {
        const errors = {};

        // Email validation
        if (!formData.email.trim()) {
            errors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            errors.email = 'Email is invalid';
        }

        // Password validation
        if (!formData.password) {
            errors.password = 'Password is required';
        } else if (formData.password.length < 8) {
            errors.password = 'Password must be at least 8 characters';
        } else if (!/[A-Z]/.test(formData.password)) {
            errors.password = 'Password must contain at least one uppercase letter';
        } else if (!/[a-z]/.test(formData.password)) {
            errors.password = 'Password must contain at least one lowercase letter';
        } else if (!/[0-9]/.test(formData.password)) {
            errors.password = 'Password must contain at least one number';
        } else if (!/[!@#$%^&*]/.test(formData.password)) {
            errors.password = 'Password must contain at least one special character (!@#$%^&*)';
        }

        // Role validation
        if (!formData.role) {
            errors.role = 'Role is required';
        }

        // Facility validation for reporters
        if (formData.role === 'reporter' && !formData.facility_id) {
            errors.facility_id = 'Facility is required for reporters';
        }

        return errors;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const updated = { ...prev, [name]: value };

            // Clear facility_id if role is not reporter
            if (name === 'role' && value !== 'reporter') {
                updated.facility_id = '';
                updated.country = '';
                updated.city = '';
            }

            // Reset city and facility when country changes
            if (name === 'country') {
                updated.city = '';
                updated.facility_id = '';
            }

            // Reset facility when city changes
            if (name === 'city') {
                updated.facility_id = '';
            }

            return updated;
        });

        // Clear error for this field
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormErrors({});
        setError(null);
        setSuccess(null);

        // Validate form
        const errors = validateForm();
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setSubmitting(true);

        try {
            // Prepare payload
            const payload = {
                email: formData.email,
                password: formData.password,
                role: formData.role,
            };

            // Add facility_id only if role is reporter
            if (formData.role === 'reporter' && formData.facility_id) {
                payload.facility_id = parseInt(formData.facility_id);
            }

            const response = await api.post('/admin/users', payload);

            // Add new user to the list
            setUsers(prev => [...prev, response.data.user]);

            // Reset form
            setFormData({ email: '', password: '', role: 'reporter', country: '', city: '', facility_id: '' });
            setShowForm(false);
            setSuccess(`User "${response.data.user.email}" created successfully!`);
        } catch (err) {
            console.error('Error creating user:', err);
            if (err.response?.data?.error) {
                setError(err.response.data.error);
            } else if (err.response?.data?.errors) {
                setFormErrors(err.response.data.errors);
            } else {
                setError('Failed to create user. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        setShowForm(false);
        setFormData({ email: '', password: '', role: 'reporter', country: '', city: '', facility_id: '' });
        setFormErrors({});
    };

    const getRoleBadgeColor = (role) => {
        switch (role.toUpperCase()) {
            case 'ADMIN':
                return 'bg-purple-100 text-purple-800';
            case 'REPORTER':
                return 'bg-blue-100 text-blue-800';
            case 'MONITOR':
                return 'bg-green-100 text-green-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getFacilityName = (facilityId) => {
        const facility = facilities.find(f => f.id === facilityId);
        return facility ? facility.name : 'N/A';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading users...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900 flex items-center space-x-3">
                                <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                <span>Users Management</span>
                            </h1>
                            <p className="mt-3 text-lg text-gray-600">Manage system users, roles, and facility assignments</p>
                        </div>
                        {!showForm && (
                            <button
                                onClick={() => setShowForm(true)}
                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:-translate-y-0.5"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                                Add New User
                            </button>
                        )}
                    </div>
                </div>

                {/* Success Message */}
                {success && (
                    <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg shadow-md">
                        <div className="flex items-center">
                            <svg className="h-6 w-6 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <p className="ml-3 text-sm font-medium text-green-800">{success}</p>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-md">
                        <div className="flex items-center">
                            <svg className="h-6 w-6 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <p className="ml-3 text-sm font-medium text-red-800">{error}</p>
                        </div>
                    </div>
                )}

                {/* Add User Form */}
                {showForm && (
                    <div className="mb-8 bg-white rounded-2xl shadow-xl overflow-hidden">
                        {/* Form Header */}
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                                Create New User
                            </h2>
                            <p className="text-indigo-100 mt-1">Fill in the details to add a new user to the system</p>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8">
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                {/* Email */}
                                <div className="lg:col-span-2">
                                    <label htmlFor="email" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                        <span className="flex items-center justify-center w-6 h-6 rounded bg-indigo-100 text-indigo-600">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                        </span>
                                        Email Address
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className={`w-full px-4 py-3 border-2 ${formErrors.email
                                            ? 'border-red-400 bg-red-50'
                                            : 'border-gray-200 focus:border-indigo-500'
                                            } rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-200 transition-all`}
                                        placeholder="user@example.com"
                                    />
                                    {formErrors.email && (
                                        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            {formErrors.email}
                                        </p>
                                    )}
                                </div>

                                {/* Password */}
                                <div className="lg:col-span-2">
                                    <label htmlFor="password" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                        <span className="flex items-center justify-center w-6 h-6 rounded bg-amber-100 text-amber-600">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                        </span>
                                        Temporary Password
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="password"
                                        id="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        className={`w-full px-4 py-3 border-2 ${formErrors.password
                                            ? 'border-red-400 bg-red-50'
                                            : 'border-gray-200 focus:border-indigo-500'
                                            } rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-200 transition-all`}
                                        placeholder="Min 8 chars, uppercase, number, special char"
                                    />
                                    {formErrors.password && (
                                        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            {formErrors.password}
                                        </p>
                                    )}
                                    <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Must include: 8+ chars, uppercase, lowercase, number, special char (!@#$%^&*)
                                    </p>
                                </div>

                                {/* Role */}
                                <div>
                                    <label htmlFor="role" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                        <span className="flex items-center justify-center w-6 h-6 rounded bg-purple-100 text-purple-600">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                            </svg>
                                        </span>
                                        User Role
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="role"
                                        name="role"
                                        value={formData.role}
                                        onChange={handleInputChange}
                                        className={`w-full px-4 py-3 border-2 ${formErrors.role
                                            ? 'border-red-400 bg-red-50'
                                            : 'border-gray-200 focus:border-indigo-500'
                                            } rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-200 transition-all bg-white`}
                                    >
                                        <option value="reporter">📋 Reporter</option>
                                        <option value="monitor">📊 Monitor</option>
                                        <option value="admin">👑 Admin</option>
                                    </select>
                                    {formErrors.role && (
                                        <p className="mt-2 text-sm text-red-600">{formErrors.role}</p>
                                    )}
                                </div>

                                {/* Role Description */}
                                <div className="flex items-center">
                                    <div className={`px-4 py-3 rounded-xl w-full ${formData.role === 'admin' ? 'bg-purple-50 border-2 border-purple-200' :
                                        formData.role === 'monitor' ? 'bg-green-50 border-2 border-green-200' :
                                            'bg-blue-50 border-2 border-blue-200'
                                        }`}>
                                        <p className={`text-sm font-medium ${formData.role === 'admin' ? 'text-purple-800' :
                                            formData.role === 'monitor' ? 'text-green-800' :
                                                'text-blue-800'
                                            }`}>
                                            {formData.role === 'admin' && '👑 Full system access, can manage users & facilities'}
                                            {formData.role === 'monitor' && '📊 View dashboard, monitor all facilities'}
                                            {formData.role === 'reporter' && '📋 Submit reports for assigned facility'}
                                        </p>
                                    </div>
                                </div>

                                {/* Reporter-only fields */}
                                {formData.role === 'reporter' && (
                                    <>
                                        {/* Divider */}
                                        <div className="lg:col-span-2 border-t border-gray-200 pt-6">
                                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                </svg>
                                                Facility Assignment
                                            </h3>
                                            <p className="text-sm text-gray-500 mt-1">Select the facility this reporter will be assigned to</p>
                                        </div>

                                        {/* Country */}
                                        <div>
                                            <label htmlFor="country" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                                <span className="flex items-center justify-center w-6 h-6 rounded bg-emerald-100 text-emerald-600">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </span>
                                                Country
                                            </label>
                                            <select
                                                id="country"
                                                name="country"
                                                value={formData.country}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 border-2 border-gray-200 focus:border-indigo-500 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-200 transition-all bg-white"
                                            >
                                                <option value="">All Countries</option>
                                                {uniqueCountries.map(country => (
                                                    <option key={country} value={country}>{country}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* City */}
                                        <div>
                                            <label htmlFor="city" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                                <span className="flex items-center justify-center w-6 h-6 rounded bg-cyan-100 text-cyan-600">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                </span>
                                                City
                                            </label>
                                            <select
                                                id="city"
                                                name="city"
                                                value={formData.city}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 border-2 border-gray-200 focus:border-indigo-500 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-200 transition-all bg-white"
                                            >
                                                <option value="">All Cities</option>
                                                {uniqueCities.map(city => (
                                                    <option key={city} value={city}>{city}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Hospital/Facility */}
                                        <div className="lg:col-span-2">
                                            <label htmlFor="facility_id" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                                <span className="flex items-center justify-center w-6 h-6 rounded bg-rose-100 text-rose-600">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                    </svg>
                                                </span>
                                                Hospital / Facility
                                                <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                id="facility_id"
                                                name="facility_id"
                                                value={formData.facility_id}
                                                onChange={handleInputChange}
                                                className={`w-full px-4 py-3 border-2 ${formErrors.facility_id
                                                    ? 'border-red-400 bg-red-50'
                                                    : 'border-gray-200 focus:border-indigo-500'
                                                    } rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-200 transition-all bg-white`}
                                            >
                                                <option value="">Select a facility</option>
                                                {filteredFacilities.map(facility => (
                                                    <option key={facility.id} value={facility.id}>
                                                        🏥 {facility.name} {facility.city && facility.country ? `(${facility.city}, ${facility.country})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            {formErrors.facility_id && (
                                                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                    {formErrors.facility_id}
                                                </p>
                                            )}
                                            {filteredFacilities.length === 0 && (
                                                <p className="mt-2 text-sm text-amber-600 flex items-center gap-1">
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                    No facilities found. Try changing the country/city filter or add a facility first.
                                                </p>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Form Actions */}
                            <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    disabled={submitting}
                                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className={`px-8 py-3 rounded-xl text-white font-bold shadow-lg transition-all transform ${submitting
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:-translate-y-0.5'
                                        }`}
                                >
                                    {submitting ? (
                                        <span className="flex items-center gap-2">
                                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Creating...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                            </svg>
                                            Create User
                                        </span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-sm font-semibold uppercase">Total Users</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">{users.length}</p>
                            </div>
                            <div className="bg-indigo-100 rounded-lg p-3">
                                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-sm font-semibold uppercase">Reporters</p>
                                <p className="text-3xl font-bold text-blue-600 mt-1">{users.filter(u => u.role === 'reporter').length}</p>
                            </div>
                            <div className="bg-blue-100 rounded-lg p-3">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-sm font-semibold uppercase">Monitors & Admins</p>
                                <p className="text-3xl font-bold text-purple-600 mt-1">{users.filter(u => u.role !== 'reporter').length}</p>
                            </div>
                            <div className="bg-purple-100 rounded-lg p-3">
                                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                            All Users
                            <span className="ml-2 px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-full">{users.length}</span>
                        </h2>
                    </div>

                    {users.length === 0 ? (
                        <div className="px-8 py-16 text-center">
                            <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            <p className="mt-4 text-lg font-medium text-gray-500">No users found</p>
                            <p className="text-sm text-gray-400 mt-1">Click "Add New User" to create your first user</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            User
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Role
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Facility
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Created
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {users.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50 transition">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${user.role === 'admin' ? 'bg-purple-100' :
                                                        user.role === 'monitor' ? 'bg-green-100' : 'bg-blue-100'
                                                        }`}>
                                                        <span className={`text-sm font-bold ${user.role === 'admin' ? 'text-purple-600' :
                                                            user.role === 'monitor' ? 'text-green-600' : 'text-blue-600'
                                                            }`}>
                                                            {user.email.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-bold text-gray-900">{user.email}</div>
                                                        <div className="text-xs text-gray-500">ID: {user.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${getRoleBadgeColor(user.role)}`}>
                                                    {user.role === 'admin' && '👑 '}
                                                    {user.role === 'monitor' && '📊 '}
                                                    {user.role === 'reporter' && '📋 '}
                                                    {user.role.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {user.facility_id ? (
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{getFacilityName(user.facility_id)}</div>
                                                        <div className="text-xs text-gray-500">
                                                            {facilities.find(f => f.id === user.facility_id)?.city}, {facilities.find(f => f.id === user.facility_id)?.country}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(user.created_at).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Users;
