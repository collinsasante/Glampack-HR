// ========================================
// SECURE CLOUDFLARE WORKER WITH PASSWORD HASHING & JWT
// ========================================
// This is an enhanced version with bcrypt password hashing and JWT authentication
//
// SETUP INSTRUCTIONS:
// 1. Install dependencies in your local wrangler project:
//    npm install bcryptjs jsonwebtoken
// 2. Add these environment variables in Cloudflare Dashboard:
//    - AIRTABLE_API_KEY
//    - AIRTABLE_BASE_ID
//    - JWT_SECRET (generate with: openssl rand -base64 32)
//    - CLOUDINARY_CLOUD_NAME
//    - CLOUDINARY_API_KEY
//    - CLOUDINARY_API_SECRET
// 3. Deploy: wrangler deploy

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Rate limiting store (in-memory, resets on worker restart)
// For production, use Cloudflare KV or Durable Objects
const rateLimitStore = new Map();

export default {
  async fetch(request, env) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // Public routes (no authentication required)
      if (path === '/api/auth/login') {
        return handleLogin(request, env, corsHeaders);
      } else if (path === '/api/auth/signup') {
        return handleSignup(request, env, corsHeaders);
      } else if (path === '/api/auth/verify') {
        return handleVerifyToken(request, env, corsHeaders);
      } else if (path === '/api/iplookup' || path === '/iplookup') {
        return handleIPLookup(corsHeaders, request);
      }

      // Protected routes - require JWT authentication
      const authResult = await verifyAuth(request, env);
      if (!authResult.valid) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized', message: authResult.error }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get Airtable credentials
      const AIRTABLE_API_KEY = env.AIRTABLE_API_KEY;
      const AIRTABLE_BASE_ID = env.AIRTABLE_BASE_ID;

      if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
        return new Response(
          JSON.stringify({ error: 'Server configuration error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Route to handlers (now all authenticated)
      if (path.startsWith('/api/employees')) {
        return handleEmployees(request, env, AIRTABLE_API_KEY, AIRTABLE_BASE_ID, corsHeaders, authResult.user);
      } else if (path.startsWith('/api/attendance')) {
        return handleAttendance(request, env, AIRTABLE_API_KEY, AIRTABLE_BASE_ID, corsHeaders, authResult.user);
      } else if (path.startsWith('/api/leave-requests')) {
        return handleLeaveRequests(request, env, AIRTABLE_API_KEY, AIRTABLE_BASE_ID, corsHeaders, authResult.user);
      } else if (path.startsWith('/api/announcements')) {
        return handleAnnouncements(request, env, AIRTABLE_API_KEY, AIRTABLE_BASE_ID, corsHeaders, authResult.user);
      } else if (path.startsWith('/api/payroll')) {
        return handlePayroll(request, env, AIRTABLE_API_KEY, AIRTABLE_BASE_ID, corsHeaders, authResult.user);
      } else if (path.startsWith('/api/medical-claims')) {
        return handleMedicalClaims(request, env, AIRTABLE_API_KEY, AIRTABLE_BASE_ID, corsHeaders, authResult.user);
      } else if (path.startsWith('/api/emergency-contacts')) {
        return handleEmergencyContacts(request, env, AIRTABLE_API_KEY, AIRTABLE_BASE_ID, corsHeaders, authResult.user);
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
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  },
};

// ========================================
// AUTHENTICATION HANDLERS
// ========================================

async function handleLogin(request, env, corsHeaders) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting: 5 attempts per 15 minutes per IP
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimit = checkRateLimit(clientIP, 'login', 5, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Too many login attempts',
          message: `Please try again in ${Math.ceil(rateLimit.resetIn / 60000)} minutes`
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch employee from Airtable
    const airtableUrl = `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/Employees?filterByFormula={Email}='${email}'`;
    const response = await fetch(airtableUrl, {
      headers: {
        'Authorization': `Bearer ${env.AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      // Increment rate limit counter even for invalid email
      incrementRateLimit(clientIP, 'login');
      return new Response(
        JSON.stringify({ error: 'Invalid email or password' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const employee = data.records[0];

    // Check account status
    if (employee.fields['Account Status'] === 'Inactive') {
      return new Response(
        JSON.stringify({ error: 'Account deactivated', message: 'Please contact your administrator' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify password
    const storedHash = employee.fields['Password'];
    const isValidPassword = await bcrypt.compare(password, storedHash);

    if (!isValidPassword) {
      incrementRateLimit(clientIP, 'login');
      return new Response(
        JSON.stringify({ error: 'Invalid email or password' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate JWT token
    const tokenPayload = {
      id: employee.id,
      email: employee.fields['Email'],
      role: employee.fields['Role'] || 'Employee',
      name: employee.fields['Full Name']
    };

    const token = jwt.sign(tokenPayload, env.JWT_SECRET, {
      expiresIn: '8h' // Token expires in 8 hours
    });

    // Generate refresh token (longer expiry)
    const refreshToken = jwt.sign(
      { id: employee.id, type: 'refresh' },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Reset rate limit counter on successful login
    resetRateLimit(clientIP, 'login');

    // Return tokens and user info
    return new Response(
      JSON.stringify({
        success: true,
        token,
        refreshToken,
        user: {
          id: employee.id,
          name: employee.fields['Full Name'],
          email: employee.fields['Email'],
          role: employee.fields['Role'] || 'Employee',
          status: employee.fields['Status'],
          department: employee.fields['Department'],
          jobTitle: employee.fields['Job Title']
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Login failed', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleSignup(request, env, corsHeaders) {
  try {
    const { fullName, email, password, status, role = 'Employee' } = await request.json();

    // Validate input
    if (!fullName || !email || !password || !status) {
      return new Response(
        JSON.stringify({ error: 'All fields are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if email already exists
    const checkUrl = `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/Employees?filterByFormula={Email}='${email}'`;
    const checkResponse = await fetch(checkUrl, {
      headers: {
        'Authorization': `Bearer ${env.AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const checkData = await checkResponse.json();
    if (checkData.records && checkData.records.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Email already exists' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash password with bcrypt (cost factor 10)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate Employee ID
    const empId = 'EMP' + Math.random().toString(36).substr(2, 6).toUpperCase();

    // Create employee record
    const createUrl = `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/Employees`;
    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          'Full Name': fullName,
          'Email': email,
          'Password': hashedPassword, // Store hashed password
          'Status': status,
          'Role': role,
          'Employee ID': empId,
          'Annual Leave Balance': 20,
          'Account Status': 'Active'
        }
      })
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      return new Response(
        JSON.stringify({ error: 'Signup failed', message: errorData.error?.message || 'Unknown error' }),
        { status: createResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const createdEmployee = await createResponse.json();

    // Generate JWT token for auto-login
    const tokenPayload = {
      id: createdEmployee.id,
      email: email,
      role: role,
      name: fullName
    };

    const token = jwt.sign(tokenPayload, env.JWT_SECRET, { expiresIn: '8h' });
    const refreshToken = jwt.sign({ id: createdEmployee.id, type: 'refresh' }, env.JWT_SECRET, { expiresIn: '7d' });

    return new Response(
      JSON.stringify({
        success: true,
        token,
        refreshToken,
        user: {
          id: createdEmployee.id,
          name: fullName,
          email: email,
          role: role,
          status: status
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

async function handleVerifyToken(request, env, corsHeaders) {
  try {
    const authResult = await verifyAuth(request, env);

    if (!authResult.valid) {
      return new Response(
        JSON.stringify({ valid: false, error: authResult.error }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ valid: true, user: authResult.user }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ valid: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// ========================================
// JWT VERIFICATION
// ========================================

async function verifyAuth(request, env) {
  try {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { valid: false, error: 'No authorization token provided' };
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT
    const decoded = jwt.verify(token, env.JWT_SECRET);

    // Check token expiration (jwt.verify does this automatically)
    return {
      valid: true,
      user: {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        name: decoded.name
      }
    };

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return { valid: false, error: 'Token expired' };
    } else if (error.name === 'JsonWebTokenError') {
      return { valid: false, error: 'Invalid token' };
    }
    return { valid: false, error: error.message };
  }
}

// ========================================
// RATE LIMITING
// ========================================

function checkRateLimit(identifier, action, maxAttempts, windowMs) {
  const key = `${identifier}:${action}`;
  const now = Date.now();

  if (!rateLimitStore.has(key)) {
    return { allowed: true, attempts: 0, resetIn: 0 };
  }

  const data = rateLimitStore.get(key);

  // Check if window has expired
  if (now - data.startTime > windowMs) {
    rateLimitStore.delete(key);
    return { allowed: true, attempts: 0, resetIn: 0 };
  }

  // Check if limit exceeded
  if (data.attempts >= maxAttempts) {
    const resetIn = windowMs - (now - data.startTime);
    return { allowed: false, attempts: data.attempts, resetIn };
  }

  return { allowed: true, attempts: data.attempts, resetIn: 0 };
}

function incrementRateLimit(identifier, action) {
  const key = `${identifier}:${action}`;
  const now = Date.now();

  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { attempts: 1, startTime: now });
  } else {
    const data = rateLimitStore.get(key);
    data.attempts++;
  }
}

function resetRateLimit(identifier, action) {
  const key = `${identifier}:${action}`;
  rateLimitStore.delete(key);
}

// ========================================
// IP LOOKUP (unchanged from original)
// ========================================

async function handleIPLookup(corsHeaders, request) {
  try {
    const clientIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
    const response = await fetch(`http://ip-api.com/json/${clientIP}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp,query`, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
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

    return new Response(
      JSON.stringify({
        ip: data.query || clientIP,
        latitude: data.lat || 0,
        longitude: data.lon || 0,
        city: data.city || 'Unknown',
        region: data.regionName || 'Unknown',
        country_name: data.country || 'Unknown',
        country_code: data.countryCode || 'XX',
        timezone: data.timezone || 'UTC',
        isp: data.isp || 'Unknown'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'IP lookup failed', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// ========================================
// PLACEHOLDER HANDLERS
// ========================================
// NOTE: Copy your existing handler functions from api-worker.js
// Just add the 'user' parameter to enforce authorization

async function handleEmployees(request, env, apiKey, baseId, corsHeaders, user) {
  // Your existing handleEmployees code
  // Add role-based access control:
  // if (user.role !== 'Admin' && user.role !== 'HR') {
  //   return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  // }

  return new Response(
    JSON.stringify({ error: 'Handler not implemented - copy from original api-worker.js' }),
    { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleAttendance(request, env, apiKey, baseId, corsHeaders, user) {
  return new Response(
    JSON.stringify({ error: 'Handler not implemented - copy from original api-worker.js' }),
    { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleLeaveRequests(request, env, apiKey, baseId, corsHeaders, user) {
  return new Response(
    JSON.stringify({ error: 'Handler not implemented - copy from original api-worker.js' }),
    { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleAnnouncements(request, env, apiKey, baseId, corsHeaders, user) {
  return new Response(
    JSON.stringify({ error: 'Handler not implemented - copy from original api-worker.js' }),
    { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handlePayroll(request, env, apiKey, baseId, corsHeaders, user) {
  return new Response(
    JSON.stringify({ error: 'Handler not implemented - copy from original api-worker.js' }),
    { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleMedicalClaims(request, env, apiKey, baseId, corsHeaders, user) {
  return new Response(
    JSON.stringify({ error: 'Handler not implemented - copy from original api-worker.js' }),
    { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleEmergencyContacts(request, env, apiKey, baseId, corsHeaders, user) {
  return new Response(
    JSON.stringify({ error: 'Handler not implemented - copy from original api-worker.js' }),
    { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleCloudinaryConfig(env, corsHeaders) {
  return new Response(
    JSON.stringify({ error: 'Handler not implemented - copy from original api-worker.js' }),
    { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleCloudinaryUpload(request, env, corsHeaders) {
  return new Response(
    JSON.stringify({ error: 'Handler not implemented - copy from original api-worker.js' }),
    { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
