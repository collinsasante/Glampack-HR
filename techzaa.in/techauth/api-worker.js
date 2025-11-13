// Cloudflare Worker for Airtable API Proxy
// This worker acts as a secure proxy between your frontend and Airtable
// API credentials are stored in Cloudflare environment variables

export default {
  async fetch(request, env) {
    // CORS headers for browser requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
      if (path.startsWith('/api/employees')) {
        return handleEmployees(request, env, AIRTABLE_API_KEY, AIRTABLE_BASE_ID, corsHeaders);
      } else if (path.startsWith('/api/attendance')) {
        return handleAttendance(request, env, AIRTABLE_API_KEY, AIRTABLE_BASE_ID, corsHeaders);
      } else if (path.startsWith('/api/leave-requests')) {
        return handleLeaveRequests(request, env, AIRTABLE_API_KEY, AIRTABLE_BASE_ID, corsHeaders);
      } else if (path.startsWith('/api/announcements')) {
        return handleAnnouncements(request, env, AIRTABLE_API_KEY, AIRTABLE_BASE_ID, corsHeaders);
      } else if (path.startsWith('/api/payroll')) {
        return handlePayroll(request, env, AIRTABLE_API_KEY, AIRTABLE_BASE_ID, corsHeaders);
      } else {
        return new Response(
          JSON.stringify({ error: 'Not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    });
  } else if (request.method === 'POST') {
    // Create new employee
    const body = await request.json();
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}`;

    const response = await airtableRequest(airtableUrl, apiKey, 'POST', body);
    const data = await response.json();

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
    } else {
      const filterFormula = url.searchParams.get('filterByFormula');
      airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}`;
      if (filterFormula) {
        airtableUrl += `?filterByFormula=${encodeURIComponent(filterFormula)}`;
      }
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

// Announcements API handler
async function handleAnnouncements(request, env, apiKey, baseId, corsHeaders) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const tableName = 'Announcements';

  if (request.method === 'GET') {
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}`;
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
  }
}
