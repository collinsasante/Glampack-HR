// Configuration for Cloudflare Worker API
// This replaces the old config.js file with API keys
// All API calls now go through the Cloudflare Worker which stores credentials securely

const API_CONFIG = {
    // Cloudflare Worker URL for secure API proxy
    workerUrl: 'https://glampack-hr-api.mr-asanteeprog.workers.dev',

    // API endpoints
    endpoints: {
        employees: '/api/employees',
        attendance: '/api/attendance',
        leaveRequests: '/api/leave-requests',
        announcements: '/api/announcements',
        payroll: '/api/payroll'
    }
};

// ========================================
// WORKER API HELPER FUNCTIONS
// ========================================

/**
 * Make a request to the Cloudflare Worker API
 * @param {string} endpoint - API endpoint (e.g., '/api/employees')
 * @param {string} method - HTTP method (GET, POST, PATCH, DELETE)
 * @param {object} body - Request body (for POST/PATCH)
 * @param {string} queryParams - URL query parameters
 * @returns {Promise<object>} Response data
 */
async function workerRequest(endpoint, method = 'GET', body = null, queryParams = '') {
    const url = `${API_CONFIG.workerUrl}${endpoint}${queryParams}`;

    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `API request failed with status ${response.status}`);
        }

        return response.json();
    } catch (error) {
        console.error('Worker API Error:', error);
        throw error;
    }
}

// ========================================
// EMPLOYEES API
// ========================================

/**
 * Get all employees or filter by criteria
 * @param {string} filterFormula - Airtable filter formula (optional)
 * @returns {Promise<object>} Employee records
 */
async function getEmployees(filterFormula = null) {
    const queryParams = filterFormula
        ? `?filterByFormula=${encodeURIComponent(filterFormula)}`
        : '';
    return workerRequest(API_CONFIG.endpoints.employees, 'GET', null, queryParams);
}

/**
 * Get a specific employee by ID
 * @param {string} recordId - Airtable record ID
 * @returns {Promise<object>} Employee record
 */
async function getEmployee(recordId) {
    return workerRequest(`${API_CONFIG.endpoints.employees}/${recordId}`, 'GET');
}

/**
 * Create a new employee
 * @param {object} fields - Employee data
 * @returns {Promise<object>} Created employee record
 */
async function createEmployee(fields) {
    return workerRequest(API_CONFIG.endpoints.employees, 'POST', { fields });
}

/**
 * Update an employee
 * @param {string} recordId - Airtable record ID
 * @param {object} fields - Updated employee data
 * @returns {Promise<object>} Updated employee record
 */
async function updateEmployee(recordId, fields) {
    return workerRequest(`${API_CONFIG.endpoints.employees}/${recordId}`, 'PATCH', { fields });
}

/**
 * Delete an employee
 * @param {string} recordId - Airtable record ID
 * @returns {Promise<object>} Deletion confirmation
 */
async function deleteEmployee(recordId) {
    return workerRequest(`${API_CONFIG.endpoints.employees}/${recordId}`, 'DELETE');
}

// ========================================
// ATTENDANCE API
// ========================================

/**
 * Get attendance records
 * @param {string} filterFormula - Airtable filter formula (optional)
 * @returns {Promise<object>} Attendance records
 */
async function getAttendance(filterFormula = null) {
    const queryParams = filterFormula
        ? `?filterByFormula=${encodeURIComponent(filterFormula)}`
        : '';
    return workerRequest(API_CONFIG.endpoints.attendance, 'GET', null, queryParams);
}

/**
 * Create an attendance record
 * @param {object} fields - Attendance data
 * @returns {Promise<object>} Created attendance record
 */
async function createAttendance(fields) {
    return workerRequest(API_CONFIG.endpoints.attendance, 'POST', { fields });
}

/**
 * Update an attendance record
 * @param {string} recordId - Airtable record ID
 * @param {object} fields - Updated attendance data
 * @returns {Promise<object>} Updated attendance record
 */
async function updateAttendance(recordId, fields) {
    return workerRequest(`${API_CONFIG.endpoints.attendance}/${recordId}`, 'PATCH', { fields });
}

// ========================================
// LEAVE REQUESTS API
// ========================================

/**
 * Get leave requests
 * @param {string} filterFormula - Airtable filter formula (optional)
 * @returns {Promise<object>} Leave request records
 */
async function getLeaveRequests(filterFormula = null) {
    const queryParams = filterFormula
        ? `?filterByFormula=${encodeURIComponent(filterFormula)}`
        : '';
    return workerRequest(API_CONFIG.endpoints.leaveRequests, 'GET', null, queryParams);
}

/**
 * Create a leave request
 * @param {object} fields - Leave request data
 * @returns {Promise<object>} Created leave request record
 */
async function createLeaveRequest(fields) {
    return workerRequest(API_CONFIG.endpoints.leaveRequests, 'POST', { fields });
}

/**
 * Update a leave request (e.g., approve/reject)
 * @param {string} recordId - Airtable record ID
 * @param {object} fields - Updated leave request data
 * @returns {Promise<object>} Updated leave request record
 */
async function updateLeaveRequest(recordId, fields) {
    return workerRequest(`${API_CONFIG.endpoints.leaveRequests}/${recordId}`, 'PATCH', { fields });
}

// ========================================
// ANNOUNCEMENTS API
// ========================================

/**
 * Get all announcements
 * @returns {Promise<object>} Announcement records
 */
async function getAnnouncements() {
    return workerRequest(API_CONFIG.endpoints.announcements, 'GET');
}

/**
 * Create an announcement
 * @param {object} fields - Announcement data
 * @returns {Promise<object>} Created announcement record
 */
async function createAnnouncement(fields) {
    return workerRequest(API_CONFIG.endpoints.announcements, 'POST', { fields });
}

// ========================================
// PAYROLL API
// ========================================

/**
 * Get payroll records
 * @param {string} filterFormula - Airtable filter formula (optional)
 * @returns {Promise<object>} Payroll records
 */
async function getPayroll(filterFormula = null) {
    const queryParams = filterFormula
        ? `?filterByFormula=${encodeURIComponent(filterFormula)}`
        : '';
    return workerRequest(API_CONFIG.endpoints.payroll, 'GET', null, queryParams);
}

// ========================================
// BACKWARD COMPATIBILITY
// ========================================
// For legacy code that expects AIRTABLE_CONFIG object
// This allows old code to work with the new Worker-based system

const AIRTABLE_CONFIG = {
    // These are dummy values for backward compatibility
    // The actual API calls go through the Worker
    apiKey: 'WORKER_PROXY',
    baseId: 'WORKER_PROXY',
    employeesTable: 'Employees',
    tables: {
        employees: 'Employees',
        attendance: 'Attendance',
        leaveRequests: 'Leave Requests',
        announcements: 'Announcements',
        payroll: 'Payroll'
    }
};

console.log('✅ Cloudflare Worker API Configuration Loaded');
console.log('🔒 API credentials are secured in Cloudflare environment variables');
