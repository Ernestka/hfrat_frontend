import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import api from '../../api/axios';

const ReportForm = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [facilityName, setFacilityName] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        facility_id: user?.facility_id || '',
        icu_beds_available: '',
        ventilators_available: '',
        staff_on_duty: '',
    });

    const [formErrors, setFormErrors] = useState({});

    // Fetch latest report on component mount
    useEffect(() => {
        fetchLatestReport();
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

    const fetchLatestReport = async () => {
        try {
            setLoading(true);
            const response = await api.get('/reporter/reports/me');

            if (response.data.report) {
                const report = response.data.report;
                setFormData(prev => ({
                    ...prev,
                    icu_beds_available: report.icu_beds_available ?? '',
                    ventilators_available: report.ventilators_available ?? '',
                    staff_on_duty: report.staff_on_duty ?? '',
                }));
                setLastUpdated(new Date(report.updated_at));
            }
            if (response.data.facility) {
                setFacilityName(response.data.facility.name || '');
            }
            setError(null);
        } catch (err) {
            console.log('No existing report found');
        } finally {
            setLoading(false);
        }
    };

    const validateForm = () => {
        const errors = {};

        if (formData.icu_beds_available === '') {
            errors.icu_beds_available = 'ICU beds available is required';
        } else {
            const icuBeds = parseInt(formData.icu_beds_available);
            if (isNaN(icuBeds) || icuBeds < 0) {
                errors.icu_beds_available = 'Must be a non-negative integer';
            }
        }

        if (formData.ventilators_available === '') {
            errors.ventilators_available = 'Ventilators available is required';
        } else {
            const ventilators = parseInt(formData.ventilators_available);
            if (isNaN(ventilators) || ventilators < 0) {
                errors.ventilators_available = 'Must be a non-negative integer';
            }
        }

        if (formData.staff_on_duty === '') {
            errors.staff_on_duty = 'Staff on duty is required';
        } else {
            const staff = parseInt(formData.staff_on_duty);
            if (isNaN(staff) || staff < 0) {
                errors.staff_on_duty = 'Must be a non-negative integer';
            }
        }

        return errors;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        if (name !== 'facility_id' && value !== '') {
            if (!/^\d+$/.test(value)) {
                return;
            }
        }

        setFormData(prev => ({ ...prev, [name]: value }));

        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormErrors({});
        setError(null);
        setSuccess(null);

        const errors = validateForm();
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setSubmitting(true);

        try {
            const payload = {
                facility_id: parseInt(formData.facility_id),
                icu_beds_available: parseInt(formData.icu_beds_available),
                ventilators_available: parseInt(formData.ventilators_available),
                staff_on_duty: parseInt(formData.staff_on_duty),
            };

            const response = await api.post('/reporter/reports', payload);
            setLastUpdated(new Date(response.data.report.updated_at));
            setSuccess('Report submitted successfully!');

            setTimeout(() => {
                fetchLatestReport();
            }, 1000);
        } catch (err) {
            console.error('Error submitting report:', err);
            if (err.response?.data?.error) {
                setError(err.response.data.error);
            } else if (err.response?.data?.errors) {
                setFormErrors(err.response.data.errors);
            } else {
                setError('Failed to submit report. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const getTimeSinceUpdate = () => {
        if (!lastUpdated) return null;
        const now = new Date();
        const minutes = Math.floor((now - lastUpdated) / 60000);

        if (minutes === 0) return 'Just now';
        if (minutes === 1) return '1 minute ago';
        if (minutes < 60) return `${minutes} minutes ago`;

        const hours = Math.floor(minutes / 60);
        if (hours === 1) return '1 hour ago';
        if (hours < 24) return `${hours} hours ago`;

        const days = Math.floor(hours / 24);
        if (days === 1) return '1 day ago';
        return `${days} days ago`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading report form...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900 flex items-center space-x-3">
                                <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span>Resource Report</span>
                            </h1>
                            <p className="mt-3 text-lg text-gray-600">Submit current resource availability for your facility</p>
                        </div>
                        {lastUpdated && (
                            <div className="bg-white rounded-lg shadow-md p-4 text-right">
                                <p className="text-sm font-semibold text-gray-900">Last Report</p>
                                <p className="text-xs text-indigo-600 mt-1 font-medium">{getTimeSinceUpdate()}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Success Message */}
                {success && (
                    <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg shadow-md animate-fade-in">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <svg className="h-6 w-6 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-green-800">{success}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-md">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <svg className="h-6 w-6 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-red-800">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Form */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                            {/* Form Header */}
                            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6">
                                <h2 className="text-xl font-bold text-white">Submit Resource Report</h2>
                                <p className="text-indigo-100 mt-1">Enter current availability numbers</p>
                            </div>

                            {/* Facility Info */}
                            <div className="px-8 py-4 bg-indigo-50 border-b border-indigo-100">
                                <div className="flex items-center gap-3">
                                    <div className="bg-indigo-100 rounded-lg p-2">
                                        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm text-indigo-600 font-medium">Your Assigned Facility</p>
                                        <p className="text-lg font-bold text-gray-900">{facilityName || `Facility #${formData.facility_id}`}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Form Content */}
                            <form onSubmit={handleSubmit} className="p-8 space-y-8">
                                {/* ICU Beds */}
                                <div className="group">
                                    <label htmlFor="icu_beds_available" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                                        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-600">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                            </svg>
                                        </span>
                                        ICU Beds Available
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            id="icu_beds_available"
                                            name="icu_beds_available"
                                            value={formData.icu_beds_available}
                                            onChange={handleInputChange}
                                            inputMode="numeric"
                                            className={`w-full px-5 py-4 border-2 ${formErrors.icu_beds_available
                                                ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-200'
                                                : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-200'
                                                } rounded-xl focus:outline-none focus:ring-4 text-xl font-medium transition-all`}
                                            placeholder="Enter number"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300">
                                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                            </svg>
                                        </div>
                                    </div>
                                    {formErrors.icu_beds_available && (
                                        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            {formErrors.icu_beds_available}
                                        </p>
                                    )}
                                </div>

                                {/* Ventilators */}
                                <div className="group">
                                    <label htmlFor="ventilators_available" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                                        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-600">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                                            </svg>
                                        </span>
                                        Ventilators Available
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            id="ventilators_available"
                                            name="ventilators_available"
                                            value={formData.ventilators_available}
                                            onChange={handleInputChange}
                                            inputMode="numeric"
                                            className={`w-full px-5 py-4 border-2 ${formErrors.ventilators_available
                                                ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-200'
                                                : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-200'
                                                } rounded-xl focus:outline-none focus:ring-4 text-xl font-medium transition-all`}
                                            placeholder="Enter number"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300">
                                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                                            </svg>
                                        </div>
                                    </div>
                                    {formErrors.ventilators_available && (
                                        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            {formErrors.ventilators_available}
                                        </p>
                                    )}
                                </div>

                                {/* Staff on Duty */}
                                <div className="group">
                                    <label htmlFor="staff_on_duty" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                                        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-100 text-purple-600">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                        </span>
                                        Staff on Duty
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            id="staff_on_duty"
                                            name="staff_on_duty"
                                            value={formData.staff_on_duty}
                                            onChange={handleInputChange}
                                            inputMode="numeric"
                                            className={`w-full px-5 py-4 border-2 ${formErrors.staff_on_duty
                                                ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-200'
                                                : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-200'
                                                } rounded-xl focus:outline-none focus:ring-4 text-xl font-medium transition-all`}
                                            placeholder="Enter number"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300">
                                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                    </div>
                                    {formErrors.staff_on_duty && (
                                        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            {formErrors.staff_on_duty}
                                        </p>
                                    )}
                                </div>

                                {/* Submit Button */}
                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className={`w-full py-4 px-6 rounded-xl text-white font-bold text-lg shadow-lg transition-all transform ${submitting
                                            ? 'bg-gray-400 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl hover:-translate-y-0.5'
                                            }`}
                                    >
                                        {submitting ? (
                                            <span className="flex items-center justify-center gap-3">
                                                <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Submitting Report...
                                            </span>
                                        ) : (
                                            <span className="flex items-center justify-center gap-2">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Submit Report
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Right Column - Info Cards */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Current Stats Card */}
                        {(formData.icu_beds_available || formData.ventilators_available || formData.staff_on_duty) && (
                            <div className="bg-white rounded-2xl shadow-xl p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    Current Values
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                                        <span className="text-sm font-medium text-gray-700">ICU Beds</span>
                                        <span className="text-2xl font-bold text-blue-600">{formData.icu_beds_available || '-'}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                                        <span className="text-sm font-medium text-gray-700">Ventilators</span>
                                        <span className="text-2xl font-bold text-green-600">{formData.ventilators_available || '-'}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                                        <span className="text-sm font-medium text-gray-700">Staff</span>
                                        <span className="text-2xl font-bold text-purple-600">{formData.staff_on_duty || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Instructions Card */}
                        <div className="bg-white rounded-2xl shadow-xl p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Instructions
                            </h3>
                            <ul className="space-y-3 text-sm text-gray-600">
                                <li className="flex items-start gap-2">
                                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Enter current resource availability
                                </li>
                                <li className="flex items-start gap-2">
                                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    All fields require whole numbers
                                </li>
                                <li className="flex items-start gap-2">
                                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Each submission updates your report
                                </li>
                                <li className="flex items-start gap-2">
                                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Reports are critical for planning
                                </li>
                            </ul>
                        </div>

                        {/* Quick Tips Card */}
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
                            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                Quick Tips
                            </h3>
                            <ul className="space-y-2 text-sm text-indigo-100">
                                <li>• Update reports regularly for accuracy</li>
                                <li>• Zero values are valid for shortages</li>
                                <li>• Contact admin for facility changes</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportForm;
