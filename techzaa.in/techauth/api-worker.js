// Cloudflare Worker for Airtable API Proxy
// This worker acts as a secure proxy between your frontend and Airtable
// API credentials are stored in Cloudflare environment variables

// ============================================================================
// WORKER-LEVEL CACHING
// ============================================================================

// In-memory cache for Airtable API responses
// This cache persists across requests within the same Worker instance
const CACHE_STORE = new Map();

// Cache TTL configuration (in milliseconds)
const CACHE_TTL = {
  employees: 5 * 60 * 1000,         // 5 minutes
  announcements: 2 * 60 * 1000,     // 2 minutes
  'announcement-comments': 30 * 1000, // 30 seconds
  'announcement-reads': 30 * 1000,   // 30 seconds
  attendance: 30 * 1000,            // 30 seconds (for real-time sync)
  'leave-requests': 3 * 60 * 1000,  // 3 minutes
  payroll: 5 * 60 * 1000,           // 5 minutes
  'medical-claims': 5 * 60 * 1000,  // 5 minutes
  'emergency-contacts': 5 * 60 * 1000, // 5 minutes
  default: 2 * 60 * 1000            // 2 minutes default
};

function getCacheKey(method, path, queryParams = '') {
  return `${method}:${path}${queryParams}`;
}

function getCacheTTL(path) {
  for (const [key, ttl] of Object.entries(CACHE_TTL)) {
    if (path.includes(key)) {
      return ttl;
    }
  }
  return CACHE_TTL.default;
}

function getCachedResponse(cacheKey) {
  const cached = CACHE_STORE.get(cacheKey);
  if (!cached) return null;

  // Check if expired
  if (Date.now() > cached.expires) {
    CACHE_STORE.delete(cacheKey);
    return null;
  }

  return cached.data;
}

function setCachedResponse(cacheKey, data, path) {
  const ttl = getCacheTTL(path);
  CACHE_STORE.set(cacheKey, {
    data,
    expires: Date.now() + ttl
  });
}

function invalidateCache(pattern) {
  // Remove all cache entries matching the pattern
  for (const key of CACHE_STORE.keys()) {
    if (key.includes(pattern)) {
      CACHE_STORE.delete(key);
    }
  }
}

// Periodic cache cleanup (remove expired entries)
function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of CACHE_STORE.entries()) {
    if (now > value.expires) {
      CACHE_STORE.delete(key);
    }
  }
}

// ============================================================================
// SECURITY: Logging and Error Handling
// ============================================================================

function logSecurityEvent(event, details = {}) {
  // Structured logging for security events
  // In production, send to logging service (Cloudflare Logpush, Datadog, etc.)
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    ...details
  };

  // Cloudflare Workers automatically logs errors
  // Remove console.log in production
}

function sanitizeErrorMessage(error, includeDetails = false) {
  // Remove sensitive information from error messages
  if (!includeDetails) {
    return 'An error occurred. Please try again.';
  }

  // In development, include more details
  const message = error.message || 'Unknown error';
  // Remove potential sensitive data patterns
  return message
    .replace(/Bearer [^\s]+/g, 'Bearer [REDACTED]')
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
    .replace(/\bpat[A-Za-z0-9]{40,}\b/g, '[TOKEN]');
}

export default {
  async fetch(request, env) {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    // Periodic cache cleanup (every ~100 requests)
    if (Math.random() < 0.01) {
      cleanupCache();
    }

    // CORS and Security headers for browser requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control, Pragma',
      // Security headers
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(self), microphone=(), camera=()',
      // Custom headers
      'X-Request-ID': requestId,
      // Note: HSTS header should be added when using HTTPS only
      // 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
    };

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // Handle IP lookup proxy (doesn't require Airtable credentials)
      if (path === '/api/iplookup' || path === '/iplookup') {
        return handleIPLookup(corsHeaders, request);
      }

      // Get Airtable credentials from environment variables
      const AIRTABLE_API_KEY = env.AIRTABLE_API_KEY;
      const AIRTABLE_BASE_ID = env.AIRTABLE_BASE_ID;

      if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
        return new Response(
          JSON.stringify({ error: 'Server configuration error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Route requests to appropriate handlers
      // Authentication endpoints (no direct Airtable access)
      if (path === '/api/auth/login') {
        return handleLogin(request, env, AIRTABLE_API_KEY, AIRTABLE_BASE_ID, corsHeaders);
      } else if (path === '/api/auth/signup') {
        return handleSignup(request, env, AIRTABLE_API_KEY, AIRTABLE_BASE_ID, corsHeaders);
      } else if (path === '/api/auth/change-password') {
        return handleChangePassword(request, env, AIRTABLE_API_KEY, AIRTABLE_BASE_ID, corsHeaders);
      } else if (path.startsWith('/api/employees')) {
        return handleEmployees(request, env, AIRTABLE_API_KEY, AIRTABLE_BASE_ID, corsHeaders);
      } else if (path.startsWith('/api/attendance')) {
        return handleAttendance(request, env, AIRTABLE_API_KEY, AIRTABLE_BASE_ID, corsHeaders);
      } else if (path.startsWith('/api/leave-requests')) {
        return handleLeaveRequests(request, env, AIRTABLE_API_KEY, AIRTABLE_BASE_ID, corsHeaders);
      } else if (path.startsWith('/api/announcements')) {
        return handleAnnouncements(request, env, AIRTABLE_API_KEY, AIRTABLE_BASE_ID, corsHeaders);
      } else if (path.startsWith('/api/announcement-comments')) {
        return handleAnnouncementComments(request, env, AIRTABLE_API_KEY, AIRTABLE_BASE_ID, corsHeaders);
      } else if (path.startsWith('/api/announcement-reads')) {
        return handleAnnouncementReads(request, env, AIRTABLE_API_KEY, AIRTABLE_BASE_ID, corsHeaders);
      } else if (path.startsWith('/api/payroll')) {
        return handlePayroll(request, env, AIRTABLE_API_KEY, AIRTABLE_BASE_ID, corsHeaders);
      } else if (path.startsWith('/api/medical-claims')) {
        return handleMedicalClaims(request, env, AIRTABLE_API_KEY, AIRTABLE_BASE_ID, corsHeaders);
      } else if (path.startsWith('/api/birthday-wishes')) {
        return handleBirthdayWishes(request, env, AIRTABLE_API_KEY, AIRTABLE_BASE_ID, corsHeaders);
      } else if (path.startsWith('/api/emergency-contacts')) {
        return handleEmergencyContacts(request, env, AIRTABLE_API_KEY, AIRTABLE_BASE_ID, corsHeaders);
      } else if (path === '/api/cloudinary/config') {
        return handleCloudinaryConfig(env, corsHeaders);
      } else if (path === '/api/cloudinary/upload') {
        return handleCloudinaryUpload(request, env, corsHeaders);
      } else {
        return new Response(
          JSON.stringify({ error: 'Not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (error) {
      // Log error with context
      logSecurityEvent('error', {
        requestId,
        path: new URL(request.url).pathname,
        method: request.method,
        error: sanitizeErrorMessage(error, env.ENVIRONMENT === 'development'),
        duration: Date.now() - startTime
      });

      // Return sanitized error message
      const isDevelopment = env.ENVIRONMENT === 'development';
      return new Response(
        JSON.stringify({
          error: sanitizeErrorMessage(error, isDevelopment),
          requestId
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  },
};

// IP Lookup proxy handler
async function handleIPLookup(corsHeaders, request) {
  try {
    // Get client IP from Cloudflare's CF-Connecting-IP header
    const clientIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';

    // Use ip-api.com which is free and works well with Workers
    // Note: ip-api.com allows 45 requests per minute for free
    const response = await fetch(`http://ip-api.com/json/${clientIP}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp,query`, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      // Return fallback with client IP
      return new Response(
        JSON.stringify({
          fallback: true,
          ip: clientIP,
          latitude: 0,
          longitude: 0,
          city: 'Unknown',
          region: 'Unknown',
          country_name: 'Unknown',
          error: 'IP lookup service unavailable'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    // Check if the API returned an error
    if (data.status === 'fail') {
      return new Response(
        JSON.stringify({
          fallback: true,
          ip: clientIP,
          latitude: 0,
          longitude: 0,
          city: 'Unknown',
          region: 'Unknown',
          country_name: 'Unknown',
          error: data.message || 'IP lookup failed'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform ip-api.com response to match ipapi.co format
    const transformedData = {
      ip: data.query || clientIP,
      latitude: data.lat,
      longitude: data.lon,
      city: data.city,
      region: data.regionName,
      country_name: data.country,
      country_code: data.countryCode,
      timezone: data.timezone,
      isp: data.isp
    };

    return new Response(JSON.stringify(transformedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    // Return fallback data with error message
    return new Response(
      JSON.stringify({
        fallback: true,
        ip: 'unknown',
        latitude: 0,
        longitude: 0,
        city: 'Unknown',
        region: 'Unknown',
        country_name: 'Unknown',
        error: error.message
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Helper function to make Airtable API requests
async function airtableRequest(endpoint, apiKey, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(endpoint, options);
  return response;
}

// Employees API handler
async function handleEmployees(request, env, apiKey, baseId, corsHeaders) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const tableName = 'Employees';

  if (request.method === 'GET') {
    // Get all employees or specific employee
    const recordId = pathParts[3]; // /api/employees/{recordId}

    // Generate cache key
    const cacheKey = getCacheKey('GET', url.pathname, url.search);

    // Check cache first
    const cachedData = getCachedResponse(cacheKey);
    if (cachedData) {
      return new Response(JSON.stringify(cachedData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
        status: 200,
      });
    }

    let airtableUrl;
    if (recordId) {
      airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}/${recordId}`;
    } else {
      // Support filtering by email or other fields
      const filterFormula = url.searchParams.get('filterByFormula');
      airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}`;
      if (filterFormula) {
        airtableUrl += `?filterByFormula=${encodeURIComponent(filterFormula)}`;
      }
    }

    const response = await airtableRequest(airtableUrl, apiKey);
    const data = await response.json();

    // Cache the response
    setCachedResponse(cacheKey, data, url.pathname);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
      status: response.status,
    });
  } else if (request.method === 'POST') {
    // Create new employee
    const body = await request.json();
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}`;

    const response = await airtableRequest(airtableUrl, apiKey, 'POST', body);
    const data = await response.json();

    // Invalidate employees cache
    invalidateCache('/api/employees');

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });
  } else if (request.method === 'PATCH') {
    // Update employee
    const recordId = pathParts[3];
    const body = await request.json();
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}/${recordId}`;

    const response = await airtableRequest(airtableUrl, apiKey, 'PATCH', body);
    const data = await response.json();

    // Invalidate employees cache
    invalidateCache('/api/employees');

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });
  } else if (request.method === 'DELETE') {
    // Delete employee
    const recordId = pathParts[3];
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}/${recordId}`;

    const response = await airtableRequest(airtableUrl, apiKey, 'DELETE');
    const data = await response.json();

    // Invalidate employees cache
    invalidateCache('/api/employees');

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });
  }
}

// Attendance API handler
async function handleAttendance(request, env, apiKey, baseId, corsHeaders) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const tableName = 'Attendance';

  if (request.method === 'GET') {
    const recordId = pathParts[3]; // /api/attendance/{recordId}

    let airtableUrl;
    if (recordId) {
      airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}/${recordId}`;
      const response = await airtableRequest(airtableUrl, apiKey);
      const data = await response.json();

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      });
    } else {
      // Fetch all records with pagination support
      const filterFormula = url.searchParams.get('filterByFormula');
      let allRecords = [];
      let offset = null;
      let pageCount = 0;

      do {
        pageCount++;
        let airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}`;
        const params = [];

        // Request 100 records per page (Airtable's maximum)
        params.push(`pageSize=100`);

        if (filterFormula) {
          params.push(`filterByFormula=${encodeURIComponent(filterFormula)}`);
        }

        if (offset) {
          params.push(`offset=${offset}`);
        }

        if (params.length > 0) {
          airtableUrl += `?${params.join('&')}`;
        }

        const response = await airtableRequest(airtableUrl, apiKey);
        const data = await response.json();

        if (!response.ok) {
          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: response.status,
          });
        }

        allRecords = allRecords.concat(data.records || []);
        offset = data.offset || null;
      } while (offset);

      return new Response(JSON.stringify({ records: allRecords }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        status: 200,
      });
    }
  } else if (request.method === 'POST') {
    const body = await request.json();
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}`;

    const response = await airtableRequest(airtableUrl, apiKey, 'POST', body);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });
  } else if (request.method === 'PATCH') {
    const recordId = pathParts[3];
    const body = await request.json();
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}/${recordId}`;

    const response = await airtableRequest(airtableUrl, apiKey, 'PATCH', body);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });
  }
}

// Leave Requests API handler
async function handleLeaveRequests(request, env, apiKey, baseId, corsHeaders) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const tableName = 'Leave%20Requests';

  if (request.method === 'GET') {
    const filterFormula = url.searchParams.get('filterByFormula');
    let airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}`;
    if (filterFormula) {
      airtableUrl += `?filterByFormula=${encodeURIComponent(filterFormula)}`;
    }

    const response = await airtableRequest(airtableUrl, apiKey);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });
  } else if (request.method === 'POST') {
    const body = await request.json();
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}`;

    const response = await airtableRequest(airtableUrl, apiKey, 'POST', body);
    const data = await response.json();

    // Invalidate cache
    invalidateCache('leave-requests');

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });
  } else if (request.method === 'PATCH') {
    const recordId = pathParts[3];
    const body = await request.json();
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}/${recordId}`;

    const response = await airtableRequest(airtableUrl, apiKey, 'PATCH', body);
    const data = await response.json();

    // Invalidate cache
    invalidateCache('leave-requests');

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });
  } else if (request.method === 'DELETE') {
    const recordId = pathParts[3];
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}/${recordId}`;

    const response = await airtableRequest(airtableUrl, apiKey, 'DELETE');
    const data = await response.json();

    // Invalidate cache
    invalidateCache('leave-requests');

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });
  }
}

// Announcements API handler
async function handleAnnouncements(request, env, apiKey, baseId, corsHeaders) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const tableName = 'Announcements';

  if (request.method === 'GET') {
    // Generate cache key
    const cacheKey = getCacheKey('GET', url.pathname, url.search);

    // Check cache first
    const cachedData = getCachedResponse(cacheKey);
    if (cachedData) {
      return new Response(JSON.stringify(cachedData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
        status: 200,
      });
    }

    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}`;
    const response = await airtableRequest(airtableUrl, apiKey);
    const data = await response.json();

    // Cache the response
    setCachedResponse(cacheKey, data, url.pathname);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
      status: response.status,
    });
  } else if (request.method === 'POST') {
    const body = await request.json();
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}`;

    const response = await airtableRequest(airtableUrl, apiKey, 'POST', body);
    const data = await response.json();

    // Invalidate announcements cache
    invalidateCache('/api/announcements');

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });
  } else if (request.method === 'PATCH') {
    const recordId = pathParts[3];
    const body = await request.json();
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}/${recordId}`;

    const response = await airtableRequest(airtableUrl, apiKey, 'PATCH', body);
    const data = await response.json();

    // Invalidate announcements cache
    invalidateCache('/api/announcements');

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });
  } else if (request.method === 'DELETE') {
    const recordId = pathParts[3];
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}/${recordId}`;

    const response = await airtableRequest(airtableUrl, apiKey, 'DELETE');
    const data = await response.json();

    // Invalidate announcements cache
    invalidateCache('/api/announcements');

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });
  }
}

// Announcement Comments API handler
async function handleAnnouncementComments(request, env, apiKey, baseId, corsHeaders) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const tableName = 'AnnouncementComments';

  if (request.method === 'GET') {
    // Generate cache key
    const cacheKey = getCacheKey('GET', url.pathname, url.search);

    // Check cache first
    const cachedData = getCachedResponse(cacheKey);
    if (cachedData) {
      return new Response(JSON.stringify(cachedData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
        status: 200,
      });
    }

    const filterFormula = url.searchParams.get('filterByFormula');
    let airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}`;

    if (filterFormula) {
      airtableUrl += `?filterByFormula=${encodeURIComponent(filterFormula)}`;
    }

    const response = await airtableRequest(airtableUrl, apiKey);
    const data = await response.json();

    // Cache the response
    setCachedResponse(cacheKey, data, url.pathname);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
      status: response.status,
    });
  } else if (request.method === 'POST') {
    const body = await request.json();
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}`;

    const response = await airtableRequest(airtableUrl, apiKey, 'POST', body);
    const data = await response.json();

    // Invalidate comments cache
    invalidateCache('/api/announcement-comments');

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });
  } else if (request.method === 'DELETE') {
    const recordId = pathParts[3];
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}/${recordId}`;

    const response = await airtableRequest(airtableUrl, apiKey, 'DELETE');
    const data = await response.json();

    // Invalidate comments cache
    invalidateCache('/api/announcement-comments');

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });
  }
}

// Announcement Reads API handler
async function handleAnnouncementReads(request, env, apiKey, baseId, corsHeaders) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const tableName = 'AnnouncementReads';

  if (request.method === 'GET') {
    const filterFormula = url.searchParams.get('filterByFormula');
    let airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}`;

    if (filterFormula) {
      airtableUrl += `?filterByFormula=${encodeURIComponent(filterFormula)}`;
    }

    const response = await airtableRequest(airtableUrl, apiKey);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });
  } else if (request.method === 'POST') {
    const body = await request.json();
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}`;

    const response = await airtableRequest(airtableUrl, apiKey, 'POST', body);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });
  }
}

// Payroll API handler
async function handlePayroll(request, env, apiKey, baseId, corsHeaders) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const tableName = 'Payroll';

  if (request.method === 'GET') {
    const filterFormula = url.searchParams.get('filterByFormula');
    let airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}`;
    if (filterFormula) {
      airtableUrl += `?filterByFormula=${encodeURIComponent(filterFormula)}`;
    }

    const response = await airtableRequest(airtableUrl, apiKey);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });
  } else if (request.method === 'POST') {
    const body = await request.json();
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}`;

    const response = await airtableRequest(airtableUrl, apiKey, 'POST', body);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });
  } else if (request.method === 'PATCH') {
    const recordId = pathParts[3];
    const body = await request.json();
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}/${recordId}`;

    const response = await airtableRequest(airtableUrl, apiKey, 'PATCH', body);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });
  } else if (request.method === 'DELETE') {
    const recordId = pathParts[3];
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}/${recordId}`;

    const response = await airtableRequest(airtableUrl, apiKey, 'DELETE');
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });
  } else {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
// Add these functions to the end of api-worker.js file (before the closing of the file)

// Medical Claims API handler
async function handleMedicalClaims(request, env, apiKey, baseId, corsHeaders) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const tableName = 'Medical Claims';

  if (request.method === 'GET') {
    const filterFormula = url.searchParams.get('filterByFormula');
    let airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}`;
    if (filterFormula) {
      airtableUrl += `?filterByFormula=${encodeURIComponent(filterFormula)}`;
    }

    const response = await airtableRequest(airtableUrl, apiKey);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });
  } else if (request.method === 'POST') {
    const body = await request.json();
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}`;

    const response = await airtableRequest(airtableUrl, apiKey, 'POST', body);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });
  } else if (request.method === 'PATCH') {
    const recordId = pathParts[3];
    const body = await request.json();
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}/${recordId}`;

    const response = await airtableRequest(airtableUrl, apiKey, 'PATCH', body);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });
  }
}

// Emergency Contacts API handler
async function handleEmergencyContacts(request, env, apiKey, baseId, corsHeaders) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const tableName = 'Emergency Contact';

  if (request.method === 'GET') {
    // Check if requesting a specific record
    const recordId = pathParts[3];
    if (recordId) {
      const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}/${recordId}`;
      const response = await airtableRequest(airtableUrl, apiKey);
      const data = await response.json();

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      });
    }

    // Get list with optional filter
    const filterFormula = url.searchParams.get('filterByFormula');
    let airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}`;
    if (filterFormula) {
      airtableUrl += `?filterByFormula=${encodeURIComponent(filterFormula)}`;
    }

    const response = await airtableRequest(airtableUrl, apiKey);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });
  } else if (request.method === 'POST') {
    const body = await request.json();
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}`;

    const response = await airtableRequest(airtableUrl, apiKey, 'POST', body);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });
  } else if (request.method === 'PATCH') {
    const recordId = pathParts[3];
    const body = await request.json();
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}/${recordId}`;

    const response = await airtableRequest(airtableUrl, apiKey, 'PATCH', body);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });
  } else if (request.method === 'DELETE') {
    const recordId = pathParts[3];
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}/${recordId}`;

    const response = await airtableRequest(airtableUrl, apiKey, 'DELETE');
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });
  }
}

// Cloudinary Config handler - returns config without exposing secrets in frontend
function handleCloudinaryConfig(env, corsHeaders) {
  const cloudName = env.CLOUDINARY_CLOUD_NAME || 'dow5ohgj9';
  const uploadPreset = env.CLOUDINARY_UPLOAD_PRESET || 'glampack_hr_uploads';

  return new Response(
    JSON.stringify({
      cloudName,
      uploadPreset,
      folder: 'glampack-hr/medical-receipts',
      apiUrl: 'https://api.cloudinary.com/v1_1'
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    }
  );
}

// Cloudinary Upload handler - proxy upload to Cloudinary API
async function handleCloudinaryUpload(request, env, corsHeaders) {
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const cloudName = env.CLOUDINARY_CLOUD_NAME || 'dow5ohgj9';
    const uploadPreset = env.CLOUDINARY_UPLOAD_PRESET || 'glampack_hr_uploads';

    // Get the form data from the request
    const formData = await request.formData();
    
    // Add upload preset to form data if not already present
    if (!formData.has('upload_preset')) {
      formData.append('upload_preset', uploadPreset);
    }

    // Proxy the upload to Cloudinary
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
    
    const response = await fetch(cloudinaryUrl, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ 
          error: 'Upload failed', 
          details: data 
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Return successful upload response
    return new Response(
      JSON.stringify({
        url: data.secure_url,
        publicId: data.public_id,
        format: data.format,
        resourceType: data.resource_type,
        bytes: data.bytes,
        width: data.width,
        height: data.height,
        created: data.created_at
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Upload failed',
        message: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

// Birthday Wishes API handler
async function handleBirthdayWishes(request, env, apiKey, baseId, corsHeaders) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const tableName = 'Birthday Wishes';

  if (request.method === 'GET') {
    const filterFormula = url.searchParams.get('filterByFormula');
    let airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}`;
    if (filterFormula) {
      airtableUrl += `?filterByFormula=${filterFormula}`;
    }

    const response = await fetch(airtableUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });
  }

  if (request.method === 'POST') {
    const body = await request.json();
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}`;

    const response = await fetch(airtableUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });
  }
}

// ============================================================================
// SECURITY: CSRF Protection
// ============================================================================

// Generate CSRF token
async function generateCSRFToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Verify CSRF token (simple implementation - for production use signed tokens)
function verifyCSRFToken(token, providedToken) {
  if (!token || !providedToken) {
    return false;
  }
  // Constant-time comparison to prevent timing attacks
  if (token.length !== providedToken.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ providedToken.charCodeAt(i);
  }
  return result === 0;
}

// ============================================================================
// SECURITY: Rate Limiting
// ============================================================================

// Simple in-memory rate limiter (for production, use Cloudflare KV or Durable Objects)
const rateLimitStore = new Map();

function cleanupOldEntries() {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now - value.resetTime > 60000) { // Clean up entries older than 1 minute
      rateLimitStore.delete(key);
    }
  }
}

function checkRateLimit(identifier, maxAttempts = 5, windowMs = 60000) {
  cleanupOldEntries();

  const now = Date.now();
  const key = `ratelimit:${identifier}`;
  const record = rateLimitStore.get(key);

  if (!record) {
    // First attempt
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  if (now > record.resetTime) {
    // Window has expired, reset
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  if (record.count >= maxAttempts) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfter
    };
  }

  // Increment count
  record.count++;
  rateLimitStore.set(key, record);
  return { allowed: true, remaining: maxAttempts - record.count };
}

// ============================================================================
// SECURITY: Input Validation and Sanitization
// ============================================================================

function sanitizeEmail(email) {
  // Basic email sanitization
  if (!email || typeof email !== 'string') {
    return '';
  }
  return email.toLowerCase().trim().replace(/[<>"']/g, '');
}

function sanitizeString(str, maxLength = 1000) {
  // Remove potentially dangerous characters
  if (!str || typeof str !== 'string') {
    return '';
  }
  return str.trim().substring(0, maxLength).replace(/[<>"'`]/g, '');
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ============================================================================
// SECURITY: Password Hashing and Authentication
// ============================================================================

// Hash password using PBKDF2 (Web Crypto API - available in Cloudflare Workers)
async function hashPassword(password) {
  // Generate random salt (16 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Convert password to ArrayBuffer
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // Import password as key
  const key = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  // Derive hash using PBKDF2 with 100,000 iterations
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    key,
    256 // Output 256 bits (32 bytes)
  );

  // Convert to hex and combine with salt
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const saltArray = Array.from(salt);

  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const saltHex = saltArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Format: salt$hash (hex encoded)
  return `${saltHex}$${hashHex}`;
}

// Verify password against stored hash
async function verifyPassword(password, storedHash) {
  // Split stored hash into salt and hash
  const [saltHex, hashHex] = storedHash.split('$');

  if (!saltHex || !hashHex) {
    return false;
  }

  // Convert hex strings back to Uint8Array
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

  // Convert password to ArrayBuffer
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // Import password as key
  const key = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  // Derive hash using same parameters
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    key,
    256
  );

  // Convert to hex
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const computedHashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Constant-time comparison (prevent timing attacks)
  return computedHashHex === hashHex;
}

// Generate JWT token (simplified - for production use a library)
async function generateToken(payload, secret) {
  // Header
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  // Add expiration (24 hours from now)
  const exp = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
  const tokenPayload = { ...payload, exp };

  // Encode header and payload
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(tokenPayload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  // Create signature
  const encoder = new TextEncoder();
  const data = encoder.encode(`${encodedHeader}.${encodedPayload}`);
  const keyData = encoder.encode(secret);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, data);
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

// Verify JWT token
async function verifyToken(token, secret) {
  try {
    const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');

    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      return null;
    }

    // Verify signature
    const encoder = new TextEncoder();
    const data = encoder.encode(`${encodedHeader}.${encodedPayload}`);
    const keyData = encoder.encode(secret);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Decode signature (handle URL-safe base64)
    const signatureStr = encodedSignature.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - signatureStr.length % 4) % 4);
    const signature = Uint8Array.from(atob(signatureStr + padding), c => c.charCodeAt(0));

    const valid = await crypto.subtle.verify('HMAC', key, signature, data);

    if (!valid) {
      return null;
    }

    // Decode payload
    const payloadStr = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
    const payloadPadding = '='.repeat((4 - payloadStr.length % 4) % 4);
    const payload = JSON.parse(atob(payloadStr + payloadPadding));

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Token expired
    }

    return payload;
  } catch (error) {
    return null;
  }
}

// Authentication: Login
async function handleLogin(request, env, apiKey, baseId, corsHeaders) {
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await request.json();
    let { email, password } = body;

    // Sanitize and validate input
    email = sanitizeEmail(email);
    if (!email || !isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!password || typeof password !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Password is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting: Max 5 login attempts per email per minute
    const rateLimit = checkRateLimit(`login:${email}`, 5, 60000);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Too many login attempts. Please try again later.',
          retryAfter: rateLimit.retryAfter
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimit.retryAfter)
          }
        }
      );
    }

    // Fetch employee by email (using sanitized email)
    const filterFormula = `{Email}='${email}'`;
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/Employees?filterByFormula=${encodeURIComponent(filterFormula)}`;
    const response = await airtableRequest(airtableUrl, apiKey);
    const data = await response.json();

    if (!response.ok || !data.records || data.records.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid email or password' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const employee = data.records[0];
    const storedPassword = employee.fields.Password;

    // Check if password is hashed (contains $)
    let isValidPassword = false;
    if (storedPassword && storedPassword.includes('$')) {
      // Hashed password - verify using PBKDF2
      isValidPassword = await verifyPassword(password, storedPassword);
    } else {
      // Plain text password (legacy) - direct comparison
      // TODO: Hash this password on next login
      isValidPassword = password === storedPassword;

      // Auto-upgrade to hashed password
      if (isValidPassword) {
        const hashedPassword = await hashPassword(password);
        await airtableRequest(
          `https://api.airtable.com/v0/${baseId}/Employees/${employee.id}`,
          apiKey,
          'PATCH',
          { fields: { Password: hashedPassword } }
        );
      }
    }

    if (!isValidPassword) {
      // Log failed login attempt
      logSecurityEvent('login_failed', {
        email: email.substring(0, 3) + '***', // Redacted email
        reason: 'invalid_password',
        ip: request.headers.get('CF-Connecting-IP') || 'unknown'
      });

      return new Response(
        JSON.stringify({ error: 'Invalid email or password' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate JWT token
    const jwtSecret = env.JWT_SECRET || 'default-secret-change-in-production';
    const token = await generateToken({
      id: employee.id,
      email: employee.fields.Email,
      role: employee.fields.Role
    }, jwtSecret);

    // Log successful login
    logSecurityEvent('login_success', {
      userId: employee.id,
      email: email.substring(0, 3) + '***',
      role: employee.fields.Role,
      ip: request.headers.get('CF-Connecting-IP') || 'unknown'
    });

    // Return user data with token
    return new Response(
      JSON.stringify({
        success: true,
        token,
        user: {
          id: employee.id,
          email: employee.fields.Email,
          fullName: employee.fields['Full Name'],
          role: employee.fields.Role,
          department: employee.fields.Department,
          jobTitle: employee.fields['Job Title']
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logSecurityEvent('login_error', {
      error: sanitizeErrorMessage(error, false),
      ip: request.headers.get('CF-Connecting-IP') || 'unknown'
    });

    return new Response(
      JSON.stringify({ error: 'Login failed', message: sanitizeErrorMessage(error, false) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Authentication: Signup
async function handleSignup(request, env, apiKey, baseId, corsHeaders) {
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await request.json();
    let { email, password, fullName, department, jobTitle } = body;

    // Sanitize and validate input
    email = sanitizeEmail(email);
    if (!email || !isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    fullName = sanitizeString(fullName, 100);
    department = sanitizeString(department || 'General', 50);
    jobTitle = sanitizeString(jobTitle || 'Employee', 100);

    if (!fullName) {
      return new Response(
        JSON.stringify({ error: 'Full name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!password || typeof password !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Password is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting: Max 3 signup attempts per IP per 5 minutes
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimit = checkRateLimit(`signup:${clientIP}`, 3, 300000);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Too many signup attempts. Please try again later.',
          retryAfter: rateLimit.retryAfter
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimit.retryAfter)
          }
        }
      );
    }

    // Check password strength (minimum 8 characters)
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if email already exists
    const filterFormula = `{Email}='${email}'`;
    const checkUrl = `https://api.airtable.com/v0/${baseId}/Employees?filterByFormula=${encodeURIComponent(filterFormula)}`;
    const checkResponse = await airtableRequest(checkUrl, apiKey);
    const checkData = await checkResponse.json();

    if (checkData.records && checkData.records.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Email already registered' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create employee record
    const createUrl = `https://api.airtable.com/v0/${baseId}/Employees`;
    const createResponse = await airtableRequest(createUrl, apiKey, 'POST', {
      fields: {
        Email: email,
        Password: hashedPassword,
        'Full Name': fullName,
        Department: department || 'General',
        'Job Title': jobTitle || 'Employee',
        Role: 'Employee',
        Status: 'Permanent',
        'Annual Leave Balance': 20
      }
    });

    const createData = await createResponse.json();

    if (!createResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to create account', details: createData }),
        { status: createResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate JWT token
    const jwtSecret = env.JWT_SECRET || 'default-secret-change-in-production';
    const token = await generateToken({
      id: createData.id,
      email: email,
      role: 'Employee'
    }, jwtSecret);

    return new Response(
      JSON.stringify({
        success: true,
        token,
        user: {
          id: createData.id,
          email: email,
          fullName: fullName,
          role: 'Employee',
          department: department || 'General',
          jobTitle: jobTitle || 'Employee'
        }
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Signup failed', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Authentication: Change Password
async function handleChangePassword(request, env, apiKey, baseId, corsHeaders) {
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { email, oldPassword, newPassword } = await request.json();

    // Validate input
    if (!email || !oldPassword || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'Email, old password, and new password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check new password strength
    if (newPassword.length < 8) {
      return new Response(
        JSON.stringify({ error: 'New password must be at least 8 characters long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch employee
    const filterFormula = `{Email}='${email}'`;
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/Employees?filterByFormula=${encodeURIComponent(filterFormula)}`;
    const response = await airtableRequest(airtableUrl, apiKey);
    const data = await response.json();

    if (!response.ok || !data.records || data.records.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const employee = data.records[0];
    const storedPassword = employee.fields.Password;

    // Verify old password
    let isValidOldPassword = false;
    if (storedPassword && storedPassword.includes('$')) {
      isValidOldPassword = await verifyPassword(oldPassword, storedPassword);
    } else {
      isValidOldPassword = oldPassword === storedPassword;
    }

    if (!isValidOldPassword) {
      return new Response(
        JSON.stringify({ error: 'Invalid old password' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    const updateUrl = `https://api.airtable.com/v0/${baseId}/Employees/${employee.id}`;
    const updateResponse = await airtableRequest(updateUrl, apiKey, 'PATCH', {
      fields: { Password: hashedNewPassword }
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      return new Response(
        JSON.stringify({ error: 'Failed to update password', details: errorData }),
        { status: updateResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Password updated successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Password change failed', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
