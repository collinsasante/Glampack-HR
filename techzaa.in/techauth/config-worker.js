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
        announcementComments: '/api/announcement-comments',
        announcementReads: '/api/announcement-reads',
        payroll: '/api/payroll',
        medicalClaims: '/api/medical-claims',
        emergencyContacts: '/api/emergency-contacts'
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
    // Add cache-busting parameter for GET requests
    let url = `${API_CONFIG.workerUrl}${endpoint}${queryParams}`;

    if (method === 'GET') {
        const separator = url.includes('?') ? '&' : '?';
        url += `${separator}_t=${Date.now()}`;
    }

    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
        },
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);

        if (!response.ok) {
            const error = await response.json();

            throw new Error(JSON.stringify(error.error || error) || `API request failed with status ${response.status}`);
        }

        return response.json();
    } catch (error) {

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
 * Get a specific attendance record by ID
 * @param {string} recordId - Airtable record ID
 * @returns {Promise<object>} Attendance record
 */
async function getAttendanceRecord(recordId) {
    return workerRequest(`${API_CONFIG.endpoints.attendance}/${recordId}`, 'GET');
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

/**
 * Update an announcement
 * @param {string} recordId - Airtable record ID
 * @param {object} fields - Updated announcement data
 * @returns {Promise<object>} Updated announcement record
 */
async function updateAnnouncement(recordId, fields) {
    return workerRequest(`${API_CONFIG.endpoints.announcements}/${recordId}`, 'PATCH', { fields });
}

/**
 * Delete an announcement
 * @param {string} recordId - Airtable record ID
 * @returns {Promise<object>} Deleted announcement record
 */
async function deleteAnnouncementRecord(recordId) {
    return workerRequest(`${API_CONFIG.endpoints.announcements}/${recordId}`, 'DELETE');
}

// ========================================
// ANNOUNCEMENT COMMENTS API
// ========================================

/**
 * Get announcement comments
 * @param {string} filterFormula - Airtable filter formula (optional)
 * @returns {Promise<object>} Announcement comment records
 */
async function getAnnouncementComments(filterFormula = null) {
    const queryParams = filterFormula
        ? `?filterByFormula=${encodeURIComponent(filterFormula)}`
        : '';
    return workerRequest(API_CONFIG.endpoints.announcementComments, 'GET', null, queryParams);
}

/**
 * Create an announcement comment
 * @param {object} fields - Comment data
 * @returns {Promise<object>} Created comment record
 */
async function createAnnouncementComment(fields) {
    return workerRequest(API_CONFIG.endpoints.announcementComments, 'POST', { fields });
}

/**
 * Delete an announcement comment
 * @param {string} recordId - Airtable record ID
 * @returns {Promise<object>} Deleted comment record
 */
async function deleteAnnouncementComment(recordId) {
    return workerRequest(`${API_CONFIG.endpoints.announcementComments}/${recordId}`, 'DELETE');
}

// ========================================
// ANNOUNCEMENT READS API
// ========================================

/**
 * Get announcement reads (who viewed announcements)
 * @param {string} filterFormula - Airtable filter formula (optional)
 * @returns {Promise<object>} Announcement read records
 */
async function getAnnouncementReads(filterFormula = null) {
    const queryParams = filterFormula
        ? `?filterByFormula=${encodeURIComponent(filterFormula)}`
        : '';
    return workerRequest(API_CONFIG.endpoints.announcementReads, 'GET', null, queryParams);
}

/**
 * Create an announcement read record
 * @param {object} fields - Read data
 * @returns {Promise<object>} Created read record
 */
async function createAnnouncementRead(fields) {
    return workerRequest(API_CONFIG.endpoints.announcementReads, 'POST', { fields });
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

/**
 * Create a payroll record
 * @param {object} fields - Payroll data
 * @returns {Promise<object>} Created payroll record
 */
async function createPayroll(fields) {
    return workerRequest(API_CONFIG.endpoints.payroll, 'POST', { fields });
}

/**
 * Update a payroll record
 * @param {string} recordId - Airtable record ID
 * @param {object} fields - Updated payroll data
 * @returns {Promise<object>} Updated payroll record
 */
async function updatePayroll(recordId, fields) {
    return workerRequest(`${API_CONFIG.endpoints.payroll}/${recordId}`, 'PATCH', { fields });
}

/**
 * Delete a payroll record
 * @param {string} recordId - Airtable record ID
 * @returns {Promise<object>} Deletion confirmation
 */
async function deletePayroll(recordId) {
    return workerRequest(`${API_CONFIG.endpoints.payroll}/${recordId}`, 'DELETE');
}

// ========================================
// MEDICAL CLAIMS API
// ========================================

/**
 * Get medical claims
 * @param {string} filterFormula - Airtable filter formula (optional)
 * @returns {Promise<object>} Medical claim records
 */
async function getMedicalClaims(filterFormula = null) {
    const queryParams = filterFormula
        ? `?filterByFormula=${encodeURIComponent(filterFormula)}`
        : '';
    return workerRequest(API_CONFIG.endpoints.medicalClaims, 'GET', null, queryParams);
}

/**
 * Create a medical claim
 * @param {object} fields - Medical claim data
 * @returns {Promise<object>} Created medical claim record
 */
async function createMedicalClaim(fields) {
    return workerRequest(API_CONFIG.endpoints.medicalClaims, 'POST', { fields });
}

/**
 * Update a medical claim (e.g., approve/reject)
 * @param {string} recordId - Airtable record ID
 * @param {object} fields - Updated medical claim data
 * @returns {Promise<object>} Updated medical claim record
 */
async function updateMedicalClaim(recordId, fields) {
    return workerRequest(`${API_CONFIG.endpoints.medicalClaims}/${recordId}`, 'PATCH', { fields });
}

// ========================================
// EMERGENCY CONTACTS API
// ========================================

/**
 * Get emergency contacts
 * @param {string} filterFormula - Airtable filter formula (optional)
 * @returns {Promise<object>} Emergency contact records
 */
async function getEmergencyContacts(filterFormula = null) {
    const queryParams = filterFormula
        ? `?filterByFormula=${encodeURIComponent(filterFormula)}`
        : '';
    return workerRequest(API_CONFIG.endpoints.emergencyContacts, 'GET', null, queryParams);
}

/**
 * Get a specific emergency contact by ID
 * @param {string} recordId - Airtable record ID
 * @returns {Promise<object>} Emergency contact record
 */
async function getEmergencyContact(recordId) {
    return workerRequest(`${API_CONFIG.endpoints.emergencyContacts}/${recordId}`, 'GET');
}

/**
 * Create an emergency contact
 * @param {object} fields - Emergency contact data
 * @returns {Promise<object>} Created emergency contact record
 */
async function createEmergencyContact(fields) {
    return workerRequest(API_CONFIG.endpoints.emergencyContacts, 'POST', { fields });
}

/**
 * Update an emergency contact
 * @param {string} recordId - Airtable record ID
 * @param {object} fields - Updated emergency contact data
 * @returns {Promise<object>} Updated emergency contact record
 */
async function updateEmergencyContact(recordId, fields) {
    return workerRequest(`${API_CONFIG.endpoints.emergencyContacts}/${recordId}`, 'PATCH', { fields });
}

/**
 * Delete an emergency contact
 * @param {string} recordId - Airtable record ID
 * @returns {Promise<object>} Deletion confirmation
 */
async function deleteEmergencyContact(recordId) {
    return workerRequest(`${API_CONFIG.endpoints.emergencyContacts}/${recordId}`, 'DELETE');
}

// ========================================
// IP LOOKUP API
// ========================================

/**
 * Get IP location information via Worker proxy
 * @returns {Promise<object>} IP location data
 */
async function getIPLocation() {
    try {
        const response = await fetch(`${API_CONFIG.workerUrl}/api/iplookup`);
        if (!response.ok) {
            throw new Error('Failed to fetch IP location');
        }
        return response.json();
    } catch (error) {

        throw error;
    }
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
        payroll: 'Payroll',
        medicalClaims: 'Medical Claims'
    }
};

