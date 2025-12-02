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
// CACHING LAYER
// ========================================

/**
 * Cache for API responses to reduce rate limiting issues
 * Uses in-memory storage with TTL (time-to-live)
 */
const API_CACHE = {
    data: new Map(),

    // Default TTL: 5 minutes for most data
    // Shorter TTL for frequently changing data
    ttls: {
        employees: 5 * 60 * 1000,        // 5 minutes
        announcements: 2 * 60 * 1000,    // 2 minutes
        announcementComments: 1 * 60 * 1000, // 1 minute
        announcementReads: 1 * 60 * 1000,    // 1 minute
        attendance: 2 * 60 * 1000,       // 2 minutes
        leaveRequests: 3 * 60 * 1000,    // 3 minutes
        payroll: 5 * 60 * 1000,          // 5 minutes
        default: 5 * 60 * 1000           // 5 minutes default
    },

    /**
     * Generate cache key from endpoint and query params
     */
    getCacheKey(endpoint, queryParams = '') {
        return `${endpoint}${queryParams}`;
    },

    /**
     * Get TTL for specific endpoint
     */
    getTTL(endpoint) {
        for (const [key, ttl] of Object.entries(this.ttls)) {
            if (endpoint.includes(key)) {
                return ttl;
            }
        }
        return this.ttls.default;
    },

    /**
     * Store data in cache with TTL
     */
    set(key, value, ttl = null) {
        const actualTTL = ttl || this.getTTL(key);
        this.data.set(key, {
            value,
            expires: Date.now() + actualTTL
        });
    },

    /**
     * Get data from cache if not expired
     */
    get(key) {
        const item = this.data.get(key);
        if (!item) return null;

        // Check if expired
        if (Date.now() > item.expires) {
            this.data.delete(key);
            return null;
        }

        return item.value;
    },

    /**
     * Invalidate cache entries matching pattern
     * Used when data is created/updated/deleted
     */
    invalidate(pattern) {
        for (const key of this.data.keys()) {
            if (key.includes(pattern)) {
                this.data.delete(key);
            }
        }
    },

    /**
     * Clear all cache
     */
    clear() {
        this.data.clear();
    }
};

// ========================================
// WORKER API HELPER FUNCTIONS
// ========================================

/**
 * Make a request to the Cloudflare Worker API with retry logic and caching
 * @param {string} endpoint - API endpoint (e.g., '/api/employees')
 * @param {string} method - HTTP method (GET, POST, PATCH, DELETE)
 * @param {object} body - Request body (for POST/PATCH)
 * @param {string} queryParams - URL query parameters
 * @param {number} retries - Number of retry attempts (default: 3)
 * @returns {Promise<object>} Response data
 */
async function workerRequest(endpoint, method = 'GET', body = null, queryParams = '', retries = 3) {
    // Generate cache key for this request
    const cacheKey = API_CACHE.getCacheKey(endpoint, queryParams);

    // Check cache for GET requests
    if (method === 'GET') {
        const cached = API_CACHE.get(cacheKey);
        if (cached) {
            console.log(`Cache HIT: ${cacheKey}`);
            return cached;
        }
    }

    // Build URL (no cache-busting timestamp needed with caching layer)
    let url = `${API_CONFIG.workerUrl}${endpoint}${queryParams}`;

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

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                // Handle rate limiting (429) with exponential backoff
                if (response.status === 429 && attempt < retries) {
                    const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10 seconds
                    console.warn(`Rate limited (429), retrying in ${backoffDelay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, backoffDelay));
                    continue;
                }

                // Handle connection errors with retry
                if ((response.status === 0 || response.status >= 500) && attempt < retries) {
                    const backoffDelay = Math.min(2000 * Math.pow(2, attempt), 15000); // Max 15 seconds
                    console.warn(`Connection error (${response.status}), retrying in ${backoffDelay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, backoffDelay));
                    continue;
                }

                const error = await response.json().catch(() => ({ message: 'Unknown error' }));
                throw new Error(JSON.stringify(error.error || error) || `API request failed with status ${response.status}`);
            }

            const data = await response.json();

            // Cache GET responses
            if (method === 'GET') {
                API_CACHE.set(cacheKey, data);
                console.log(`Cache MISS: ${cacheKey} - stored in cache`);
            }

            // Invalidate related cache entries for mutations
            if (method === 'POST' || method === 'PATCH' || method === 'DELETE') {
                // Extract base endpoint for cache invalidation
                const baseEndpoint = endpoint.split('/').slice(0, 3).join('/');
                API_CACHE.invalidate(baseEndpoint);
                console.log(`Cache invalidated for: ${baseEndpoint}`);
            }

            return data;
        } catch (error) {
            // Network errors (ERR_CONNECTION_CLOSED, etc.)
            if (attempt < retries && (error.name === 'TypeError' || error.message.includes('fetch'))) {
                const backoffDelay = Math.min(2000 * Math.pow(2, attempt), 15000);
                console.warn(`Network error, retrying in ${backoffDelay}ms...`, error.message);
                await new Promise(resolve => setTimeout(resolve, backoffDelay));
                continue;
            }

            throw error;
        }
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

// ========================================
// BIRTHDAY WISHES API
// ========================================

/**
 * Get birthday wishes
 * @param {string} filterFormula - Airtable filter formula (optional)
 * @returns {Promise<object>} Birthday wish records
 */
async function getBirthdayWishes(filterFormula = null) {
    const endpoint = '/api/birthday-wishes';
    const queryParams = filterFormula
        ? `?filterByFormula=${encodeURIComponent(filterFormula)}`
        : '';
    return workerRequest(endpoint, 'GET', null, queryParams);
}

/**
 * Create a birthday wish
 * @param {object} fields - Birthday wish data
 * @returns {Promise<object>} Created birthday wish record
 */
async function createBirthdayWish(fields) {
    const endpoint = '/api/birthday-wishes';
    return workerRequest(endpoint, 'POST', { fields });
}

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
        medicalClaims: 'Medical Claims',
        birthdayWishes: 'Birthday Wishes'
    }
};

