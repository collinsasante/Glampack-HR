// ========================================
// SECURE AUTHENTICATION SYSTEM WITH JWT
// ========================================
// This version uses JWT tokens and communicates with the secure Cloudflare Worker
//
// USAGE:
// Replace your current auth.js with this file, or rename to auth.js
// Make sure config-worker.js is updated to include JWT token in headers

const WORKER_API_URL = 'https://glampack-hr-api.mr-asanteeprog.workers.dev';

// ========================================
// TOKEN MANAGEMENT
// ========================================

function getAuthToken() {
  return localStorage.getItem('authToken');
}

function getRefreshToken() {
  return localStorage.getItem('refreshToken');
}

function setAuthTokens(token, refreshToken) {
  localStorage.setItem('authToken', token);
  localStorage.setItem('refreshToken', refreshToken);
}

function clearAuthTokens() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
  sessionStorage.removeItem('currentUser');
}

function getCurrentUser() {
  const userJson = sessionStorage.getItem('currentUser');
  return userJson ? JSON.parse(userJson) : null;
}

function setCurrentUser(user) {
  sessionStorage.setItem('currentUser', JSON.stringify(user));
}

// ========================================
// LOGIN FUNCTION (WITH JWT)
// ========================================

async function login(email, password) {
  try {
    showLoading(true);

    // Call Worker API login endpoint
    const response = await fetch(`${WORKER_API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle specific error cases
      if (response.status === 429) {
        showError(data.message || 'Too many login attempts. Please try again later.');
      } else if (response.status === 403) {
        showError(data.message || 'Your account has been deactivated.');
      } else {
        showError(data.error || 'Invalid email or password');
      }
      showLoading(false);
      return false;
    }

    // Store tokens
    setAuthTokens(data.token, data.refreshToken);

    // Store user session
    const userSession = {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      role: data.user.role,
      status: data.user.status,
      department: data.user.department,
      jobTitle: data.user.jobTitle,
      loginTime: new Date().toISOString()
    };
    setCurrentUser(userSession);

    // Save email for "Remember Me" functionality
    localStorage.setItem('lastUser', email);

    showLoading(false);
    return true;

  } catch (error) {
    showError('Login failed. Please check your connection and try again.');
    showLoading(false);
    return false;
  }
}

// ========================================
// SIGNUP FUNCTION (WITH PASSWORD HASHING)
// ========================================

async function signup(fullName, email, status, password, role = 'Employee') {
  try {
    showLoading(true);

    // Validate password strength on client side
    if (password.length < 8) {
      showError('Password must be at least 8 characters long');
      showLoading(false);
      return false;
    }

    // Call Worker API signup endpoint
    const response = await fetch(`${WORKER_API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullName,
        email,
        password,
        status,
        role
      })
    });

    const data = await response.json();

    if (!response.ok) {
      showError(data.error || 'Signup failed. Please try again.');
      showLoading(false);
      return false;
    }

    // Auto-login after successful signup
    setAuthTokens(data.token, data.refreshToken);

    const userSession = {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      role: data.user.role,
      status: data.user.status,
      loginTime: new Date().toISOString()
    };
    setCurrentUser(userSession);

    showLoading(false);
    return true;

  } catch (error) {
    showError('Signup failed. Please check your connection and try again.');
    showLoading(false);
    return false;
  }
}

// ========================================
// TOKEN REFRESH
// ========================================

async function refreshAuthToken() {
  try {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      return false;
    }

    const response = await fetch(`${WORKER_API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) {
      clearAuthTokens();
      return false;
    }

    const data = await response.json();
    setAuthTokens(data.token, data.refreshToken);

    return true;
  } catch (error) {
    clearAuthTokens();
    return false;
  }
}

// ========================================
// VERIFY TOKEN (Check if user is authenticated)
// ========================================

async function verifyToken() {
  try {
    const token = getAuthToken();

    if (!token) {
      return false;
    }

    const response = await fetch(`${WORKER_API_URL}/api/auth/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      // Try to refresh token
      const refreshed = await refreshAuthToken();
      if (!refreshed) {
        clearAuthTokens();
        return false;
      }
      return true;
    }

    const data = await response.json();

    // Update user session if data changed
    if (data.user) {
      const currentUser = getCurrentUser();
      if (!currentUser || currentUser.email !== data.user.email) {
        setCurrentUser(data.user);
      }
    }

    return true;
  } catch (error) {
    clearAuthTokens();
    return false;
  }
}

// ========================================
// LOGOUT
// ========================================

function logout() {
  clearAuthTokens();
  window.location.href = 'index.html';
}

// ========================================
// PASSWORD RESET (Enhanced security)
// ========================================

async function forgotPassword(email) {
  try {
    showLoading(true);

    const response = await fetch(`${WORKER_API_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (!response.ok) {
      showError(data.error || 'Password reset request failed');
      showLoading(false);
      return false;
    }

    // In production, this would send an email
    // For now, show success message
    showSuccess('Password reset instructions have been sent to your email');
    showLoading(false);
    return true;

  } catch (error) {
    showError('Password reset failed. Please try again.');
    showLoading(false);
    return false;
  }
}

async function resetPassword(token, newPassword) {
  try {
    showLoading(true);

    if (newPassword.length < 8) {
      showError('Password must be at least 8 characters long');
      showLoading(false);
      return false;
    }

    const response = await fetch(`${WORKER_API_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, newPassword })
    });

    const data = await response.json();

    if (!response.ok) {
      showError(data.error || 'Password reset failed');
      showLoading(false);
      return false;
    }

    showSuccess('Password reset successful! Please login with your new password.');
    showLoading(false);
    return true;

  } catch (error) {
    showError('Password reset failed. Please try again.');
    showLoading(false);
    return false;
  }
}

// ========================================
// AUTH GUARD (Protect pages)
// ========================================

async function requireAuth() {
  const isValid = await verifyToken();

  if (!isValid) {
    // Redirect to login
    window.location.href = 'index.html';
    return false;
  }

  return true;
}

async function requireAdmin() {
  const isValid = await verifyToken();

  if (!isValid) {
    window.location.href = 'index.html';
    return false;
  }

  const user = getCurrentUser();
  if (user.role !== 'Admin' && user.role !== 'HR') {
    window.location.href = 'dashboard.html';
    return false;
  }

  return true;
}

// ========================================
// AUTO-INIT: Verify token on page load
// ========================================

document.addEventListener('DOMContentLoaded', async function() {
  // Skip auth check on public pages
  const publicPages = ['index.html', 'signin-2.html', 'signup-2.html', 'packaging-glamour-signin.html', 'packaging-glamour-signup.html', 'packaging-glamour-forgot-password.html'];
  const currentPage = window.location.pathname.split('/').pop();

  if (publicPages.includes(currentPage)) {
    return;
  }

  // Verify auth on protected pages
  const isValid = await verifyToken();

  if (!isValid) {
    // Redirect to login
    window.location.href = 'index.html';
  } else {
    // Check admin pages
    const adminPages = ['admin-dashboard.html', 'admin-medical-claims.html'];
    if (adminPages.includes(currentPage)) {
      const user = getCurrentUser();
      if (user.role !== 'Admin' && user.role !== 'HR') {
        window.location.href = 'dashboard.html';
      }
    }
  }
});

// ========================================
// HELPER FUNCTIONS
// ========================================

function showLoading(show) {
  // Implement your loading indicator
  const loadingEl = document.getElementById('loading');
  if (loadingEl) {
    loadingEl.style.display = show ? 'flex' : 'none';
  }
}

function showError(message) {
  // Use toast notification system if available
  if (typeof showToast === 'function') {
    showToast('error', 'Error', message);
  } else {
    alert(message);
  }
}

function showSuccess(message) {
  // Use toast notification system if available
  if (typeof showToast === 'function') {
    showToast('success', 'Success', message);
  } else {
    alert(message);
  }
}

// ========================================
// TOKEN INTERCEPTOR FOR API CALLS
// ========================================

// Override fetch to automatically include auth token
const originalFetch = window.fetch;
window.fetch = async function(url, options = {}) {
  // Add auth token to headers if making request to worker API
  if (url.includes(WORKER_API_URL)) {
    const token = getAuthToken();
    if (token) {
      options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      };
    }
  }

  const response = await originalFetch(url, options);

  // If token expired, try to refresh
  if (response.status === 401 && url.includes(WORKER_API_URL)) {
    const refreshed = await refreshAuthToken();
    if (refreshed) {
      // Retry request with new token
      const newToken = getAuthToken();
      options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${newToken}`
      };
      return originalFetch(url, options);
    } else {
      // Redirect to login
      clearAuthTokens();
      window.location.href = 'index.html';
    }
  }

  return response;
};
