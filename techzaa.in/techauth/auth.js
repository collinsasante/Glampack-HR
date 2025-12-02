// ========================================
// AUTHENTICATION SYSTEM (SECURE)
// ========================================
// Uses /api/auth/login endpoint with JWT tokens and password hashing
// Passwords are hashed with PBKDF2 in the Worker
// JWT tokens expire after 24 hours

// ========================================
// LOGIN FUNCTION (SECURE)
// ========================================
async function login(email, password) {
    try {
        // Show loading state
        showLoading(true);

        // Use secure Worker authentication endpoint
        const response = await fetch('https://glampack-hr-api.mr-asanteeprog.workers.dev/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await response.json();

        // Handle authentication errors
        if (!response.ok) {
            if (response.status === 429) {
                // Rate limited
                showError(data.error + (data.retryAfter ? ` Please wait ${data.retryAfter} seconds.` : ''));
            } else {
                showError(data.error || 'Invalid email or password');
            }
            showLoading(false);
            return false;
        }

        // Check for successful authentication
        if (!data.success || !data.token || !data.user) {
            showError('Login failed. Please try again.');
            showLoading(false);
            return false;
        }

        // Store JWT token securely
        sessionStorage.setItem('auth_token', data.token);

        // Store user session
        const userSession = {
            id: data.user.id,
            name: data.user.fullName,
            email: data.user.email,
            role: data.user.role || 'Employee',
            department: data.user.department,
            jobTitle: data.user.jobTitle,
            loginTime: new Date().toISOString()
        };

        // Save to sessionStorage
        sessionStorage.setItem('currentUser', JSON.stringify(userSession));

        // Save to localStorage for "Remember Me" (optional)
        localStorage.setItem('lastUser', email);

        showLoading(false);
        return true;

    } catch (error) {
        console.error('Login error:', error);
        showError('Login failed. Please check your connection and try again.');
        showLoading(false);
        return false;
    }
}

// ========================================
// SIGNUP FUNCTION (SECURE)
// ========================================
async function signup(fullName, email, status, password, role = 'Employee', department = '', jobTitle = '') {
    try {
        showLoading(true);

        // Use secure Worker authentication endpoint
        const response = await fetch('https://glampack-hr-api.mr-asanteeprog.workers.dev/api/auth/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password,
                fullName: fullName,
                role: role,
                department: department,
                jobTitle: jobTitle,
                status: status
            })
        });

        const data = await response.json();

        // Handle signup errors
        if (!response.ok) {
            if (response.status === 429) {
                // Rate limited
                showError(data.error + (data.retryAfter ? ` Please wait ${data.retryAfter} seconds.` : ''));
            } else if (response.status === 400) {
                // Validation error
                showError(data.error || 'Invalid signup data');
            } else if (response.status === 409) {
                // Email already exists
                showError(data.error || 'An account with this email already exists');
            } else {
                showError(data.error || 'Signup failed. Please try again.');
            }
            showLoading(false);
            return false;
        }

        // Check for successful signup
        if (!data.success || !data.token || !data.user) {
            showError('Signup failed. Please try again.');
            showLoading(false);
            return false;
        }

        // Store JWT token securely
        sessionStorage.setItem('auth_token', data.token);

        // Auto-login the user after signup
        const userSession = {
            id: data.user.id,
            name: data.user.fullName,
            email: data.user.email,
            role: data.user.role || 'Employee',
            department: data.user.department,
            jobTitle: data.user.jobTitle,
            loginTime: new Date().toISOString()
        };

        sessionStorage.setItem('currentUser', JSON.stringify(userSession));
        localStorage.setItem('lastUser', email);

        showLoading(false);
        // Don't redirect here - let the signup form handle it based on role

        return true;

    } catch (error) {
        console.error('Signup error:', error);
        showError('Signup failed. Please check your connection and try again.');
        showLoading(false);
        return false;
    }
}

// ========================================
// PASSWORD RESET REQUEST FUNCTION
// ========================================
async function requestPasswordReset(email) {
    try {
        showLoading(true);

        // Check if employee exists using Worker API
        const filterFormula = `{Email} = '${email}'`;
        const data = await getEmployees(filterFormula);

        // Check if employee exists
        if (!data.records || data.records.length === 0) {
            showError('No account found with this email address');
            showLoading(false);
            return false;
        }

        const employee = data.records[0];

        // Generate a password reset token (valid for 1 hour)
        const resetToken = generateResetToken();
        const resetExpiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now

        // Store reset token in Airtable
        await updateEmployee(employee.id, {
            'Reset Token': resetToken,
            'Reset Token Expiry': resetExpiry
        });

        // In a real implementation, this would send an email via backend
        // For now, we'll create a reset link that can be copied
        const resetLink = `${window.location.origin}${window.location.pathname.replace('packaging-glamour-forgot-password.html', 'packaging-glamour-reset-password.html')}?token=${resetToken}&email=${encodeURIComponent(email)}`;

        showLoading(false);

        // Show success message with the reset link
        showResetLinkSuccess(resetLink, email);

        return true;

    } catch (error) {
        showError('Failed to process password reset request. Please try again.');
        showLoading(false);
        return false;
    }
}

// ========================================
// GENERATE RESET TOKEN
// ========================================
function generateResetToken() {
    // Generate a secure random token
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// ========================================
// LOGOUT FUNCTION
// ========================================
function logout() {
    // Clear all session data including JWT token
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('auth_token');
    localStorage.removeItem('isAdmin');
    window.location.href = 'packaging-glamour-signin.html';
}

// ========================================
// CHECK IF USER IS LOGGED IN
// ========================================
function isLoggedIn() {
    const user = sessionStorage.getItem('currentUser');
    return user !== null;
}

// ========================================
// GET CURRENT USER
// ========================================
function getCurrentUser() {
    const userJson = sessionStorage.getItem('currentUser');
    if (userJson) {
        return JSON.parse(userJson);
    }
    return null;
}

// ========================================
// PROTECT PAGE (Redirect if not logged in)
// ========================================
function requireAuth() {
    if (!isLoggedIn()) {
        window.location.href = 'packaging-glamour-signin.html';
        return false;
    }
    return true;
}

// ========================================
// SHOW LOADING STATE
// ========================================
function showLoading(isLoading) {
    const button = document.querySelector('button[type="submit"], button.bg-red-600');
    if (button) {
        if (isLoading) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Signing In...';
        } else {
            button.disabled = false;
            button.innerHTML = 'Sign In';
        }
    }
}

// ========================================
// SHOW ERROR MESSAGE
// ========================================
function showError(message) {
    // Remove existing error messages
    const existingError = document.getElementById('error-message');
    if (existingError) {
        existingError.remove();
    }

    // Create error element
    const errorDiv = document.createElement('div');
    errorDiv.id = 'error-message';
    errorDiv.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4';
    errorDiv.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-exclamation-circle mr-2"></i>
            <span>${message}</span>
        </div>
    `;

    // Insert before the form
    const form = document.querySelector('.space-y-5');
    if (form) {
        form.parentNode.insertBefore(errorDiv, form);
    }

    // Auto-remove after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// ========================================
// SHOW SUCCESS MESSAGE
// ========================================
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4';
    successDiv.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-check-circle mr-2"></i>
            <span>${message}</span>
        </div>
    `;

    const form = document.querySelector('.space-y-5');
    if (form) {
        form.parentNode.insertBefore(successDiv, form);
    }

    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

// ========================================
// SHOW RESET LINK SUCCESS MESSAGE
// ========================================
function showResetLinkSuccess(resetLink, email) {
    // Remove existing messages
    const existingMsg = document.getElementById('reset-link-message');
    if (existingMsg) {
        existingMsg.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.id = 'reset-link-message';
    messageDiv.className = 'bg-blue-50 border border-blue-400 text-blue-900 px-4 py-4 rounded-lg mb-4';
    messageDiv.innerHTML = `
        <div class="space-y-3">
            <div class="flex items-start">
                <i class="fas fa-info-circle mr-2 mt-1"></i>
                <div class="flex-1">
                    <p class="font-semibold mb-1">Password reset link generated!</p>
                    <p class="text-sm mb-2">In a production environment, this link would be sent to <strong>${email}</strong>. For demo purposes, you can copy the link below:</p>
                    <div class="bg-white border border-blue-300 rounded p-2 text-xs break-all font-mono">${resetLink}</div>
                    <button onclick="copyResetLink('${resetLink}')" class="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors">
                        <i class="fas fa-copy mr-1"></i> Copy Link
                    </button>
                </div>
            </div>
        </div>
    `;

    const form = document.querySelector('.space-y-5');
    if (form) {
        form.parentNode.insertBefore(messageDiv, form);
    }
}

// ========================================
// COPY RESET LINK TO CLIPBOARD
// ========================================
function copyResetLink(link) {
    navigator.clipboard.writeText(link).then(() => {
        showSuccess('Reset link copied to clipboard!');
    }).catch(err => {
        showError('Failed to copy link. Please copy manually.');
    });
}
