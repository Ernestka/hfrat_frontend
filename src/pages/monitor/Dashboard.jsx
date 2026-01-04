import { useState, useEffect, useMemo } from 'react';
import api from '../../api/axios';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, Area, AreaChart, RadarChart, Radar,
    PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Custom colors for charts
const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
const STATUS_COLORS = {
    critical: '#EF4444',
    noData: '#F59E0B',
    active: '#10B981'
};

const Dashboard = () => {
    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastRefresh, setLastRefresh] = useState(null);
    const [activeChart, setActiveChart] = useState('resources');
    const [exporting, setExporting] = useState(false);

    // Geographical filters
    const [selectedCountry, setSelectedCountry] = useState('');
    const [selectedCity, setSelectedCity] = useState('');

    // Get unique countries and cities for filter dropdowns
    const uniqueCountries = useMemo(() => {
        const countries = [...new Set(facilities.map(f => f.country).filter(Boolean))];
        return countries.sort();
    }, [facilities]);

    const uniqueCities = useMemo(() => {
        let filteredFacilities = facilities;
        if (selectedCountry) {
            filteredFacilities = facilities.filter(f => f.country === selectedCountry);
        }
        const cities = [...new Set(filteredFacilities.map(f => f.city).filter(Boolean))];
        return cities.sort();
    }, [facilities, selectedCountry]);

    // Filtered facilities based on selected country and city
    const filteredFacilities = useMemo(() => {
        let result = facilities;
        if (selectedCountry) {
            result = result.filter(f => f.country === selectedCountry);
        }
        if (selectedCity) {
            result = result.filter(f => f.city === selectedCity);
        }
        return result;
    }, [facilities, selectedCountry, selectedCity]);

    // Clear filters
    const clearFilters = () => {
        setSelectedCountry('');
        setSelectedCity('');
    };

    // Check if any filter is active
    const hasActiveFilters = selectedCountry || selectedCity;

    // Export to Excel function
    const exportToExcel = () => {
        setExporting(true);
        try {
            // Create workbook
            const wb = XLSX.utils.book_new();

            // Use filtered facilities for export
            const dataToExport = filteredFacilities;

            // Sheet 1: Facilities Overview
            const facilitiesData = dataToExport.map(f => ({
                'Facility Name': f.facility_name || 'N/A',
                'Country': f.country || 'N/A',
                'City': f.city || 'N/A',
                'ICU Beds Available': f.icu_beds_available ?? 'No data',
                'Ventilators Available': f.ventilators_available ?? 'No data',
                'Staff on Duty': f.staff_on_duty ?? 'No data',
                'Status': f.critical ? 'CRITICAL' : (f.last_update ? 'Active' : 'No Data'),
                'Last Update': f.last_update ? new Date(f.last_update).toLocaleString() : 'Never'
            }));
            const ws1 = XLSX.utils.json_to_sheet(facilitiesData);

            // Set column widths
            ws1['!cols'] = [
                { wch: 30 }, // Facility Name
                { wch: 15 }, // Country
                { wch: 15 }, // City
                { wch: 18 }, // ICU Beds
                { wch: 20 }, // Ventilators
                { wch: 15 }, // Staff
                { wch: 12 }, // Status
                { wch: 22 }  // Last Update
            ];
            XLSX.utils.book_append_sheet(wb, ws1, 'Facilities Overview');

            // Sheet 2: Summary Statistics
            const summaryData = [
                { 'Metric': 'Filter - Country', 'Value': selectedCountry || 'All Countries' },
                { 'Metric': 'Filter - City', 'Value': selectedCity || 'All Cities' },
                { 'Metric': 'Total Facilities', 'Value': dataToExport.length },
                { 'Metric': 'Critical Situations', 'Value': dataToExport.filter(f => f.critical).length },
                { 'Metric': 'No Data Reported', 'Value': dataToExport.filter(f => f.last_update === null).length },
                { 'Metric': 'Active Reports', 'Value': dataToExport.filter(f => f.last_update !== null).length },
                { 'Metric': 'Total ICU Beds', 'Value': dataToExport.reduce((sum, f) => sum + (f.icu_beds_available || 0), 0) },
                { 'Metric': 'Total Ventilators', 'Value': dataToExport.reduce((sum, f) => sum + (f.ventilators_available || 0), 0) },
                { 'Metric': 'Total Staff on Duty', 'Value': dataToExport.reduce((sum, f) => sum + (f.staff_on_duty || 0), 0) },
                { 'Metric': 'Report Generated', 'Value': new Date().toLocaleString() }
            ];
            const ws2 = XLSX.utils.json_to_sheet(summaryData);
            ws2['!cols'] = [{ wch: 25 }, { wch: 25 }];
            XLSX.utils.book_append_sheet(wb, ws2, 'Summary Statistics');

            // Sheet 3: Critical Facilities (if any)
            const criticalFacilities = dataToExport.filter(f => f.critical);
            if (criticalFacilities.length > 0) {
                const criticalData = criticalFacilities.map(f => ({
                    'Facility Name': f.facility_name || 'N/A',
                    'ICU Beds Available': f.icu_beds_available ?? 0,
                    'Ventilators Available': f.ventilators_available ?? 0,
                    'Staff on Duty': f.staff_on_duty ?? 0,
                    'Last Update': f.last_update ? new Date(f.last_update).toLocaleString() : 'Never'
                }));
                const ws3 = XLSX.utils.json_to_sheet(criticalData);
                ws3['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 20 }, { wch: 15 }, { wch: 22 }];
                XLSX.utils.book_append_sheet(wb, ws3, 'Critical Facilities');
            }

            // Generate Excel file
            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            // Create filename with date
            const date = new Date();
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const timeStr = `${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}`;
            saveAs(data, `HFRAT_Dashboard_Report_${dateStr}_${timeStr}.xlsx`);
        } catch (err) {
            console.error('Error exporting to Excel:', err);
            alert('Failed to export. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    // Fetch dashboard data
    const fetchDashboard = async () => {
        try {
            const response = await api.get('/monitor/dashboard');
            setFacilities(response.data.facilities || []);
            setLastRefresh(new Date());
            setError(null);
        } catch (err) {
            console.error('Error fetching dashboard:', err);
            setError('Failed to load dashboard. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Computed chart data - uses filteredFacilities
    const chartData = useMemo(() => {
        // Resource comparison by facility
        const resourceData = filteredFacilities.map(f => ({
            name: f.facility_name?.length > 15 ? f.facility_name.substring(0, 15) + '...' : f.facility_name,
            fullName: f.facility_name,
            'ICU Beds': f.icu_beds_available || 0,
            'Ventilators': f.ventilators_available || 0,
            'Staff': f.staff_on_duty || 0,
        }));

        // Status distribution for pie chart
        const criticalCount = filteredFacilities.filter(f => f.critical).length;
        const noDataCount = filteredFacilities.filter(f => f.last_update === null).length;
        const activeCount = filteredFacilities.filter(f => f.last_update !== null && !f.critical).length;

        const statusData = [
            { name: 'Critical', value: criticalCount, color: STATUS_COLORS.critical },
            { name: 'No Data', value: noDataCount, color: STATUS_COLORS.noData },
            { name: 'Active', value: activeCount, color: STATUS_COLORS.active },
        ].filter(item => item.value > 0);

        // Total resources
        const totalICU = filteredFacilities.reduce((sum, f) => sum + (f.icu_beds_available || 0), 0);
        const totalVentilators = filteredFacilities.reduce((sum, f) => sum + (f.ventilators_available || 0), 0);
        const totalStaff = filteredFacilities.reduce((sum, f) => sum + (f.staff_on_duty || 0), 0);

        const totalResourceData = [
            { name: 'ICU Beds', value: totalICU, fill: COLORS[0] },
            { name: 'Ventilators', value: totalVentilators, fill: COLORS[1] },
            { name: 'Staff on Duty', value: totalStaff, fill: COLORS[2] },
        ];

        // Radar data for facility comparison
        const radarData = filteredFacilities.slice(0, 5).map(f => ({
            facility: f.facility_name?.length > 10 ? f.facility_name.substring(0, 10) + '...' : f.facility_name,
            icuBeds: f.icu_beds_available || 0,
            ventilators: f.ventilators_available || 0,
            staff: f.staff_on_duty || 0,
        }));

        return { resourceData, statusData, totalResourceData, radarData };
    }, [filteredFacilities]);

    // Fetch on component mount
    useEffect(() => {
        fetchDashboard();
    }, []);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            fetchDashboard();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (facility) => {
        if (facility.critical) {
            return 'bg-red-50 border-l-4 border-red-500';
        }
        if (facility.last_update === null) {
            return 'bg-yellow-50 border-l-4 border-yellow-500';
        }
        return 'hover:bg-gray-50';
    };

    const getICUBedsBadge = (icuBeds, isCritical) => {
        if (isCritical) {
            return (
                <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                    {icuBeds} - CRITICAL
                </span>
            );
        }
        if (icuBeds === null) {
            return (
                <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                    No data
                </span>
            );
        }
        return (
            <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                {icuBeds}
            </span>
        );
    };

    const getWarningLevel = (value) => {
        if (value === null) {
            return 'text-gray-400 font-medium';
        }
        if (value === 0) {
            return 'text-red-600 font-semibold';
        }
        if (value <= 3) {
            return 'text-orange-600 font-semibold';
        }
        return 'text-gray-900';
    };

    const formatTime = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const getTimeSinceUpdate = (dateString) => {
        if (!dateString) return 'No data';
        const date = new Date(dateString);
        const now = new Date();
        const minutes = Math.floor((now - date) / 60000);

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
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading dashboard...</p>
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
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                <span>Resource Monitoring</span>
                            </h1>
                            <p className="mt-3 text-lg text-gray-600">Real-time facility resource availability monitoring</p>
                        </div>
                        <div className="flex items-center gap-4">
                            {/* Export Button */}
                            <button
                                onClick={exportToExcel}
                                disabled={exporting || facilities.length === 0}
                                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg shadow-md hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {exporting ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Exporting...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <span>Export to Excel</span>
                                    </>
                                )}
                            </button>
                            {/* Last Refresh Info */}
                            <div className="bg-white rounded-lg shadow-md p-4 text-right">
                                <p className="text-sm font-semibold text-gray-900">
                                    {lastRefresh ? lastRefresh.toLocaleTimeString() : 'N/A'}
                                </p>
                                <p className="text-xs text-indigo-600 mt-1 font-medium">Auto-refreshes every 30s</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-md">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-700 font-medium">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Geographical Filters */}
                <div className="mb-6 bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h3 className="text-lg font-semibold text-gray-900">Filter by Region</h3>
                            {hasActiveFilters && (
                                <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                                    Filters Active
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                            {/* Country Filter */}
                            <div className="flex items-center gap-2">
                                <label htmlFor="country-filter" className="text-sm font-medium text-gray-700">
                                    Country:
                                </label>
                                <select
                                    id="country-filter"
                                    value={selectedCountry}
                                    onChange={(e) => {
                                        setSelectedCountry(e.target.value);
                                        setSelectedCity(''); // Reset city when country changes
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-w-[180px]"
                                >
                                    <option value="">All Countries</option>
                                    {uniqueCountries.map(country => (
                                        <option key={country} value={country}>{country}</option>
                                    ))}
                                </select>
                            </div>

                            {/* City Filter */}
                            <div className="flex items-center gap-2">
                                <label htmlFor="city-filter" className="text-sm font-medium text-gray-700">
                                    City:
                                </label>
                                <select
                                    id="city-filter"
                                    value={selectedCity}
                                    onChange={(e) => setSelectedCity(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-w-[180px]"
                                >
                                    <option value="">All Cities</option>
                                    {uniqueCities.map(city => (
                                        <option key={city} value={city}>{city}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Clear Filters Button */}
                            {hasActiveFilters && (
                                <button
                                    onClick={clearFilters}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Active Filter Summary */}
                    {hasActiveFilters && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-600">
                                Showing <span className="font-semibold text-indigo-600">{filteredFacilities.length}</span> of{' '}
                                <span className="font-semibold">{facilities.length}</span> facilities
                                {selectedCountry && <span> in <span className="font-semibold">{selectedCountry}</span></span>}
                                {selectedCity && <span>, <span className="font-semibold">{selectedCity}</span></span>}
                            </p>
                        </div>
                    )}
                </div>

                {/* Dashboard Stats */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                    {/* Total Facilities */}
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-sm font-semibold uppercase">Total Facilities</p>
                                <p className="text-4xl font-bold text-gray-900 mt-2">{filteredFacilities.length}</p>
                            </div>
                            <div className="bg-indigo-100 rounded-lg p-3">
                                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Critical Situations */}
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-sm font-semibold uppercase">Critical Situations</p>
                                <p className="text-4xl font-bold text-red-600 mt-2">
                                    {filteredFacilities.filter(f => f.critical).length}
                                </p>
                            </div>
                            <div className="bg-red-100 rounded-lg p-3">
                                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v2m0 4v2M6.938 5.172A9 9 0 0117.172 17.172a9 9 0 01-11.234 0M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* No Data Reports */}
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-sm font-semibold uppercase">No Data Reported</p>
                                <p className="text-4xl font-bold text-yellow-600 mt-2">
                                    {filteredFacilities.filter(f => f.last_update === null).length}
                                </p>
                            </div>
                            <div className="bg-yellow-100 rounded-lg p-3">
                                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Active Reports */}
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-sm font-semibold uppercase">Active Reports</p>
                                <p className="text-4xl font-bold text-green-600 mt-2">
                                    {filteredFacilities.filter(f => f.last_update !== null).length}
                                </p>
                            </div>
                            <div className="bg-green-100 rounded-lg p-3">
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Interactive Charts Section */}
                <div className="mb-8">
                    {/* Chart Navigation Tabs */}
                    <div className="bg-white rounded-t-xl shadow-lg border border-gray-200 border-b-0">
                        <div className="px-6 py-4 flex flex-wrap gap-2">
                            <button
                                onClick={() => setActiveChart('resources')}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${activeChart === 'resources'
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                📊 Resource Comparison
                            </button>
                            <button
                                onClick={() => setActiveChart('status')}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${activeChart === 'status'
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                🥧 Status Distribution
                            </button>
                            <button
                                onClick={() => setActiveChart('totals')}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${activeChart === 'totals'
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                📈 Total Resources
                            </button>
                            <button
                                onClick={() => setActiveChart('radar')}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${activeChart === 'radar'
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                🎯 Facility Radar
                            </button>
                        </div>
                    </div>

                    {/* Chart Container */}
                    <div className="bg-white rounded-b-xl shadow-lg border border-gray-200 p-6">
                        {/* Resource Comparison Bar Chart */}
                        {activeChart === 'resources' && (
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="text-2xl">📊</span>
                                    Resource Availability by Facility
                                </h3>
                                <p className="text-sm text-gray-500 mb-6">
                                    Compare ICU beds, ventilators, and staff across all facilities. Hover over bars for details.
                                </p>
                                {chartData.resourceData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={400}>
                                        <BarChart data={chartData.resourceData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                            <XAxis
                                                dataKey="name"
                                                angle={-45}
                                                textAnchor="end"
                                                height={80}
                                                tick={{ fontSize: 12, fill: '#6B7280' }}
                                            />
                                            <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#fff',
                                                    border: '1px solid #E5E7EB',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                                                }}
                                                labelFormatter={(value, payload) => payload[0]?.payload?.fullName || value}
                                            />
                                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                            <Bar dataKey="ICU Beds" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="Ventilators" fill="#10B981" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="Staff" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="text-center py-12 text-gray-500">
                                        No facility data available for chart
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Status Distribution Pie Chart */}
                        {activeChart === 'status' && (
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="text-2xl">🥧</span>
                                    Facility Status Distribution
                                </h3>
                                <p className="text-sm text-gray-500 mb-6">
                                    Overview of facility health status. Click on segments for details.
                                </p>
                                <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
                                    {chartData.statusData.length > 0 ? (
                                        <>
                                            <ResponsiveContainer width="100%" height={350}>
                                                <PieChart>
                                                    <Pie
                                                        data={chartData.statusData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={80}
                                                        outerRadius={140}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                        labelLine={true}
                                                    >
                                                        {chartData.statusData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        formatter={(value, name) => [`${value} facilities`, name]}
                                                        contentStyle={{
                                                            backgroundColor: '#fff',
                                                            border: '1px solid #E5E7EB',
                                                            borderRadius: '8px'
                                                        }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="flex flex-col gap-3">
                                                {chartData.statusData.map((item, index) => (
                                                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                                        <div
                                                            className="w-4 h-4 rounded-full"
                                                            style={{ backgroundColor: item.color }}
                                                        />
                                                        <span className="font-medium text-gray-700">{item.name}</span>
                                                        <span className="text-lg font-bold text-gray-900">{item.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center py-12 text-gray-500">
                                            No status data available
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Total Resources Area Chart */}
                        {activeChart === 'totals' && (
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="text-2xl">📈</span>
                                    Total Resource Overview
                                </h3>
                                <p className="text-sm text-gray-500 mb-6">
                                    Aggregated view of all available resources across facilities.
                                </p>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Total Resources Bar */}
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={chartData.totalResourceData} layout="vertical" margin={{ left: 40 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                            <XAxis type="number" tick={{ fontSize: 12, fill: '#6B7280' }} />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                tick={{ fontSize: 14, fill: '#374151', fontWeight: 500 }}
                                                width={120}
                                            />
                                            <Tooltip
                                                formatter={(value) => [`${value} available`, 'Total']}
                                                contentStyle={{
                                                    backgroundColor: '#fff',
                                                    border: '1px solid #E5E7EB',
                                                    borderRadius: '8px'
                                                }}
                                            />
                                            <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                                                {chartData.totalResourceData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>

                                    {/* Resource Cards */}
                                    <div className="grid grid-cols-1 gap-4">
                                        {chartData.totalResourceData.map((item, index) => (
                                            <div
                                                key={index}
                                                className="p-6 rounded-xl border-2 transition-all hover:shadow-lg"
                                                style={{ borderColor: item.fill, backgroundColor: `${item.fill}10` }}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-700 font-semibold">{item.name}</span>
                                                    <span
                                                        className="text-3xl font-bold"
                                                        style={{ color: item.fill }}
                                                    >
                                                        {item.value}
                                                    </span>
                                                </div>
                                                <div className="mt-2 text-sm text-gray-500">
                                                    Available across {facilities.length} facilities
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Radar Chart for Facility Comparison */}
                        {activeChart === 'radar' && (
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="text-2xl">🎯</span>
                                    Facility Resource Radar
                                </h3>
                                <p className="text-sm text-gray-500 mb-6">
                                    Multi-dimensional comparison of top 5 facilities. Each axis represents a resource type.
                                </p>
                                {chartData.radarData.length > 0 ? (
                                    <div className="flex flex-col lg:flex-row items-center gap-8">
                                        <ResponsiveContainer width="100%" height={400}>
                                            <RadarChart data={chartData.radarData}>
                                                <PolarGrid stroke="#E5E7EB" />
                                                <PolarAngleAxis
                                                    dataKey="facility"
                                                    tick={{ fontSize: 12, fill: '#374151' }}
                                                />
                                                <PolarRadiusAxis
                                                    angle={90}
                                                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                                />
                                                <Radar
                                                    name="ICU Beds"
                                                    dataKey="icuBeds"
                                                    stroke="#4F46E5"
                                                    fill="#4F46E5"
                                                    fillOpacity={0.3}
                                                />
                                                <Radar
                                                    name="Ventilators"
                                                    dataKey="ventilators"
                                                    stroke="#10B981"
                                                    fill="#10B981"
                                                    fillOpacity={0.3}
                                                />
                                                <Radar
                                                    name="Staff"
                                                    dataKey="staff"
                                                    stroke="#F59E0B"
                                                    fill="#F59E0B"
                                                    fillOpacity={0.3}
                                                />
                                                <Legend />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: '#fff',
                                                        border: '1px solid #E5E7EB',
                                                        borderRadius: '8px'
                                                    }}
                                                />
                                            </RadarChart>
                                        </ResponsiveContainer>

                                        {/* Facility Legend */}
                                        <div className="flex flex-col gap-2 min-w-[200px]">
                                            <h4 className="font-semibold text-gray-700 mb-2">Facilities Shown:</h4>
                                            {chartData.radarData.map((item, index) => (
                                                <div
                                                    key={index}
                                                    className="p-2 bg-gray-50 rounded-lg text-sm text-gray-600"
                                                >
                                                    {item.facility}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-gray-500">
                                        No facility data available for radar chart
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Facilities Table */}
                <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
                    <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span>All Facilities</span>
                        </h2>
                    </div>

                    {facilities.length === 0 ? (
                        <div className="px-6 py-12 text-center">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <p className="mt-4 text-gray-500 font-medium">No facilities available</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Facility
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Location
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            ICU Beds
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Ventilators
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Staff on Duty
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Last Updated
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredFacilities.map((facility) => (
                                        <tr key={facility.facility_id} className={`transition ${getStatusColor(facility)}`}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-bold text-gray-900">
                                                    {facility.facility_name}
                                                </div>
                                                <div className="text-xs text-gray-500">ID: {facility.facility_id}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900 font-medium">
                                                    {facility.city || facility.location || 'N/A'}
                                                </div>
                                                {facility.country && (
                                                    <div className="text-xs text-gray-500">{facility.country}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getICUBedsBadge(facility.icu_beds_available, facility.critical)}
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${getWarningLevel(facility.ventilators_available)}`}>
                                                {facility.ventilators_available ?? 'No data'}
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${getWarningLevel(facility.staff_on_duty)}`}>
                                                {facility.staff_on_duty ?? 'No data'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {getTimeSinceUpdate(facility.last_update)}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {facility.last_update ? formatTime(facility.last_update) : 'Never'}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Legend */}
            <div className="mt-8 bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center space-x-2">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Status Legend</span>
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex-shrink-0">
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-red-100 text-red-800">
                                ⚠️ CRITICAL
                            </span>
                        </div>
                        <p className="text-sm text-red-700 font-medium">ICU beds at zero (critical shortage)</p>
                    </div>
                    <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="flex-shrink-0">
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-yellow-100 text-yellow-800">
                                ⚡ NO DATA
                            </span>
                        </div>
                        <p className="text-sm text-yellow-700 font-medium">Facility has not submitted any reports</p>
                    </div>
                    <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex-shrink-0">
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-green-100 text-green-800">
                                ✓ AVAILABLE
                            </span>
                        </div>
                        <p className="text-sm text-green-700 font-medium">Resources available at facility</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
