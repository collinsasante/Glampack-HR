// ========================================
// MOBILE MENU TOGGLE
// ========================================
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    const menuButton = document.getElementById('mobileMenuButton');
    const icon = menuButton.querySelector('i');

    mobileMenu.classList.toggle('open');

    // Toggle icon between bars and times
    if (mobileMenu.classList.contains('open')) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
    } else {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
    }
}

// ========================================
// AUTHENTICATION CHECK
// ========================================
if (!requireAuth()) {
    // Will redirect automatically
}

const currentUser = getCurrentUser();

// Check if user is admin
async function checkAdminAccess() {
    try {
        const employee = await getEmployee(currentUser.id);

        if (employee && employee.fields) {
            const role = employee.fields['Role'] || '';
            if (role !== 'Admin' && role !== 'HR') {
                alert('Access denied. Admin privileges required.');
                window.location.href = 'dashboard.html';
                return false;
            }
            return true;
        } else {
            throw new Error('Failed to fetch employee data');
        }
    } catch (error) {

        window.location.href = 'dashboard.html';
        return false;
    }
}

// Display user info
function updateUserInfo() {
    const userInfoText = `Welcome, ${currentUser.name} (Admin)`;
    const userInfoElement = document.getElementById('userInfo');
    const userInfoMobileElement = document.getElementById('userInfoMobile');
    if (userInfoElement && currentUser) {
        userInfoElement.textContent = userInfoText;
    }
    if (userInfoMobileElement && currentUser) {
        userInfoMobileElement.textContent = userInfoText;
    }
}
updateUserInfo();

// ========================================
// AIRTABLE CONFIGURATION
// ========================================
// Configuration is loaded from config.js
// Make sure to include <script src="config.js"></script> before this file

// ========================================
// GLOBAL VARIABLES
// ========================================
let allEmployees = [];
let allLeaveRequests = [];
let allAttendanceRecords = [];

// ========================================
// TAB SWITCHING
// ========================================
function switchTab(tabName) {
    // Hide all content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });

    // Remove active class from all tabs
    document.querySelectorAll('[id^="tab-"]').forEach(tab => {
        tab.classList.remove('tab-active');
    });

    // Show selected content and activate tab
    document.getElementById(`content-${tabName}`).classList.remove('hidden');
    document.getElementById(`tab-${tabName}`).classList.add('tab-active');

    // Load data based on tab
    if (tabName === 'employees') {
        loadEmployees();
    } else if (tabName === 'leave') {
        loadLeaveRequests();
    } else if (tabName === 'attendance') {
        // Ensure employees are loaded first for the filter dropdown
        if (allEmployees.length === 0) {
            loadEmployees().then(() => loadAttendanceRecords());
        } else {
            loadAttendanceRecords();
        }
    } else if (tabName === 'reports') {
        populateReportFilters();
    }
}

// ========================================
// EMPLOYEE MANAGEMENT
// ========================================
async function loadEmployees() {
    try {
        // Note: Worker API doesn't support sort parameters yet, so we'll sort client-side
        const data = await getEmployees();
        allEmployees = data.records || [];

        // Sort by Full Name
        allEmployees.sort((a, b) => {
            const nameA = (a.fields['Full Name'] || '').toLowerCase();
            const nameB = (b.fields['Full Name'] || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });

        displayEmployees(allEmployees);
        populateEmployeeFilters();
    } catch (error) {

        document.getElementById('employeesTableBody').innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-4 text-center text-red-600">
                    Error loading employees. Please try again.
                </td>
            </tr>
        `;
    }
}

function displayEmployees(employees) {
    const tbody = document.getElementById('employeesTableBody');

    // Update total employee count
    const totalCountElement = document.getElementById('totalEmployeesCount');
    if (totalCountElement) {
        totalCountElement.textContent = employees.length;
    }

    if (employees.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                    No employees found
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = employees.map(emp => {
        const fields = emp.fields;
        const statusColors = {
            'Permanent': 'bg-green-100 text-green-800',
            'Intern': 'bg-blue-100 text-blue-800',
            'National Service Personnel': 'bg-purple-100 text-purple-800',
            'Independent Contractor': 'bg-yellow-100 text-yellow-800'
        };

        const roleColors = {
            'Employee': 'bg-gray-100 text-gray-800',
            'Admin': 'bg-red-100 text-red-800',
            'HR': 'bg-blue-100 text-blue-800'
        };

        return `
            <tr class="hover:bg-gray-50 cursor-pointer transition-colors" onclick='viewEmployeeDetails(${JSON.stringify(emp).replace(/'/g, "&#39;")})'>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${fields['Full Name'] || '--'}</div>
                    <div class="text-xs text-gray-500">${fields['Email'] || '--'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${fields['Job Title'] || '--'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${fields['Department'] || '--'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${fields['Employment Type'] || '--'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${roleColors[fields['Role']] || 'bg-gray-100 text-gray-800'}">
                        ${fields['Role'] || '--'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2" onclick="event.stopPropagation()">
                    <button onclick='viewEmployeeDetails(${JSON.stringify(emp).replace(/'/g, "&#39;")})' class="text-blue-600 hover:text-blue-900" title="View Full Profile">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick='editEmployee(${JSON.stringify(emp).replace(/'/g, "&#39;")})' class="text-red-600 hover:text-red-900" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="toggleEmployeeStatus('${emp.id}', '${fields['Full Name']}', '${fields['Account Status'] || 'Active'}')" class="${fields['Account Status'] === 'Inactive' ? 'text-green-600 hover:text-green-900' : 'text-orange-600 hover:text-orange-900'}" title="${fields['Account Status'] === 'Inactive' ? 'Activate Account' : 'Deactivate Account'}">
                        <i class="fas fa-${fields['Account Status'] === 'Inactive' ? 'toggle-on' : 'toggle-off'}"></i>
                    </button>
                    <button onclick="deleteEmployeeHandler('${emp.id}', '${fields['Full Name']}')" class="text-red-600 hover:text-red-900" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function filterEmployees() {
    const searchTerm = document.getElementById('employeeSearch').value.toLowerCase();
    const department = document.getElementById('departmentFilter').value;

    const filtered = allEmployees.filter(emp => {
        const fields = emp.fields;
        const matchesSearch = (fields['Full Name'] || '').toLowerCase().includes(searchTerm) ||
                            (fields['Email'] || '').toLowerCase().includes(searchTerm);
        const matchesDepartment = !department || fields['Department'] === department;
        return matchesSearch && matchesDepartment;
    });

    displayEmployees(filtered);
}

function populateEmployeeFilters() {
    // Populate attendance filter
    const select = document.getElementById('attendanceEmployeeFilter');
    select.innerHTML = '<option value="">All Employees</option>';
    allEmployees.forEach(emp => {
        const option = document.createElement('option');
        option.value = emp.id;
        option.textContent = emp.fields['Full Name'];
        select.appendChild(option);
    });
}

function openAddEmployeeModal() {
    document.getElementById('modalTitle').textContent = 'Add Employee';
    document.getElementById('employeeForm').reset();
    document.getElementById('employeeId').value = '';

    // Show password fields for new employee
    const passwordFields = document.querySelectorAll('#empPassword, #empConfirmPassword');
    passwordFields.forEach(field => {
        field.closest('div').style.display = 'block';
        field.setAttribute('required', 'required');
    });

    document.getElementById('employeeModal').classList.add('active');
}

function editEmployee(employee) {
    document.getElementById('modalTitle').textContent = 'Edit Employee';
    document.getElementById('employeeId').value = employee.id;
    document.getElementById('empFullName').value = employee.fields['Full Name'] || '';
    document.getElementById('empEmail').value = employee.fields['Email'] || '';
    document.getElementById('empStatus').value = employee.fields['Status'] || '';
    document.getElementById('empRole').value = employee.fields['Role'] || 'Employee';

    // Populate employment details
    document.getElementById('empJobTitle').value = employee.fields['Job Title'] || '';
    document.getElementById('empDepartment').value = employee.fields['Department'] || '';
    document.getElementById('empEmploymentType').value = employee.fields['Employment Type'] || '';
    document.getElementById('empJoiningDate').value = employee.fields['Joining Date'] || '';
    document.getElementById('empSalary').value = employee.fields['Salary'] || '';

    // Populate bank details
    document.getElementById('empBankName').value = employee.fields['Bank Name'] || '';
    document.getElementById('empBankAccountNumber').value = employee.fields['Bank Account Number'] || '';
    document.getElementById('empBankBranch').value = employee.fields['Bank Branch'] || '';

    // Populate personal details
    document.getElementById('empPhoneNumber').value = employee.fields['Phone Number'] || '';
    document.getElementById('empDateOfBirth').value = employee.fields['Date of Birth'] || '';
    document.getElementById('empGhanaCardNumber').value = employee.fields['Ghana Card Number'] || '';
    document.getElementById('empCity').value = employee.fields['City'] || '';
    document.getElementById('empCountry').value = employee.fields['Country'] || '';
    document.getElementById('empAddress').value = employee.fields['Address'] || '';

    // Hide password fields when editing (don't allow changing password from here)
    const passwordFields = document.querySelectorAll('#empPassword, #empConfirmPassword');
    passwordFields.forEach(field => {
        field.closest('div').style.display = 'none';
        field.removeAttribute('required');
    });

    document.getElementById('employeeModal').classList.add('active');
}

function closeEmployeeModal() {
    document.getElementById('employeeModal').classList.remove('active');
}

// View full employee details in a modal
function viewEmployeeDetails(employee) {
    const fields = employee.fields;

    // Create modal HTML
    const modalHTML = `
        <div id="viewEmployeeModal" class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <!-- Header -->
                <div class="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-t-2xl flex justify-between items-start">
                    <div>
                        <h2 class="text-2xl font-bold text-white">${fields['Full Name'] || 'N/A'}</h2>
                        <p class="text-gray-900 mt-1 font-medium">${fields['Job Title'] || 'N/A'} • ${fields['Department'] || 'N/A'}</p>
                    </div>
                    <button onclick="closeViewEmployeeModal()" class="text-red-600 hover:text-red-800 bg-white rounded-full p-2 transition-colors">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>

                <!-- Content -->
                <div class="p-6 space-y-6">
                    <!-- Personal Information -->
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <i class="fas fa-user mr-2 text-red-600"></i>
                            Personal Information
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                            <div>
                                <p class="text-sm text-gray-600">Full Name</p>
                                <p class="font-medium text-gray-900">${fields['Full Name'] || '--'}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600">Email</p>
                                <p class="font-medium text-gray-900">${fields['Email'] || '--'}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600">Phone Number</p>
                                <p class="font-medium text-gray-900">${fields['Phone Number'] || '--'}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600">Date of Birth</p>
                                <p class="font-medium text-gray-900">${fields['Date of Birth'] || '--'}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600">Ghana Card Number</p>
                                <p class="font-medium text-gray-900">${fields['Ghana Card Number'] || '--'}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600">Address</p>
                                <p class="font-medium text-gray-900">${fields['Address'] || '--'}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600">City</p>
                                <p class="font-medium text-gray-900">${fields['City'] || '--'}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600">Country</p>
                                <p class="font-medium text-gray-900">${fields['Country'] || '--'}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Employment Details -->
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <i class="fas fa-briefcase mr-2 text-red-600"></i>
                            Employment Details
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                            <div>
                                <p class="text-sm text-gray-600">Job Title</p>
                                <p class="font-medium text-gray-900">${fields['Job Title'] || '--'}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600">Department</p>
                                <p class="font-medium text-gray-900">${fields['Department'] || '--'}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600">Employment Type</p>
                                <p class="font-medium text-gray-900">${fields['Employment Type'] || '--'}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600">Status</p>
                                <p class="font-medium text-gray-900">${fields['Status'] || '--'}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600">Role</p>
                                <p class="font-medium text-gray-900">${fields['Role'] || '--'}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600">Joining Date</p>
                                <p class="font-medium text-gray-900">${fields['Joining Date'] || '--'}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600">Monthly Salary</p>
                                <p class="font-medium text-gray-900">${fields['Salary'] ? 'GH₵ ' + parseFloat(fields['Salary']).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--'}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Bank Details -->
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <i class="fas fa-university mr-2 text-red-600"></i>
                            Bank Details
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                            <div>
                                <p class="text-sm text-gray-600">Bank Name</p>
                                <p class="font-medium text-gray-900">${fields['Bank Name'] || '--'}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600">Account Number</p>
                                <p class="font-medium text-gray-900">${fields['Bank Account Number'] || '--'}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600">Bank Branch</p>
                                <p class="font-medium text-gray-900">${fields['Bank Branch'] || '--'}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Leave Balances -->
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <i class="fas fa-calendar-check mr-2 text-red-600"></i>
                            Leave Balances
                        </h3>
                        <div class="grid grid-cols-1 gap-4 bg-gray-50 p-4 rounded-lg">
                            <div>
                                <p class="text-sm text-gray-600">Annual Leave Balance</p>
                                <p class="font-medium text-gray-900">${fields['Annual Leave Balance'] !== undefined ? fields['Annual Leave Balance'] + ' days' : '20 days'}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Emergency Contacts -->
                    ${fields['Emergency Contact Name'] || fields['Emergency Contact Phone'] ? `
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <i class="fas fa-phone-alt mr-2 text-red-600"></i>
                            Emergency Contacts
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                            <div>
                                <p class="text-sm text-gray-600">Primary Contact Name</p>
                                <p class="font-medium text-gray-900">${fields['Emergency Contact Name'] || '--'}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600">Primary Contact Phone</p>
                                <p class="font-medium text-gray-900">${fields['Emergency Contact Phone'] || '--'}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600">Primary Contact Relationship</p>
                                <p class="font-medium text-gray-900">${fields['Emergency Contact Relationship'] || '--'}</p>
                            </div>
                            ${fields['Secondary Contact Name'] ? `
                            <div>
                                <p class="text-sm text-gray-600">Secondary Contact Name</p>
                                <p class="font-medium text-gray-900">${fields['Secondary Contact Name'] || '--'}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600">Secondary Contact Phone</p>
                                <p class="font-medium text-gray-900">${fields['Secondary Contact Phone'] || '--'}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600">Secondary Contact Relationship</p>
                                <p class="font-medium text-gray-900">${fields['Secondary Contact Relationship'] || '--'}</p>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    ` : ''}
                </div>

                <!-- Footer -->
                <div class="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end space-x-3">
                    <button onclick="closeViewEmployeeModal()" class="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                        Close
                    </button>
                    <button onclick="closeViewEmployeeModal(); openEditEmployeeFromView('${employee.id}')" class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                        <i class="fas fa-edit mr-2"></i>Edit Employee
                    </button>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('viewEmployeeModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeViewEmployeeModal() {
    const modal = document.getElementById('viewEmployeeModal');
    if (modal) {
        modal.remove();
    }
}

// Helper function to open edit modal from view modal
function openEditEmployeeFromView(employeeId) {
    // Find the employee from the allEmployees array
    const employee = allEmployees.find(emp => emp.id === employeeId);
    if (employee) {
        editEmployee(employee);
    }
}

document.getElementById('employeeForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    // Get form elements with null checks
    const fullNameEl = document.getElementById('empFullName');
    const emailEl = document.getElementById('empEmail');
    const statusEl = document.getElementById('empStatus');
    const roleEl = document.getElementById('empRole');
    const passwordEl = document.getElementById('empPassword');
    const confirmPasswordEl = document.getElementById('empConfirmPassword');
    const employeeIdEl = document.getElementById('employeeId');

    // Validate required elements exist
    if (!fullNameEl || !emailEl || !statusEl || !roleEl || !employeeIdEl) {

        alert('Error: Form fields not found. Please refresh the page.');
        return;
    }

    const employeeId = employeeIdEl.value;

    // For new employees, validate passwords
    if (!employeeId) {
        if (!passwordEl || !confirmPasswordEl) {
            alert('Error: Password fields not found. Please refresh the page.');
            return;
        }

        const password = passwordEl.value;
        const confirmPassword = confirmPasswordEl.value;

        // Validate passwords match
        if (password !== confirmPassword) {
            alert('Passwords do not match. Please try again.');
            return;
        }

        // Validate password strength (minimum 6 characters)
        if (password.length < 6) {
            alert('Password must be at least 6 characters long.');
            return;
        }
    }

    const data = {
        'Full Name': fullNameEl.value,
        'Email': emailEl.value,
        'Status': statusEl.value,
        'Role': roleEl.value,
        'Annual Leave Balance': 20
    };

    // Add employment details if provided
    const jobTitleEl = document.getElementById('empJobTitle');
    const departmentEl = document.getElementById('empDepartment');
    const employmentTypeEl = document.getElementById('empEmploymentType');
    const joiningDateEl = document.getElementById('empJoiningDate');
    const salaryEl = document.getElementById('empSalary');

    if (jobTitleEl && jobTitleEl.value) {
        data['Job Title'] = jobTitleEl.value;
    }
    if (departmentEl && departmentEl.value) {
        data['Department'] = departmentEl.value;
    }
    if (employmentTypeEl && employmentTypeEl.value) {
        data['Employment Type'] = employmentTypeEl.value;
    }
    if (joiningDateEl && joiningDateEl.value) {
        data['Joining Date'] = joiningDateEl.value;
    }
    if (salaryEl && salaryEl.value) {
        data['Salary'] = parseFloat(salaryEl.value);
    }

    // Add bank details if provided
    const bankNameEl = document.getElementById('empBankName');
    const bankAccountNumberEl = document.getElementById('empBankAccountNumber');
    const bankBranchEl = document.getElementById('empBankBranch');

    if (bankNameEl && bankNameEl.value) {
        data['Bank Name'] = bankNameEl.value;
    }
    if (bankAccountNumberEl && bankAccountNumberEl.value) {
        data['Bank Account Number'] = bankAccountNumberEl.value;
    }
    if (bankBranchEl && bankBranchEl.value) {
        data['Bank Branch'] = bankBranchEl.value;
    }

    // Add personal details if provided
    const phoneNumberEl = document.getElementById('empPhoneNumber');
    const dateOfBirthEl = document.getElementById('empDateOfBirth');
    const ghanaCardNumberEl = document.getElementById('empGhanaCardNumber');
    const cityEl = document.getElementById('empCity');
    const addressEl = document.getElementById('empAddress');

    if (phoneNumberEl && phoneNumberEl.value) {
        data['Phone Number'] = phoneNumberEl.value;
    }
    if (dateOfBirthEl && dateOfBirthEl.value) {
        data['Date of Birth'] = dateOfBirthEl.value;
    }
    if (ghanaCardNumberEl && ghanaCardNumberEl.value) {
        data['Ghana Card Number'] = ghanaCardNumberEl.value;
    }
    if (cityEl && cityEl.value) {
        data['City'] = cityEl.value;
    }
    const countryEl = document.getElementById('empCountry');
    if (countryEl && countryEl.value) {
        data['Country'] = countryEl.value;
    }
    if (addressEl && addressEl.value) {
        data['Address'] = addressEl.value;
    }

    try {
        if (employeeId) {
            // Update existing employee
            await updateEmployee(employeeId, data);
            alert('Employee updated successfully!');
        } else {
            // Create new employee - add password
            data['Password'] = passwordEl.value;
            await createEmployee(data);
            alert('Employee added successfully! They can now sign in with their email and password.');
        }

        closeEmployeeModal();
        loadEmployees();
    } catch (error) {

        alert('Error saving employee. Please try again.');
    }
});

async function deleteEmployeeHandler(employeeId, employeeName) {
    if (!confirm(`Are you sure you want to delete ${employeeName}? This action cannot be undone.`)) {
        return;
    }

    try {
        await deleteEmployee(employeeId);
        alert('Employee deleted successfully!');
        loadEmployees();
    } catch (error) {

        alert('Error deleting employee. Please try again.');
    }
}

async function toggleEmployeeStatus(employeeId, employeeName, currentStatus) {
    const newStatus = currentStatus === 'Inactive' ? 'Active' : 'Inactive';
    const action = newStatus === 'Active' ? 'activate' : 'deactivate';

    if (!confirm(`Are you sure you want to ${action} ${employeeName}'s account?`)) {
        return;
    }

    try {
        await updateEmployee(employeeId, {
            'Account Status': newStatus
        });

        alert(`Employee account ${action}d successfully!${newStatus === 'Inactive' ? ' They will not be able to log in.' : ' They can now log in.'}`);
        loadEmployees();
    } catch (error) {

        alert('Error updating employee status. Please try again.');
    }
}

// ========================================
// LEAVE APPROVALS
// ========================================
let currentLeaveFilter = 'all';

async function loadLeaveRequests() {
    try {
        // Load all leave requests (no filter)
        const data = await getLeaveRequests();
        allLeaveRequests = data.records || [];

        // Sort by Start Date descending (client-side)
        allLeaveRequests.sort((a, b) => {
            const dateA = new Date(a.fields['Start Date'] || 0);
            const dateB = new Date(b.fields['Start Date'] || 0);
            return dateB - dateA;
        });

        // Apply current filter
        filterLeaveRequests(currentLeaveFilter);
    } catch (error) {

        document.getElementById('leaveRequestsBody').innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-4 text-center text-red-600">
                    Error loading leave requests. Please try again.
                </td>
            </tr>
        `;
    }
}

function filterLeaveRequests(status) {
    currentLeaveFilter = status;

    // Update button states
    document.getElementById('leaveFilterAll').className = status === 'all'
        ? 'px-4 py-2 bg-red-600 text-white rounded-lg font-semibold'
        : 'px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300';
    document.getElementById('leaveFilterPending').className = status === 'pending'
        ? 'px-4 py-2 bg-red-600 text-white rounded-lg font-semibold'
        : 'px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300';
    document.getElementById('leaveFilterApproved').className = status === 'approved'
        ? 'px-4 py-2 bg-red-600 text-white rounded-lg font-semibold'
        : 'px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300';
    document.getElementById('leaveFilterRejected').className = status === 'rejected'
        ? 'px-4 py-2 bg-red-600 text-white rounded-lg font-semibold'
        : 'px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300';

    // Filter requests
    let filteredRequests = allLeaveRequests;
    if (status !== 'all') {
        const statusMap = {
            'pending': 'Pending',
            'approved': 'Approved',
            'rejected': 'Rejected'
        };
        filteredRequests = allLeaveRequests.filter(req =>
            req.fields['Status'] === statusMap[status]
        );
    }

    displayLeaveRequests(filteredRequests);
}

async function displayLeaveRequests(requests) {
    const tbody = document.getElementById('leaveRequestsBody');

    if (requests.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-8 text-center text-gray-500">
                    No pending leave requests
                </td>
            </tr>
        `;
        return;
    }

    // Fetch employee names using Worker API
    const employeePromises = requests.map(async (req) => {
        if (req.fields['Employee'] && req.fields['Employee'][0]) {
            try {
                const employee = await getEmployee(req.fields['Employee'][0]);
                if (employee && employee.fields) {
                    return { id: req.id, name: employee.fields['Full Name'] };
                }
            } catch (error) {

            }
        }
        return { id: req.id, name: 'Unknown' };
    });

    const employeeNames = await Promise.all(employeePromises);
    const nameMap = Object.fromEntries(employeeNames.map(e => [e.id, e.name]));

    tbody.innerHTML = requests.map(req => {
        const fields = req.fields;
        const employeeName = nameMap[req.id] || 'Unknown';

        // Calculate days from dates if Days field doesn't exist
        let numberOfDays = fields['Days'] || fields['Number of Days'];
        if (!numberOfDays && fields['Start Date'] && fields['End Date']) {
            const start = new Date(fields['Start Date']);
            const end = new Date(fields['End Date']);
            numberOfDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        }

        return `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${employeeName}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${fields['Leave Type'] || '--'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${fields['Start Date'] || '--'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${fields['End Date'] || '--'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${numberOfDays || '--'}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm text-gray-900 max-w-xs truncate">${fields['Notes'] || fields['Reason'] || '--'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button onclick="approveLeave('${req.id}')" class="text-green-600 hover:text-green-900">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button onclick="rejectLeave('${req.id}')" class="text-red-600 hover:text-red-900">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

async function approveLeave(leaveId) {
    const comment = prompt('Add a comment (optional):');

    try {
        // Get the leave request details
        const leaveRequest = allLeaveRequests.find(req => req.id === leaveId);
        if (!leaveRequest) {
            alert('Leave request not found');
            return;
        }

        // Get employee ID
        const employeeId = leaveRequest.fields['Employee'] && leaveRequest.fields['Employee'][0];
        if (!employeeId) {
            alert('Employee information missing from leave request');
            return;
        }

        // Get employee details to get current balance
        const employee = await getEmployee(employeeId);
        if (!employee || !employee.fields) {
            alert('Failed to fetch employee details');
            return;
        }

        // Get number of days
        let numberOfDays = leaveRequest.fields['Days'] || leaveRequest.fields['Number of Days'];
        if (!numberOfDays && leaveRequest.fields['Start Date'] && leaveRequest.fields['End Date']) {
            const start = new Date(leaveRequest.fields['Start Date']);
            const end = new Date(leaveRequest.fields['End Date']);
            numberOfDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        }

        // Get leave type
        const leaveType = leaveRequest.fields['Leave Type'];

        // Update leave request status
        await updateLeaveRequest(leaveId, {
            'Status': 'Approved',
            'Admin Comments': comment || 'Approved by admin'
        });

        // Deduct from Annual Leave Balance for all leave types
        const currentAnnualBalance = employee.fields['Annual Leave Balance'] || 20;
        const newBalance = Math.max(0, currentAnnualBalance - numberOfDays);

        // Update employee's annual leave balance

        try {
            const updateResult = await updateEmployee(employeeId, {
                'Annual Leave Balance': newBalance
            });

        } catch (updateError) {

            alert(`Leave approved but failed to update balance. Error: ${updateError.message}`);
            loadLeaveRequests();
            return;
        }

        alert(`Leave approved!\n\nLeave Type: ${leaveType}\nDays: ${numberOfDays}\n\nAnnual Leave Balance:\n${currentAnnualBalance} → ${newBalance} days remaining`);

        loadLeaveRequests();
    } catch (error) {

        alert('Error approving leave. Please try again.');
    }
}

async function rejectLeave(leaveId) {
    const comment = prompt('Reason for rejection:');
    if (!comment) {
        alert('Please provide a reason for rejection.');
        return;
    }

    try {
        await updateLeaveRequest(leaveId, {
            'Status': 'Rejected',
            'Admin Comments': comment
        });

        alert('Leave request rejected!');
        loadLeaveRequests();
    } catch (error) {

        alert('Error rejecting leave. Please try again.');
    }
}

// ========================================
// LEAVE CALENDAR VIEW
// ========================================
let currentCalendarMonth = new Date();

function toggleLeaveView(view) {
    const listView = document.getElementById('leaveListView');
    const calendarView = document.getElementById('leaveCalendarView');
    const listBtn = document.getElementById('leaveViewList');
    const calendarBtn = document.getElementById('leaveViewCalendar');

    if (view === 'list') {
        listView.classList.remove('hidden');
        calendarView.classList.add('hidden');
        listBtn.classList.add('bg-white', 'text-red-600', 'shadow-sm');
        listBtn.classList.remove('text-gray-700');
        calendarBtn.classList.remove('bg-white', 'text-red-600', 'shadow-sm');
        calendarBtn.classList.add('text-gray-700');
    } else {
        listView.classList.add('hidden');
        calendarView.classList.remove('hidden');
        calendarBtn.classList.add('bg-white', 'text-red-600', 'shadow-sm');
        calendarBtn.classList.remove('text-gray-700');
        listBtn.classList.remove('bg-white', 'text-red-600', 'shadow-sm');
        listBtn.classList.add('text-gray-700');
        renderLeaveCalendar();
    }
}

// Removed old calendar month navigation functions

async function renderLeaveCalendar() {
    // Now renders upcoming leaves instead of calendar grid
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();

    // Update month header
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('leaveCalendarMonth').textContent = `${monthNames[month]} ${year}`;

    // Get calendar grid
    const grid = document.getElementById('leaveCalendarGrid');

    // Clear all existing content
    grid.innerHTML = '';

    // Add day headers
    const dayHeaders = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'text-center font-bold text-gray-700 py-4 bg-gray-100 border-b border-r border-gray-200';
        header.textContent = day;
        grid.appendChild(header);
    });

    // Get first day of month and total days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Get today's date for highlighting
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const todayDate = today.getDate();

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'border-r border-b border-gray-200 p-4 min-h-[120px] bg-gray-50';
        grid.appendChild(emptyCell);
    }

    // Get leave requests for this month
    const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${daysInMonth}`;

    // Filter leaves that fall within this month
    const monthLeaves = allLeaveRequests.filter(req => {
        const startDate = req.fields['Start Date'];
        const endDate = req.fields['End Date'];
        return startDate <= monthEnd && endDate >= monthStart;
    });

    // Calculate statistics
    const pendingCount = monthLeaves.filter(req => req.fields['Status'] === 'Pending').length;
    const approvedCount = monthLeaves.filter(req => req.fields['Status'] === 'Approved').length;
    const totalDays = monthLeaves.reduce((sum, req) => {
        const days = req.fields['Days'] || req.fields['Number of Days'] || 0;
        return sum + days;
    }, 0);

    // Update summary stats
    document.getElementById('calendarPendingCount').textContent = pendingCount;
    document.getElementById('calendarApprovedCount').textContent = approvedCount;
    document.getElementById('calendarTotalDays').textContent = totalDays;

    // Create cells for each day
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = isCurrentMonth && day === todayDate;

        const cell = document.createElement('div');
        cell.className = `border-r border-b border-gray-200 p-4 min-h-[120px] ${isToday ? 'bg-blue-50' : 'bg-white'} hover:bg-gray-100 transition-colors relative`;

        // Day number
        const dayNum = document.createElement('div');
        dayNum.className = `text-lg font-bold mb-3 ${isToday ? 'text-blue-600' : 'text-gray-800'}`;
        dayNum.textContent = day;
        if (isToday) {
            const todayBadge = document.createElement('span');
            todayBadge.className = 'ml-2 text-xs font-normal bg-blue-600 text-white px-2 py-0.5 rounded-full';
            todayBadge.textContent = 'Today';
            dayNum.appendChild(todayBadge);
        }
        cell.appendChild(dayNum);

        // Find leaves on this day
        const dayLeaves = monthLeaves.filter(req => {
            const startDate = req.fields['Start Date'];
            const endDate = req.fields['End Date'];
            return dateStr >= startDate && dateStr <= endDate;
        });

        // Display colored dots for each leave (grouped by status)
        if (dayLeaves.length > 0) {
            const dotsContainer = document.createElement('div');
            dotsContainer.className = 'flex flex-wrap gap-1.5';

            dayLeaves.forEach(req => {
                const status = req.fields['Status'] || 'Pending';
                let dotColor = '';

                if (status === 'Approved') {
                    dotColor = 'bg-green-500';
                } else if (status === 'Rejected') {
                    dotColor = 'bg-red-500';
                } else {
                    dotColor = 'bg-yellow-400';
                }

                const dot = document.createElement('div');
                dot.className = `w-3 h-3 ${dotColor} rounded-full shadow-sm cursor-pointer hover:scale-125 transition-transform`;
                dot.title = `${req.fields['Leave Type'] || 'Leave'} - ${status}`;
                dotsContainer.appendChild(dot);
            });

            cell.appendChild(dotsContainer);

            // Show count if more than 6 dots
            if (dayLeaves.length > 6) {
                const countBadge = document.createElement('div');
                countBadge.className = 'mt-2 text-xs text-gray-600 font-medium';
                countBadge.textContent = `${dayLeaves.length} employees`;
                cell.appendChild(countBadge);
            }
        }

        grid.appendChild(cell);
    }

    // Render schedule list below calendar
    renderLeaveScheduleList(monthLeaves);
}

async function renderLeaveScheduleList(monthLeaves) {
    const listContainer = document.getElementById('leaveScheduleList');

    if (monthLeaves.length === 0) {
        listContainer.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <i class="fas fa-calendar-times text-3xl mb-2"></i>
                <p>No leave scheduled for this month</p>
            </div>
        `;
        return;
    }

    // Sort by start date
    monthLeaves.sort((a, b) => {
        const dateA = new Date(a.fields['Start Date']);
        const dateB = new Date(b.fields['Start Date']);
        return dateA - dateB;
    });

    // Fetch employee names
    const employeePromises = monthLeaves.map(async (req) => {
        if (req.fields['Employee'] && req.fields['Employee'][0]) {
            try {
                const employee = await getEmployee(req.fields['Employee'][0]);
                return { id: req.id, name: (employee && employee.fields && employee.fields['Full Name']) || 'Unknown' };
            } catch (error) {
                return { id: req.id, name: 'Unknown' };
            }
        }
        return { id: req.id, name: 'Unknown' };
    });

    const employeeNames = await Promise.all(employeePromises);
    const nameMap = Object.fromEntries(employeeNames.map(e => [e.id, e.name]));

    listContainer.innerHTML = monthLeaves.map(req => {
        const fields = req.fields;
        const status = fields['Status'] || 'Pending';
        const employeeName = nameMap[req.id];

        const statusClass = status === 'Approved' ? 'bg-green-100 text-green-800 border-green-300' :
                           status === 'Rejected' ? 'bg-red-100 text-red-800 border-red-300' :
                           'bg-yellow-100 text-yellow-800 border-yellow-300';

        // Calculate days
        let numberOfDays = fields['Days'] || fields['Number of Days'];
        if (!numberOfDays && fields['Start Date'] && fields['End Date']) {
            const start = new Date(fields['Start Date']);
            const end = new Date(fields['End Date']);
            numberOfDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        }

        return `
            <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                            <h5 class="font-semibold text-gray-900">${employeeName}</h5>
                            <span class="px-2 py-1 text-xs font-semibold rounded border ${statusClass}">
                                ${status}
                            </span>
                        </div>
                        <div class="text-sm text-gray-600 space-y-1">
                            <div><i class="fas fa-tag mr-2 text-red-600"></i>${fields['Leave Type'] || 'N/A'}</div>
                            <div><i class="fas fa-calendar mr-2 text-red-600"></i>${fields['Start Date']} to ${fields['End Date']} (${numberOfDays} days)</div>
                            ${fields['Reason'] ? `<div class="mt-2"><i class="fas fa-comment mr-2 text-red-600"></i>${fields['Reason']}</div>` : ''}
                        </div>
                    </div>
                    ${status === 'Pending' ? `
                    <div class="flex gap-2 ml-4">
                        <button
                            onclick="approveLeave('${req.id}')"
                            class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                            title="Approve"
                        >
                            <i class="fas fa-check"></i>
                        </button>
                        <button
                            onclick="rejectLeave('${req.id}')"
                            class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                            title="Reject"
                        >
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ========================================
// ANNOUNCEMENTS MANAGEMENT
// ========================================
let allAnnouncements = [];

async function loadAnnouncements() {
    try {
        const filter = document.getElementById('announcementFilter').value;
        const data = await getAnnouncements();

        allAnnouncements = data.records || [];

        // Filter by priority if not "all"
        let filteredAnnouncements = allAnnouncements;
        if (filter !== 'all') {
            filteredAnnouncements = allAnnouncements.filter(ann => ann.fields['Priority'] === filter);
        }

        displayAnnouncements(filteredAnnouncements);
    } catch (error) {

        document.getElementById('announcementsContainer').innerHTML = `
            <div class="text-center text-red-600 p-4">
                Error loading announcements. Please try again.
            </div>
        `;
    }
}

function displayAnnouncements(announcements) {
    const container = document.getElementById('announcementsContainer');

    if (!announcements || announcements.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <i class="fas fa-bullhorn text-6xl mb-4 opacity-50"></i>
                <p class="text-lg">No announcements yet</p>
                <p class="text-sm">Click "New Announcement" to create one</p>
            </div>
        `;
        return;
    }

    // Sort by date (newest first)
    announcements.sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));

    container.innerHTML = announcements.map(announcement => {
        const priority = announcement.fields['Priority'] || 'Medium';
        const title = announcement.fields['Title'] || 'Untitled';
        const message = announcement.fields['Message'] || '';
        const date = new Date(announcement.createdTime).toLocaleDateString();
        const author = announcement.fields['Posted By'] || 'Admin';

        // Priority colors
        const priorityColors = {
            'High': 'bg-red-100 text-red-800 border-red-300',
            'Medium': 'bg-yellow-100 text-yellow-800 border-yellow-300',
            'Low': 'bg-blue-100 text-blue-800 border-blue-300'
        };

        const priorityIcons = {
            'High': 'fa-exclamation-circle',
            'Medium': 'fa-info-circle',
            'Low': 'fa-flag'
        };

        return `
            <div class="border ${priorityColors[priority]} rounded-lg p-4">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-start gap-3 flex-1">
                        <i class="fas ${priorityIcons[priority]} text-2xl mt-1"></i>
                        <div class="flex-1">
                            <h4 class="font-bold text-lg">${title}</h4>
                            <p class="text-sm opacity-75 mb-2">Posted by ${author} on ${date}</p>
                            <p class="whitespace-pre-wrap">${message}</p>
                        </div>
                    </div>
                    <div class="flex gap-2 ml-4">
                        <button onclick="editAnnouncement('${announcement.id}')" class="text-blue-600 hover:text-blue-800" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteAnnouncement('${announcement.id}')" class="text-red-600 hover:text-red-800" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function openAddAnnouncementModal() {
    document.getElementById('announcementModalTitle').textContent = 'New Announcement';
    document.getElementById('announcementForm').reset();
    document.getElementById('announcementId').value = '';
    document.getElementById('announcementModal').style.display = 'flex';
}

function closeAnnouncementModal() {
    document.getElementById('announcementModal').style.display = 'none';
    document.getElementById('announcementForm').reset();
}

async function editAnnouncement(announcementId) {
    const announcement = allAnnouncements.find(a => a.id === announcementId);
    if (!announcement) return;

    document.getElementById('announcementModalTitle').textContent = 'Edit Announcement';
    document.getElementById('announcementId').value = announcementId;
    document.getElementById('annTitle').value = announcement.fields['Title'] || '';
    document.getElementById('annMessage').value = announcement.fields['Message'] || '';
    document.getElementById('annPriority').value = announcement.fields['Priority'] || 'Medium';
    document.getElementById('announcementModal').style.display = 'flex';
}

async function deleteAnnouncement(announcementId) {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
        await deleteAnnouncementRecord(announcementId);
        alert('Announcement deleted successfully!');
        loadAnnouncements();
    } catch (error) {

        alert('Error deleting announcement. Please try again.');
    }
}

// Handle announcement form submission
document.getElementById('announcementForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const announcementId = document.getElementById('announcementId').value;

    // Get current user from session
    let authorName = 'Admin';
    try {
        const currentUser = getCurrentUser();

        if (currentUser && currentUser.name) {
            authorName = currentUser.name;
        }
    } catch (error) {

    }

    const data = {
        'Title': document.getElementById('annTitle').value,
        'Message': document.getElementById('annMessage').value,
        'Priority': document.getElementById('annPriority').value,
        'Posted By': authorName
    };

    try {
        if (announcementId) {
            // Update existing announcement
            await updateAnnouncement(announcementId, data);
            alert('Announcement updated successfully!');
        } else {
            // Create new announcement
            const result = await createAnnouncement(data);

            alert('Announcement posted successfully!');
        }

        closeAnnouncementModal();
        loadAnnouncements();
    } catch (error) {

        alert(`Error saving announcement: ${error.message}`);
    }
});

// ========================================
// ATTENDANCE RECORDS
// ========================================
async function loadAttendanceRecords() {
    const dateRange = document.getElementById('attendanceDateRange').value;
    const employeeId = document.getElementById('attendanceEmployeeFilter').value;
    const statusFilter = document.getElementById('attendanceStatusFilter').value;

    try {
        // Calculate date range
        let startDate, endDate;
        const today = new Date();

        switch(dateRange) {
            case 'today':
                startDate = endDate = today.toISOString().split('T')[0];
                break;
            case 'week':
                // Get start of week (Sunday)
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                startDate = weekStart.toISOString().split('T')[0];
                endDate = today.toISOString().split('T')[0];
                break;
            case 'month':
                // Get start of month
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                startDate = monthStart.toISOString().split('T')[0];
                endDate = today.toISOString().split('T')[0];
                break;
            case 'custom':
                const customDate = document.getElementById('attendanceDate').value;
                startDate = endDate = customDate || today.toISOString().split('T')[0];
                break;
            default:
                startDate = endDate = today.toISOString().split('T')[0];
        }

        // Build filter formula for date only
        let filterFormula;
        if (startDate === endDate) {
            filterFormula = `{Date} = '${startDate}'`;
        } else {
            // Use proper Airtable date comparison
            filterFormula = `AND({Date} >= '${startDate}', {Date} <= '${endDate}')`;
        }

        const data = await getAttendance(filterFormula);

        allAttendanceRecords = data.records || [];

        // Apply employee filter on client side
        let filteredRecords = allAttendanceRecords;
        if (employeeId) {
            filteredRecords = filteredRecords.filter(rec => {
                const empIds = rec.fields['Employee'];
                return empIds && empIds.includes(employeeId);
            });
        }

        // Apply status filter on client side
        if (statusFilter) {
            filteredRecords = filteredRecords.filter(rec => {
                const checkIn = rec.fields['Check In'];
                const checkOut = rec.fields['Check Out'];

                if (!checkIn || checkIn === '--:--') {
                    return statusFilter === 'incomplete';
                }

                // Check if they have checked out
                const hasCheckOut = checkOut && checkOut !== '--:--';

                if (statusFilter === 'incomplete') {
                    return !hasCheckOut;
                }

                // For present/late filters, only show records with both check in and check out
                if (!hasCheckOut) {
                    return false; // Don't show incomplete records in present/late filters
                }

                const [hour, minute] = checkIn.split(':').map(Number);
                if (statusFilter === 'present') {
                    return hour < 8 || (hour === 8 && minute <= 30);
                } else if (statusFilter === 'late') {
                    return hour > 8 || (hour === 8 && minute > 30);
                }

                return true;
            });
        }

        await displayAttendanceRecords(filteredRecords);
        updateAttendanceStats(filteredRecords);
    } catch (error) {

        document.getElementById('attendanceRecordsBody').innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-4 text-center text-red-600">
                    Error loading attendance records. Please try again.
                </td>
            </tr>
        `;
    }
}

// Update attendance statistics
async function updateAttendanceStats(records) {
    // Get today's date for "Present Today" and "Late Today" stats
    const today = new Date().toISOString().split('T')[0];

    // Filter records for today only for Present/Late counts
    const todayRecords = allAttendanceRecords.filter(rec => rec.fields['Date'] === today);

    const presentToday = todayRecords.filter(rec => {
        const checkIn = rec.fields['Check In'];
        const checkOut = rec.fields['Check Out'];
        // Only count as present if they checked in AND checked out
        if (!checkIn || checkIn === '--:--' || !checkOut || checkOut === '--:--') return false;
        const [hour, minute] = checkIn.split(':').map(Number);
        return hour < 8 || (hour === 8 && minute <= 30);
    }).length;

    const lateToday = todayRecords.filter(rec => {
        const checkIn = rec.fields['Check In'];
        const checkOut = rec.fields['Check Out'];
        // Only count as late if they checked in AND checked out
        if (!checkIn || checkIn === '--:--' || !checkOut || checkOut === '--:--') return false;
        const [hour, minute] = checkIn.split(':').map(Number);
        return hour > 8 || (hour === 8 && minute > 30);
    }).length;

    // Calculate average hours from the currently displayed records (filtered view)
    let totalHours = 0;
    let recordsWithCheckout = 0;
    records.forEach(rec => {
        const checkIn = rec.fields['Check In'];
        const checkOut = rec.fields['Check Out'];
        if (checkIn && checkOut && checkIn !== '--:--' && checkOut !== '--:--') {
            const [inHour, inMin] = checkIn.split(':').map(Number);
            const [outHour, outMin] = checkOut.split(':').map(Number);
            const hours = (outHour + outMin/60) - (inHour + inMin/60);
            if (hours > 0 && hours < 24) { // Sanity check
                totalHours += hours;
                recordsWithCheckout++;
            }
        }
    });
    const avgHours = recordsWithCheckout > 0 ? (totalHours / recordsWithCheckout).toFixed(1) : '0.0';

    // Attendance rate for today
    const totalPresent = presentToday + lateToday;
    const totalEmployees = allEmployees.length;
    const attendanceRate = totalEmployees > 0 ? Math.round((totalPresent / totalEmployees) * 100) : 0;

    // Update UI
    document.getElementById('statPresentToday').textContent = presentToday;
    document.getElementById('statLateToday').textContent = lateToday;
    document.getElementById('statAvgHours').textContent = `${avgHours}h`;
    document.getElementById('statAttendanceRate').textContent = `${attendanceRate}%`;
}

async function displayAttendanceRecords(records) {
    const tbody = document.getElementById('attendanceRecordsBody');

    if (records.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-8 text-center text-gray-500">
                    No attendance records found for selected filters
                </td>
            </tr>
        `;
        return;
    }

    // Fetch employee names using Worker API
    const employeePromises = records.map(async (rec) => {
        if (rec.fields['Employee'] && rec.fields['Employee'][0]) {
            try {
                const employee = await getEmployee(rec.fields['Employee'][0]);
                if (employee && employee.fields) {
                    return { id: rec.id, name: employee.fields['Full Name'], empId: rec.fields['Employee'][0] };
                }
            } catch (error) {

            }
        }
        return { id: rec.id, name: 'Unknown', empId: '' };
    });

    const employeeNames = await Promise.all(employeePromises);
    const nameMap = Object.fromEntries(employeeNames.map(e => [e.id, { name: e.name, empId: e.empId }]));

    tbody.innerHTML = records.map(rec => {
        const fields = rec.fields;
        const employeeInfo = nameMap[rec.id] || { name: 'Unknown', empId: '' };

        // Trim and normalize check in/out values
        const checkInRaw = fields['Check In'];
        const checkOutRaw = fields['Check Out'];
        const checkIn = (checkInRaw && checkInRaw.trim()) || '--:--';
        const checkOut = (checkOutRaw && checkOutRaw.trim()) || '--:--';

        let status = 'Absent';
        let statusClass = 'bg-red-100 text-red-800';
        let hours = '--';

        // Check if there's a valid check-in
        if (checkIn && checkIn !== '--:--' && checkIn !== '') {
            // Check if there's a valid checkout
            const hasValidCheckout = checkOut && checkOut !== '--:--' && checkOut !== '' && checkOut !== null && checkOut !== 'null';

            if (hasValidCheckout) {
                // Complete attendance - determine if on time or late
                const [hour, minute] = checkIn.split(':').map(Number);
                if (hour < 8 || (hour === 8 && minute <= 30)) {
                    status = 'On Time';
                    statusClass = 'bg-green-100 text-green-800';
                } else {
                    status = 'Late';
                    statusClass = 'bg-yellow-100 text-yellow-800';
                }

                // Calculate hours
                const [inHour, inMin] = checkIn.split(':').map(Number);
                const [outHour, outMin] = checkOut.split(':').map(Number);
                const totalHours = (outHour + outMin/60) - (inHour + inMin/60);
                if (totalHours > 0 && totalHours < 24) {
                    hours = totalHours.toFixed(1) + 'h';
                }
            } else {
                // Checked in but not checked out yet
                status = 'Incomplete';
                statusClass = 'bg-gray-100 text-gray-800';
            }
        }

        const location = fields['Check In Location'] || '--';

        return `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${employeeInfo.name}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${fields['Date'] || '--'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${checkIn}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${checkOut}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${hours}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                        ${status}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-500">${location}</div>
                </td>
            </tr>
        `;
    }).join('');
}

function editAttendance(record, employeeName) {
    document.getElementById('attendanceId').value = record.id;
    document.getElementById('attEmployee').value = employeeName;
    document.getElementById('attDate').value = record.fields['Date'] || '';
    document.getElementById('attCheckIn').value = record.fields['Check In'] || '';
    document.getElementById('attCheckOut').value = record.fields['Check Out'] || '';
    document.getElementById('attendanceModal').classList.add('active');
}

function closeAttendanceModal() {
    document.getElementById('attendanceModal').classList.remove('active');
}

document.getElementById('attendanceForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const attendanceId = document.getElementById('attendanceId').value;
    const checkIn = document.getElementById('attCheckIn').value;
    const checkOut = document.getElementById('attCheckOut').value;

    try {
        await updateAttendance(attendanceId, {
            'Check In': checkIn,
            'Check Out': checkOut
        });

        alert('Attendance record updated successfully!');
        closeAttendanceModal();
        loadAttendanceRecords();
    } catch (error) {

        alert('Error updating attendance. Please try again.');
    }
});

// ========================================
// REPORTS
// ========================================
function populateReportFilters() {
    // Populate month filters
    const currentDate = new Date();
    const monthSelects = [document.getElementById('reportMonth'), document.getElementById('payrollReportMonth')];

    monthSelects.forEach(select => {
        if (select) {
            select.innerHTML = '';
            for (let i = 0; i < 12; i++) {
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
                const option = document.createElement('option');
                option.value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                option.textContent = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                if (i === 0) option.selected = true;
                select.appendChild(option);
            }
        }
    });

    // Set default date for attendance records
    document.getElementById('attendanceDate').value = new Date().toISOString().split('T')[0];
}

async function generateEmployeeReport() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.setTextColor(220, 38, 38);
        doc.text('Employee Report', 105, 20, { align: 'center' });

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 30, { align: 'center' });

        // Fetch all employees using Worker API
        const data = await getEmployees();
        const tableData = data.records.map(emp => {
            const fields = emp.fields;
            return [
                fields['Full Name'] || '--',
                fields['Email'] || '--',
                fields['Department'] || '--',
                fields['Job Title'] || '--',
                fields['Status'] || '--'
            ];
        });

        doc.autoTable({
            startY: 40,
            head: [['Name', 'Email', 'Department', 'Job Title', 'Status']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [220, 38, 38] },
            styles: { fontSize: 9 }
        });

        doc.save(`Employee_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {

        alert('Error generating report. Please try again.');
    }
}

async function generateAttendanceReport() {
    const selectedMonth = document.getElementById('reportMonth').value;
    const [year, month] = selectedMonth.split('-');

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l'); // Landscape

        // Header
        doc.setFontSize(20);
        doc.setTextColor(220, 38, 38);
        doc.text('Attendance Report', 148, 20, { align: 'center' });

        const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Period: ${monthName}`, 148, 30, { align: 'center' });

        // Fetch attendance records using Worker API
        const filterFormula = `AND(YEAR({Date})=${year},MONTH({Date})=${parseInt(month)})`;
        const data = await getAttendance(filterFormula);

        // Fetch employee names using Worker API
        const tableData = await Promise.all(data.records.map(async (rec) => {
            const fields = rec.fields;
            let employeeName = 'Unknown';

            if (fields['Employee'] && fields['Employee'][0]) {
                try {
                    const employee = await getEmployee(fields['Employee'][0]);
                    if (employee && employee.fields) {
                        employeeName = employee.fields['Full Name'];
                    }
                } catch (error) {

                }
            }

            return [
                employeeName,
                fields['Date'] || '--',
                fields['Check In'] || '--',
                fields['Check Out'] || '--'
            ];
        }));

        doc.autoTable({
            startY: 40,
            head: [['Employee', 'Date', 'Check In', 'Check Out']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [220, 38, 38] },
            styles: { fontSize: 9 }
        });

        doc.save(`Attendance_Report_${monthName.replace(' ', '_')}.pdf`);
    } catch (error) {

        alert('Error generating report. Please try again.');
    }
}

async function generateLeaveReport() {
    const year = document.getElementById('leaveReportYear').value;

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.setTextColor(220, 38, 38);
        doc.text('Leave Report', 105, 20, { align: 'center' });

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Year: ${year}`, 105, 30, { align: 'center' });

        // Fetch leave records using Worker API
        const filterFormula = `YEAR({Start Date})=${year}`;
        const data = await getLeaveRequests(filterFormula);

        // Fetch employee names using Worker API
        const tableData = await Promise.all(data.records.map(async (rec) => {
            const fields = rec.fields;
            let employeeName = 'Unknown';

            if (fields['Employee'] && fields['Employee'][0]) {
                try {
                    const employee = await getEmployee(fields['Employee'][0]);
                    if (employee && employee.fields) {
                        employeeName = employee.fields['Full Name'];
                    }
                } catch (error) {

                }
            }

            return [
                employeeName,
                fields['Leave Type'] || '--',
                fields['Start Date'] || '--',
                fields['End Date'] || '--',
                fields['Number of Days'] || '--',
                fields['Status'] || '--'
            ];
        }));

        doc.autoTable({
            startY: 40,
            head: [['Employee', 'Type', 'Start Date', 'End Date', 'Days', 'Status']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [220, 38, 38] },
            styles: { fontSize: 8 }
        });

        doc.save(`Leave_Report_${year}.pdf`);
    } catch (error) {

        alert('Error generating report. Please try again.');
    }
}

async function generatePayrollReport() {
    const selectedMonth = document.getElementById('payrollReportMonth').value;
    const [year, month] = selectedMonth.split('-');
    const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.setTextColor(220, 38, 38);
        doc.text('Payroll Report', 105, 20, { align: 'center' });

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Period: ${monthName}`, 105, 30, { align: 'center' });

        // Fetch payment records using Worker API
        const filterFormula = `AND(YEAR({Payment Date})=${year},MONTH({Payment Date})=${parseInt(month)})`;
        const data = await getPayroll(filterFormula);

        // Fetch employee names and create table using Worker API
        const tableData = await Promise.all(data.records.map(async (rec) => {
            const fields = rec.fields;
            let employeeName = 'Unknown';

            if (fields['Employee'] && fields['Employee'][0]) {
                try {
                    const employee = await getEmployee(fields['Employee'][0]);
                    if (employee && employee.fields) {
                        employeeName = employee.fields['Full Name'];
                    }
                } catch (error) {

                }
            }

            return [
                employeeName,
                `GH₵${(fields['Gross Salary'] || 0).toFixed(2)}`,
                `GH₵${(fields['Total Deductions'] || 0).toFixed(2)}`,
                `GH₵${(fields['Net Salary'] || 0).toFixed(2)}`,
                fields['Status'] || '--'
            ];
        }));

        // Calculate totals
        const totalGross = data.records.reduce((sum, rec) => sum + (rec.fields['Gross Salary'] || 0), 0);
        const totalDeductions = data.records.reduce((sum, rec) => sum + (rec.fields['Total Deductions'] || 0), 0);
        const totalNet = data.records.reduce((sum, rec) => sum + (rec.fields['Net Salary'] || 0), 0);

        tableData.push([
            { content: 'TOTAL', styles: { fontStyle: 'bold' } },
            { content: `GH₵${totalGross.toFixed(2)}`, styles: { fontStyle: 'bold' } },
            { content: `GH₵${totalDeductions.toFixed(2)}`, styles: { fontStyle: 'bold' } },
            { content: `GH₵${totalNet.toFixed(2)}`, styles: { fontStyle: 'bold' } },
            ''
        ]);

        doc.autoTable({
            startY: 40,
            head: [['Employee', 'Gross Salary', 'Deductions', 'Net Salary', 'Status']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [220, 38, 38] },
            styles: { fontSize: 9 }
        });

        doc.save(`Payroll_Report_${monthName.replace(' ', '_')}.pdf`);
    } catch (error) {

        alert('Error generating report. Please try again.');
    }
}

// ========================================
// PAYROLL MANAGEMENT
// ========================================
let allPayrollRecords = [];
let customAllowances = [];
let customDeductions = [];

let allPayrollData = []; // Store all payroll with employee names

async function loadPayrollRecords() {
    try {
        // Load all payroll records
        const data = await getPayroll();
        allPayrollRecords = data.records || [];

        // Sort by payment date descending (most recent first)
        allPayrollRecords.sort((a, b) => {
            const dateA = new Date(a.fields['Payment Date'] || 0);
            const dateB = new Date(b.fields['Payment Date'] || 0);
            return dateB - dateA;
        });

        // Fetch employee names and store
        const employeePromises = allPayrollRecords.map(async (record) => {
            if (record.fields['Employee'] && record.fields['Employee'][0]) {
                try {
                    const employee = await getEmployee(record.fields['Employee'][0]);
                    return {
                        record: record,
                        employeeName: employee.fields['Full Name'] || 'Unknown',
                        employeeId: record.fields['Employee'][0]
                    };
                } catch (error) {
                    return { record: record, employeeName: 'Unknown', employeeId: '' };
                }
            }
            return { record: record, employeeName: 'Unknown', employeeId: '' };
        });

        allPayrollData = await Promise.all(employeePromises);

        displayPayrollRecords();
    } catch (error) {

        document.getElementById('payrollTableBody').innerHTML = `
            <tr>
                <td colspan="8" class="px-6 py-4 text-center text-red-600">
                    Error loading payroll records. Please try again.
                </td>
            </tr>
        `;
    }
}

// Filter payroll by employee search
function filterPayrollByEmployee() {
    applyPayrollFilters();
}

// Filter payroll by month
function filterPayrollByMonth() {
    applyPayrollFilters();
}

// Clear all payroll filters
function clearPayrollFilters() {
    document.getElementById('payrollEmployeeSearch').value = '';
    document.getElementById('payrollMonthFilter').value = '';
    applyPayrollFilters();
}

// Apply all filters
function applyPayrollFilters() {
    const searchTerm = document.getElementById('payrollEmployeeSearch').value.toLowerCase();
    const monthFilter = document.getElementById('payrollMonthFilter').value;

    let filteredData = allPayrollData;

    // Filter by employee name
    if (searchTerm) {
        filteredData = filteredData.filter(item =>
            item.employeeName.toLowerCase().includes(searchTerm)
        );
    }

    // Filter by month
    if (monthFilter) {
        filteredData = filteredData.filter(item =>
            item.record.fields['Month'] === monthFilter
        );
    }

    displayPayrollRecords(filteredData);
}

async function displayPayrollRecords(filteredData = null) {
    const tbody = document.getElementById('payrollTableBody');
    const dataToDisplay = filteredData || allPayrollData;

    if (dataToDisplay.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="px-6 py-12 text-center text-gray-500">
                    <i class="fas fa-receipt text-4xl mb-4"></i>
                    <p>No payroll records found</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = dataToDisplay.map(item => {
        const record = item.record;
        const fields = record.fields;
        const employeeName = item.employeeName;

        // Calculate values if not present (for calculated fields or manual calculation)
        const basicSalary = parseFloat(fields['Basic Salary'] || 0);
        const housingAllowance = parseFloat(fields['Housing Allowance'] || 0);
        const transportAllowance = parseFloat(fields['Transport Allowance'] || 0);
        const benefits = parseFloat(fields['Benefits'] || 0);
        const otherAllowances = parseFloat(fields['Other Allowances'] || 0);

        const totalAllowances = fields['Total Allowances']
            ? parseFloat(fields['Total Allowances'])
            : (housingAllowance + transportAllowance + benefits + otherAllowances);

        const grossSalary = fields['Gross Salary']
            ? parseFloat(fields['Gross Salary'])
            : (basicSalary + totalAllowances);

        const incomeTax = parseFloat(fields['Income Tax'] || 0);
        const welfare = parseFloat(fields['Welfare'] || 0);
        const socialSecurity = parseFloat(fields['Social Security'] || 0);
        const healthInsurance = parseFloat(fields['Health Insurance'] || 0);
        const otherDeductions = parseFloat(fields['Other Deductions'] || 0);
        const deductions = parseFloat(fields['Deductions'] || 0);

        const totalDeductions = fields['Total Deductions']
            ? parseFloat(fields['Total Deductions'])
            : (deductions || (incomeTax + welfare + socialSecurity + healthInsurance + otherDeductions));

        const netSalary = fields['Net Salary'] || fields['Net Pay']
            ? parseFloat(fields['Net Salary'] || fields['Net Pay'] || 0)
            : (grossSalary - totalDeductions);

        // Use 'Pay Month' field instead of 'Month'
        const monthDisplay = fields['Pay Month'] || fields['Month'] || '--';

        return `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${employeeName}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${monthDisplay}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">GH₵${basicSalary.toFixed(2)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">GH₵${totalAllowances.toFixed(2)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">GH₵${totalDeductions.toFixed(2)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">GH₵${grossSalary.toFixed(2)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">GH₵${netSalary.toFixed(2)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick='editPayroll(${JSON.stringify(record).replace(/'/g, "&#39;")})' class="text-red-600 hover:text-red-900">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

async function openAddPayrollModal() {
    document.getElementById('payrollModalTitle').textContent = 'Create Payroll';
    document.getElementById('payrollForm').reset();
    document.getElementById('payrollId').value = '';

    // Reset custom arrays
    customAllowances = [];
    customDeductions = [];
    updateCustomAllowancesList();
    updateCustomDeductionsList();

    // Set default month to current month
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    document.getElementById('payrollMonth').value = currentMonth;

    // Populate employee dropdown
    const select = document.getElementById('payrollEmployee');
    select.innerHTML = '<option value="">Select Employee</option>';

    try {
        const data = await getEmployees();
        const employees = data.records || [];
        employees.sort((a, b) => {
            const nameA = (a.fields['Full Name'] || '').toLowerCase();
            const nameB = (b.fields['Full Name'] || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });

        employees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.id;
            option.textContent = emp.fields['Full Name'];
            select.appendChild(option);
        });
    } catch (error) {

    }

    // Add event listener to auto-populate from previous payroll or employee salary
    const payrollEmployeeSelect = document.getElementById('payrollEmployee');
    const payrollMonthInput = document.getElementById('payrollMonth');

    const autoPopulateHandler = async function() {
        const employeeId = payrollEmployeeSelect.value;
        const selectedMonth = payrollMonthInput.value;

        if (!employeeId || !selectedMonth) return;

        await autoPopulatePayrollData(employeeId, selectedMonth);
    };

    // Remove old listeners to prevent duplicates
    payrollEmployeeSelect.removeEventListener('change', autoPopulateHandler);
    payrollMonthInput.removeEventListener('change', autoPopulateHandler);

    // Add new listeners
    payrollEmployeeSelect.addEventListener('change', autoPopulateHandler);
    payrollMonthInput.addEventListener('change', autoPopulateHandler);

    document.getElementById('payrollModal').classList.add('active');
}

// Auto-populate payroll data from previous month or employee salary
async function autoPopulatePayrollData(employeeId, selectedMonth) {
    try {
        // Parse selected month
        const [year, month] = selectedMonth.split('-').map(Number);

        // Calculate previous month
        let prevYear = year;
        let prevMonth = month - 1;
        if (prevMonth === 0) {
            prevMonth = 12;
            prevYear = year - 1;
        }
        const previousMonth = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

        // Try to find payroll from previous month
        const filterFormula = `AND({Month} = '${previousMonth}', FIND('${employeeId}', ARRAYJOIN({Employee})))`;
        const payrollData = await getPayroll(filterFormula);

        if (payrollData.records && payrollData.records.length > 0) {
            // Found previous month's payroll - use it as template
            const prevPayroll = payrollData.records[0].fields;

            document.getElementById('basicSalary').value = prevPayroll['Basic Salary'] || 0;
            document.getElementById('housingAllowance').value = prevPayroll['Housing Allowance'] || 0;
            document.getElementById('transportAllowance').value = prevPayroll['Transport Allowance'] || 0;
            document.getElementById('benefits').value = prevPayroll['Benefits'] || 0;
            document.getElementById('otherAllowances').value = prevPayroll['Other Allowances'] || 0;
            document.getElementById('incomeTax').value = prevPayroll['Income Tax'] || 0;
            document.getElementById('welfare').value = prevPayroll['Welfare'] || 0;
            document.getElementById('socialSecurity').value = prevPayroll['Social Security'] || 0;
            document.getElementById('healthInsurance').value = prevPayroll['Health Insurance'] || 0;
            document.getElementById('otherDeductions').value = prevPayroll['Other Deductions'] || 0;

            // Populate custom allowances and deductions
            if (prevPayroll['Custom Allowances']) {
                try {
                    customAllowances = JSON.parse(prevPayroll['Custom Allowances']);
                    updateCustomAllowancesList();
                } catch (e) {
                    customAllowances = [];
                }
            }

            if (prevPayroll['Custom Deductions']) {
                try {
                    customDeductions = JSON.parse(prevPayroll['Custom Deductions']);
                    updateCustomDeductionsList();
                } catch (e) {
                    customDeductions = [];
                }
            }

            calculateNetSalary();

            // Show notification
            showPayrollNotification(`Payroll data loaded from ${previousMonth}. You can now modify allowances and deductions.`, 'info');
        } else {
            // No previous payroll - use employee's base salary
            const employee = await getEmployee(employeeId);
            if (employee && employee.fields && employee.fields['Salary']) {
                document.getElementById('basicSalary').value = employee.fields['Salary'];

                // Set default allowances (can be customized)
                document.getElementById('housingAllowance').value = 0;
                document.getElementById('transportAllowance').value = 0;
                document.getElementById('benefits').value = 0;
                document.getElementById('otherAllowances').value = 0;

                // Set default deductions (can be customized)
                document.getElementById('incomeTax').value = 0;
                document.getElementById('welfare').value = 0;
                document.getElementById('socialSecurity').value = 0;
                document.getElementById('healthInsurance').value = 0;
                document.getElementById('otherDeductions').value = 0;

                calculateNetSalary();

                showPayrollNotification('Basic salary loaded from employee profile. Please add allowances and deductions.', 'info');
            }
        }
    } catch (error) {

    }
}

// Show notification in payroll modal
function showPayrollNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `p-4 mb-4 rounded-lg ${type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-blue-50 text-blue-800 border border-blue-200'}`;
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-info-circle mr-2"></i>
            <span>${message}</span>
        </div>
    `;

    // Insert at the top of the form
    const form = document.getElementById('payrollForm');
    const firstChild = form.firstElementChild;
    form.insertBefore(notification, firstChild);

    // Remove after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

function closePayrollModal() {
    document.getElementById('payrollModal').classList.remove('active');
}

function editPayroll(record) {
    document.getElementById('payrollModalTitle').textContent = 'Edit Payroll';
    document.getElementById('payrollId').value = record.id;

    const fields = record.fields;
    document.getElementById('payrollEmployee').value = fields['Employee'] ? fields['Employee'][0] : '';
    document.getElementById('payrollMonth').value = fields['Month'] || '';
    document.getElementById('basicSalary').value = fields['Basic Salary'] || 0;
    document.getElementById('housingAllowance').value = fields['Housing Allowance'] || 0;
    document.getElementById('transportAllowance').value = fields['Transport Allowance'] || 0;
    document.getElementById('benefits').value = fields['Benefits'] || 0;
    document.getElementById('otherAllowances').value = fields['Other Allowances'] || 0;
    document.getElementById('incomeTax').value = fields['Income Tax'] || 0;
    document.getElementById('welfare').value = fields['Welfare'] || 0;
    document.getElementById('socialSecurity').value = fields['Social Security'] || 0;
    document.getElementById('healthInsurance').value = fields['Health Insurance'] || 0;
    document.getElementById('otherDeductions').value = fields['Other Deductions'] || 0;

    calculateNetSalary();
    document.getElementById('payrollModal').classList.add('active');
}

function calculateNetSalary() {
    // Get all allowances
    const basicSalary = parseFloat(document.getElementById('basicSalary').value) || 0;
    const housingAllowance = parseFloat(document.getElementById('housingAllowance').value) || 0;
    const transportAllowance = parseFloat(document.getElementById('transportAllowance').value) || 0;
    const benefits = parseFloat(document.getElementById('benefits').value) || 0;
    const otherAllowances = parseFloat(document.getElementById('otherAllowances').value) || 0;

    // Add custom allowances
    const customAllowancesTotal = customAllowances.reduce((sum, item) => sum + parseFloat(item.amount), 0);

    // Calculate total allowances and gross
    const totalAllowances = housingAllowance + transportAllowance + benefits + otherAllowances + customAllowancesTotal;
    const grossSalary = basicSalary + totalAllowances;

    // Get all deductions
    const incomeTax = parseFloat(document.getElementById('incomeTax').value) || 0;
    const welfare = parseFloat(document.getElementById('welfare').value) || 0;
    const socialSecurity = parseFloat(document.getElementById('socialSecurity').value) || 0;
    const healthInsurance = parseFloat(document.getElementById('healthInsurance').value) || 0;
    const otherDeductions = parseFloat(document.getElementById('otherDeductions').value) || 0;

    // Add custom deductions
    const customDeductionsTotal = customDeductions.reduce((sum, item) => sum + parseFloat(item.amount), 0);

    // Calculate total deductions and net
    const totalDeductions = incomeTax + welfare + socialSecurity + healthInsurance + otherDeductions + customDeductionsTotal;
    const netSalary = grossSalary - totalDeductions;

    // Update displays (check if elements exist first)
    const totalAllowancesEl = document.getElementById('totalAllowancesDisplay');
    const totalDeductionsEl = document.getElementById('totalDeductionsDisplay');
    const grossSalaryEl = document.getElementById('grossSalaryDisplay');
    const netSalaryEl = document.getElementById('netSalaryDisplay');

    if (totalAllowancesEl) totalAllowancesEl.textContent = `GH₵${totalAllowances.toFixed(2)}`;
    if (totalDeductionsEl) totalDeductionsEl.textContent = `GH₵${totalDeductions.toFixed(2)}`;
    if (grossSalaryEl) grossSalaryEl.textContent = `GH₵${grossSalary.toFixed(2)}`;
    if (netSalaryEl) netSalaryEl.textContent = `GH₵${netSalary.toFixed(2)}`;
}

// Custom Allowances Management
function addCustomAllowance() {
    document.getElementById('customAllowanceModal').classList.add('active');
}

function closeCustomAllowanceModal() {
    document.getElementById('customAllowanceModal').classList.remove('active');
    document.getElementById('customAllowanceForm').reset();
}

// Handle custom allowance form submission
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('customAllowanceForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            const name = document.getElementById('allowanceName').value;
            const amount = document.getElementById('allowanceAmount').value;

            if (name && amount && !isNaN(amount)) {
                customAllowances.push({ name, amount: parseFloat(amount) });
                updateCustomAllowancesList();
                calculateNetSalary();
                closeCustomAllowanceModal();
            }
        });
    }
});

function removeCustomAllowance(index) {
    customAllowances.splice(index, 1);
    updateCustomAllowancesList();
    calculateNetSalary();
}

function updateCustomAllowancesList() {
    const container = document.getElementById('customAllowancesList');
    if (!container) return;

    if (customAllowances.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-500 italic">No custom allowances added</p>';
        return;
    }

    container.innerHTML = customAllowances.map((item, index) => `
        <div class="flex justify-between items-center p-2 bg-green-50 rounded border border-green-200">
            <span class="text-sm">${item.name}: <strong>GH₵${parseFloat(item.amount).toFixed(2)}</strong></span>
            <button onclick="removeCustomAllowance(${index})" class="text-red-600 hover:text-red-800 text-sm">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

// Custom Deductions Management
function addCustomDeduction() {
    document.getElementById('customDeductionModal').classList.add('active');
}

function closeCustomDeductionModal() {
    document.getElementById('customDeductionModal').classList.remove('active');
    document.getElementById('customDeductionForm').reset();
    document.getElementById('recurringMonthsContainer').classList.add('hidden');
}

// Handle recurring checkbox toggle
document.addEventListener('DOMContentLoaded', function() {
    const recurringCheckbox = document.getElementById('isRecurring');
    if (recurringCheckbox) {
        recurringCheckbox.addEventListener('change', function() {
            const monthsContainer = document.getElementById('recurringMonthsContainer');
            if (this.checked) {
                monthsContainer.classList.remove('hidden');
                document.getElementById('recurringMonths').required = true;
            } else {
                monthsContainer.classList.add('hidden');
                document.getElementById('recurringMonths').required = false;
            }
        });
    }

    // Handle custom deduction form submission
    const deductionForm = document.getElementById('customDeductionForm');
    if (deductionForm) {
        deductionForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const name = document.getElementById('deductionName').value;
            const amount = document.getElementById('deductionAmount').value;
            const isRecurring = document.getElementById('isRecurring').checked;
            let months = 1;

            if (isRecurring) {
                months = parseInt(document.getElementById('recurringMonths').value) || 1;
            }

            if (name && amount && !isNaN(amount)) {
                customDeductions.push({
                    name,
                    amount: parseFloat(amount),
                    recurring: isRecurring,
                    months: months,
                    monthsRemaining: months
                });

                updateCustomDeductionsList();
                calculateNetSalary();
                closeCustomDeductionModal();
            }
        });
    }
});

function removeCustomDeduction(index) {
    customDeductions.splice(index, 1);
    updateCustomDeductionsList();
    calculateNetSalary();
}

function updateCustomDeductionsList() {
    const container = document.getElementById('customDeductionsList');
    if (!container) return;

    if (customDeductions.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-500 italic">No custom deductions added</p>';
        return;
    }

    container.innerHTML = customDeductions.map((item, index) => `
        <div class="flex justify-between items-center p-2 bg-red-50 rounded border border-red-200">
            <div class="text-sm">
                ${item.name}: <strong>GH₵${parseFloat(item.amount).toFixed(2)}</strong>
                ${item.recurring ? `<br><span class="text-xs text-gray-600">Recurring: ${item.monthsRemaining} of ${item.months} months remaining</span>` : ''}
            </div>
            <button onclick="removeCustomDeduction(${index})" class="text-red-600 hover:text-red-800 text-sm">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

// Form submission
document.getElementById('payrollForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const payrollId = document.getElementById('payrollId').value;

    // Calculate all values
    const basicSalary = parseFloat(document.getElementById('basicSalary').value) || 0;
    const housingAllowance = parseFloat(document.getElementById('housingAllowance').value) || 0;
    const transportAllowance = parseFloat(document.getElementById('transportAllowance').value) || 0;
    const benefits = parseFloat(document.getElementById('benefits').value) || 0;
    const otherAllowances = parseFloat(document.getElementById('otherAllowances').value) || 0;
    const customAllowancesTotal = customAllowances.reduce((sum, item) => sum + parseFloat(item.amount), 0);

    const incomeTax = parseFloat(document.getElementById('incomeTax').value) || 0;
    const welfare = parseFloat(document.getElementById('welfare').value) || 0;
    const socialSecurity = parseFloat(document.getElementById('socialSecurity').value) || 0;
    const healthInsurance = parseFloat(document.getElementById('healthInsurance').value) || 0;
    const otherDeductions = parseFloat(document.getElementById('otherDeductions').value) || 0;
    const customDeductionsTotal = customDeductions.reduce((sum, item) => sum + parseFloat(item.amount), 0);

    const totalAllowances = housingAllowance + transportAllowance + benefits + otherAllowances + customAllowancesTotal;
    const grossSalary = basicSalary + totalAllowances;
    const totalDeductions = incomeTax + welfare + socialSecurity + healthInsurance + otherDeductions + customDeductionsTotal;
    const netSalary = grossSalary - totalDeductions;

    // Convert month value (YYYY-MM) to month name for Pay Month dropdown
    const monthValue = document.getElementById('payrollMonth').value;
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const monthIndex = parseInt(monthValue.split('-')[1]) - 1;
    const payMonthName = monthNames[monthIndex];

    const payrollData = {
        'Employee': [document.getElementById('payrollEmployee').value],
        'Pay Month': payMonthName,  // Dropdown field for month name (January-December)
        'Month': monthValue,  // Text field for YYYY-MM format
        'Basic Salary': basicSalary,
        'Housing Allowance': housingAllowance,
        'Transport Allowance': transportAllowance,
        'Benefits': benefits,
        'Other Allowances': otherAllowances + customAllowancesTotal,
        // 'Total Allowances' - REMOVED (Formula field in Airtable, computed automatically)
        // 'Gross Salary' - REMOVED (Formula field in Airtable, computed automatically)
        'Income Tax': incomeTax,
        'Welfare': welfare,
        'Social Security': socialSecurity,
        'Health Insurance': healthInsurance,
        'Other Deductions': otherDeductions + customDeductionsTotal,
        // 'Total Deductions' - REMOVED (Formula field in Airtable, computed automatically)
        'Deductions': totalDeductions,  // Use 'Deductions' field (non-formula) for total
        // 'Net Pay' - REMOVED (Formula field in Airtable, computed automatically)
        // 'Net Salary' - REMOVED (Formula field in Airtable, computed automatically)
        'Custom Allowances': JSON.stringify(customAllowances),
        'Custom Deductions': JSON.stringify(customDeductions),
        'Status': 'Paid',  // Options: Paid or Pending
        'Payment Date': new Date().toISOString().split('T')[0],
        'Payment Method': 'Bank Transfer',  // Options: Bank Transfer, Cash, Mobile Money
        'Bonus': 0  // Default to 0 (can be edited later)
    };

    try {
        if (payrollId) {
            await updatePayroll(payrollId, payrollData);
            alert('Payroll updated successfully!');
        } else {
            await createPayroll(payrollData);
            alert('Payroll created successfully!');
        }

        closePayrollModal();
        loadPayrollRecords();
    } catch (error) {

        // Try to parse the error message to show specific field issues
        let errorMessage = 'Error saving payroll. Please try again.';
        if (error.message) {
            try {
                const errorObj = JSON.parse(error.message);
                if (errorObj.error && errorObj.error.message) {
                    errorMessage = `Error: ${errorObj.error.message}`;
                }
            } catch (e) {
                errorMessage = `Error: ${error.message}`;
            }
        }

        alert(errorMessage);
    }
});

// ========================================
// AUTO-REFRESH DATA
// ========================================
let refreshInterval = null;

function updateLastRefreshTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const timeElement = document.getElementById('lastRefreshTime');
    if (timeElement) {
        timeElement.textContent = `Last updated: ${timeString}`;
    }
}

function startAutoRefresh() {
    // Refresh data every 30 seconds
    refreshInterval = setInterval(() => {
        const activeTab = document.querySelector('[id^="tab-"].tab-active');
        if (activeTab) {
            const tabName = activeTab.id.replace('tab-', '');
            refreshTabData(tabName);
        }
    }, 30000); // 30 seconds
}

async function refreshTabData(tabName) {
    try {
        switch(tabName) {
            case 'employees':
                await loadEmployees();
                break;
            case 'attendance':
                await loadAttendanceRecords();
                break;
            case 'leave':
                await loadLeaveRequests();
                break;
            case 'payroll':
                await loadPayrollRecords();
                break;
            case 'announcements':
                await loadAnnouncements();
                break;
        }
        updateLastRefreshTime();
    } catch (error) {

    }
}

async function manualRefresh() {
    const refreshBtn = document.getElementById('refreshBtn');
    const icon = refreshBtn.querySelector('i');

    // Disable button and add spinning animation
    refreshBtn.disabled = true;
    icon.classList.add('fa-spin');

    try {
        // Get active tab and refresh its data
        const activeTab = document.querySelector('[id^="tab-"].tab-active');
        if (activeTab) {
            const tabName = activeTab.id.replace('tab-', '');
            await refreshTabData(tabName);
        }
    } finally {
        // Re-enable button after operation
        setTimeout(() => {
            refreshBtn.disabled = false;
            icon.classList.remove('fa-spin');
        }, 1000);
    }
}

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

// Stop refresh when page is hidden
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopAutoRefresh();
    } else {
        startAutoRefresh();
    }
});

// ========================================
// ATTENDANCE DATE RANGE HANDLER
// ========================================
// Show/hide custom date input based on date range selection
const attendanceDateRangeEl = document.getElementById('attendanceDateRange');
if (attendanceDateRangeEl) {
    attendanceDateRangeEl.addEventListener('change', function() {
        const customDateContainer = document.getElementById('customDateContainer');
        if (this.value === 'custom') {
            customDateContainer.classList.remove('hidden');
        } else {
            customDateContainer.classList.add('hidden');
        }
    });
}

// ========================================
// INITIALIZE
// ========================================
checkAdminAccess().then(hasAccess => {
    if (hasAccess) {
        // Load employees first to populate filter dropdowns
        loadEmployees().then(() => {
            // Then load other data that depends on employees being loaded
            return Promise.all([
                loadLeaveRequests(),
                loadAnnouncements(),
                loadAttendanceRecords(),
                loadPayrollRecords()
            ]);
        }).then(() => {
            // Update last refresh time after all data is loaded
            updateLastRefreshTime();
        }).catch(error => {

        });

        // Start auto-refresh
        startAutoRefresh();
    }
});
