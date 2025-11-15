// ========================================
// AUTHENTICATION SYSTEM
// ========================================
// Configuration is loaded from config.js
// Make sure to include <script src="config.js"></script> before this file

// ========================================
// PASSWORD HASHING UTILITY
// ========================================
async function hashPassword(password) {
    // Simple SHA-256 hashing using Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// ========================================
// LOGIN FUNCTION
// ========================================
async function login(email, password) {
    try {
        // Show loading state
        showLoading(true);

        // Fetch employee by email using Worker API
        const filterFormula = `{Email} = '${email}'`;
        const data = await getEmployees(filterFormula);

        // Check if employee exists
        if (!data.records || data.records.length === 0) {
            showError('Invalid email or password');
            showLoading(false);
            return false;
        }

        const employee = data.records[0];

        // Check if employee has a password set
        const storedPasswordHash = employee.fields['Password'];

        // Validate password
        if (!password || password.trim() === '') {
            showError('Please enter a password');
            showLoading(false);
            return false;
        }

        // If no password is set in Airtable, show error
        if (!storedPasswordHash) {
            showError('Account not set up. Please sign up first.');
            showLoading(false);
            return false;
        }

        // Hash the entered password and compare with stored hash
        const enteredPasswordHash = await hashPassword(password.trim());

        if (storedPasswordHash !== enteredPasswordHash) {
            showError('Invalid email or password');
            showLoading(false);
            return false;
        }

        // Store user session
        const userSession = {
            id: employee.id,
            name: employee.fields['Full Name'],
            email: employee.fields['Email'],
            role: employee.fields['Role'] || 'Employee',
            status: employee.fields['Status'],
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
        showError('Login failed. Please try again.');
        showLoading(false);
        return false;
    }
}

// ========================================
// SIGNUP FUNCTION
// ========================================
async function signup(fullName, email, status, password, role = 'Employee') {
    try {
        showLoading(true);

        // Check if employee already exists using Worker API
        const filterFormula = `{Email} = '${email}'`;
        const checkData = await getEmployees(filterFormula);

        if (checkData.records && checkData.records.length > 0) {
            showError('An account with this email already exists. Please sign in.');
            showLoading(false);
            return false;
        }

        // Generate unique Employee ID
        const empId = 'EMP' + Math.random().toString(36).substr(2, 6).toUpperCase();

        // Hash the password before storing
        const passwordHash = await hashPassword(password);

        // Create new employee record with hashed password and role using Worker API
        const createData = await createEmployee({
            'Full Name': fullName,
            'Email': email,
            'Password': passwordHash,
            'Role': role,
            'Annual Leave Balance': 20,  // Default leave balance for new employees
            'Status': status
        });

        if (!createData || !createData.id) {
            throw new Error('Failed to create account');
        }

        // Auto-login the user after signup
        const userData = {
            id: createData.id,
            name: fullName,
            email: email,
            role: role
        };
        sessionStorage.setItem('currentUser', JSON.stringify(userData));
        localStorage.setItem('lastUser', email);

        showLoading(false);
        // Don't redirect here - let the signup form handle it based on role

        return true;

    } catch (error) {
        console.error('Signup error:', error);
        showError('Signup failed. Please try again.');
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
        console.error('Password reset request error:', error);
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
    sessionStorage.removeItem('currentUser');
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
        window.location.href = 'signin-2.html';
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
        console.error('Failed to copy:', err);
        showError('Failed to copy link. Please copy manually.');
    });
}
