// ========================================
// AUTHENTICATION SYSTEM
// ========================================
// Configuration is loaded from config.js
// Make sure to include <script src="config.js"></script> before this file

// ========================================
// LOGIN FUNCTION
// ========================================
async function login(email, password) {
    try {
        // Show loading state
        showLoading(true);

        // Fetch employee by email from Airtable
        const filterFormula = `{Email} = '${email}'`;
        const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.employeesTable}?filterByFormula=${encodeURIComponent(filterFormula)}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to authenticate');
        }

        const data = await response.json();

        // Check if employee exists
        if (data.records.length === 0) {
            showError('Invalid email or password');
            showLoading(false);
            return false;
        }

        const employee = data.records[0];

        // Check if employee has a password set
        const storedPassword = employee.fields['Password'];

        // Validate password
        if (!password || password.trim() === '') {
            showError('Please enter a password');
            showLoading(false);
            return false;
        }

        // Check if password matches
        if (storedPassword && storedPassword !== password) {
            showError('Invalid email or password');
            showLoading(false);
            return false;
        }

        // If no password is set in Airtable, show error
        if (!storedPassword) {
            showError('Account not set up. Please sign up first.');
            showLoading(false);
            return false;
        }

        // Store user session
        const userSession = {
            id: employee.id,
            name: employee.fields['Full Name'],
            email: employee.fields['Email'],
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

        // Check if employee already exists
        const filterFormula = `{Email} = '${email}'`;
        const checkUrl = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.employeesTable}?filterByFormula=${encodeURIComponent(filterFormula)}`;

        const checkResponse = await fetch(checkUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const checkData = await checkResponse.json();

        if (checkData.records.length > 0) {
            showError('An account with this email already exists. Please sign in.');
            showLoading(false);
            return false;
        }

        // Generate unique Employee ID
        const empId = 'EMP' + Math.random().toString(36).substr(2, 6).toUpperCase();

        // Create new employee record with password and role
        const createUrl = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.employeesTable}`;

        const createResponse = await fetch(createUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    'Full Name': fullName,
                    'Email': email,
                    'Password': password,
                    'Role': role
                }
            })
        });

        if (!createResponse.ok) {
            throw new Error('Failed to create account');
        }

        const newEmployee = await createResponse.json();

        // Auto-login the user after signup
        const userData = {
            id: newEmployee.id,
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
// LOGOUT FUNCTION
// ========================================
function logout() {
    sessionStorage.removeItem('currentUser');
    window.location.href = 'signin-2.html';
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
