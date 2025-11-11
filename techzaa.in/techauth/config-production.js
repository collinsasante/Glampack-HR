// ========================================
// PRODUCTION CONFIGURATION
// ========================================
// This file uses environment variables from Cloudflare Pages
// Values are injected at build/runtime

const AIRTABLE_CONFIG = {
    // In development, these come from config.js
    // In production (Cloudflare), these are set via build script or Workers
    apiKey: window.ENV_AIRTABLE_API_KEY || 'YOUR_AIRTABLE_API_KEY',
    baseId: window.ENV_AIRTABLE_BASE_ID || 'YOUR_AIRTABLE_BASE_ID',
    employeesTable: 'Employees',
    tables: {
        employees: 'Employees',
        attendance: 'Attendance',
        leaveRequests: 'Leave%20Requests',
        announcements: 'Announcements',
        payroll: 'Payroll'
    }
};

// For debugging - remove in production
console.log('Config loaded:', {
    hasApiKey: !!AIRTABLE_CONFIG.apiKey && AIRTABLE_CONFIG.apiKey !== 'YOUR_AIRTABLE_API_KEY',
    hasBaseId: !!AIRTABLE_CONFIG.baseId && AIRTABLE_CONFIG.baseId !== 'YOUR_AIRTABLE_BASE_ID'
});
