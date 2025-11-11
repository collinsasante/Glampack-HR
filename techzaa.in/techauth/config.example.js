// ========================================
// CONFIGURATION FILE
// ========================================
// Copy this file to config.js and add your actual API keys
// NEVER commit config.js to git - it's in .gitignore

const AIRTABLE_CONFIG = {
    apiKey: 'YOUR_AIRTABLE_API_KEY_HERE',
    baseId: 'YOUR_AIRTABLE_BASE_ID_HERE',
    employeesTable: 'Employees',
    tables: {
        employees: 'Employees',
        attendance: 'Attendance',
        leaveRequests: 'Leave%20Requests',
        announcements: 'Announcements',
        payroll: 'Payroll'
    }
};
