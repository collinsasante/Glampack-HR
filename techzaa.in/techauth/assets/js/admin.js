// ========================================
// ADMIN DASHBOARD JAVASCRIPT
// ========================================

// Authentication check (already done in HTML, but good to have)
if (!requireAuth()) {
    window.location.href = 'signin-1.html';
}

const currentUser = getCurrentUser();

// Check if user has admin role
if (currentUser.role !== 'Admin') {
    alert('Access Denied: You must be an administrator to access this page.');
    window.location.href = 'dashboard.html';
}

// Display user info in nav
document.getElementById('userInfo').textContent = `Welcome, ${currentUser.name} (Admin)`;

// AIRTABLE_CONFIG is already declared in auth.js

// ========================================
// TAB SWITCHING
// ========================================
function switchTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.add('hidden'));

    // Remove active class from all tabs
    const tabs = document.querySelectorAll('[id^="tab-"]');
    tabs.forEach(tab => tab.classList.remove('tab-active'));

    // Show selected tab content
    document.getElementById(`content-${tabName}`).classList.remove('hidden');

    // Add active class to selected tab
    document.getElementById(`tab-${tabName}`).classList.add('tab-active');

    // Load data for the selected tab
    switch(tabName) {
        case 'employees':
            loadEmployees();
            break;
        case 'leave':
            loadLeaveRequests();
            break;
        case 'attendance':
            loadAttendanceRecords();
            break;
        case 'announcements':
            loadAnnouncements();
            break;
        case 'payroll':
            loadPayrollRecords();
            break;
    }
}

// ========================================
// LOAD EMPLOYEES
// ========================================
let allEmployees = [];

async function loadEmployees() {
    const tbody = document.getElementById('employeesTableBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="4" class="px-6 py-12 text-center text-gray-500">
                <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                <p>Loading employees...</p>
            </td>
        </tr>
    `;

    try {
        const response = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tables.employees}`,
            {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`
                }
            }
        );

        if (!response.ok) throw new Error('Failed to load employees');

        const data = await response.json();
        allEmployees = data.records;

        // Populate employee filter dropdown in attendance tab
        populateEmployeeFilter();

        renderEmployees(allEmployees);

    } catch (error) {
        console.error('Error loading employees:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-12 text-center text-red-500">
                    <i class="fas fa-exclamation-circle text-2xl mb-2"></i>
                    <p>Error loading employees. Please try again.</p>
                </td>
            </tr>
        `;
    }
}

function renderEmployees(employees) {
    const tbody = document.getElementById('employeesTableBody');

    if (employees.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-12 text-center text-gray-500">
                    <p>No employees found</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';

    employees.forEach(employee => {
        const fields = employee.fields;
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${fields['Full Name'] || 'N/A'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-700">${fields['Email'] || 'N/A'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeClass(fields['Role'] || 'Employee')}">
                    ${fields['Role'] || 'Employee'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onclick="editEmployee('${employee.id}')" class="text-red-600 hover:text-red-900 mr-3" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteEmployee('${employee.id}', '${fields['Full Name']}')" class="text-red-600 hover:text-red-900" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });
}

function getRoleBadgeClass(role) {
    switch(role) {
        case 'Admin':
            return 'bg-red-100 text-red-800';
        case 'HR':
            return 'bg-purple-100 text-purple-800';
        case 'Employee':
            return 'bg-blue-100 text-blue-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

// ========================================
// FILTER EMPLOYEES
// ========================================
function filterEmployees() {
    const searchTerm = document.getElementById('employeeSearch').value.toLowerCase();
    const department = document.getElementById('departmentFilter').value;

    const filtered = allEmployees.filter(emp => {
        const fields = emp.fields;
        const matchesSearch = (fields['Full Name'] || '').toLowerCase().includes(searchTerm) ||
                             (fields['Email'] || '').toLowerCase().includes(searchTerm);
        const matchesDepartment = !department || (fields['Department'] === department);

        return matchesSearch && matchesDepartment;
    });

    renderEmployees(filtered);
}

// ========================================
// EMPLOYEE MODAL FUNCTIONS
// ========================================
function openAddEmployeeModal() {
    document.getElementById('modalTitle').textContent = 'Add New Employee';
    document.getElementById('employeeForm').reset();
    document.getElementById('employeeId').value = '';

    // Make password required for new employees
    const passwordField = document.getElementById('empPassword');
    passwordField.setAttribute('required', 'required');
    passwordField.placeholder = 'Min. 6 characters';

    document.getElementById('employeeModal').classList.add('active');
}

function closeEmployeeModal() {
    document.getElementById('employeeModal').classList.remove('active');
}

async function editEmployee(employeeId) {
    try {
        const response = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tables.employees}/${employeeId}`,
            {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`
                }
            }
        );

        if (!response.ok) throw new Error('Failed to load employee');

        const employee = await response.json();
        const fields = employee.fields;

        // Populate form
        document.getElementById('modalTitle').textContent = 'Edit Employee';
        document.getElementById('employeeId').value = employee.id;
        document.getElementById('empFullName').value = fields['Full Name'] || '';
        document.getElementById('empEmail').value = fields['Email'] || '';
        document.getElementById('empRole').value = fields['Role'] || 'Employee';

        // Hide password field for editing (optional - can make password not required for edits)
        const passwordField = document.getElementById('empPassword');
        passwordField.removeAttribute('required');
        passwordField.value = '';
        passwordField.placeholder = 'Leave blank to keep current password';

        document.getElementById('employeeModal').classList.add('active');

    } catch (error) {
        console.error('Error loading employee:', error);
        alert('Failed to load employee details');
    }
}

async function deleteEmployee(employeeId, employeeName) {
    if (!confirm(`Are you sure you want to delete ${employeeName}? This action cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tables.employees}/${employeeId}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`
                }
            }
        );

        if (!response.ok) throw new Error('Failed to delete employee');

        alert('Employee deleted successfully');
        loadEmployees();

    } catch (error) {
        console.error('Error deleting employee:', error);
        alert('Failed to delete employee');
    }
}

// Handle employee form submission
document.getElementById('employeeForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const employeeId = document.getElementById('employeeId').value;
    const isEdit = !!employeeId;

    const fields = {
        'Full Name': document.getElementById('empFullName').value,
        'Email': document.getElementById('empEmail').value,
        'Role': document.getElementById('empRole').value
    };

    // Add password for new employees
    if (!isEdit) {
        const password = document.getElementById('empPassword').value;
        if (password.length < 6) {
            alert('Password must be at least 6 characters long');
            return;
        }
        fields['Password'] = password;

        // Automatically assign leave balance based on policy (20 vacation days per year)
        fields['Annual Leave Balance'] = 20;
    }

    try {
        let response;

        if (isEdit) {
            // Update existing employee
            response = await fetch(
                `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tables.employees}/${employeeId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ fields })
                }
            );
        } else {
            // Create new employee with minimal required fields

            response = await fetch(
                `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tables.employees}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ fields })
                }
            );
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || 'Failed to save employee');
        }

        alert(isEdit ? 'Employee updated successfully!' : 'Employee added successfully!');
        closeEmployeeModal();
        loadEmployees();

    } catch (error) {
        console.error('Error saving employee:', error);
        alert('Failed to save employee: ' + error.message);
    }
});

// ========================================
// LOAD LEAVE REQUESTS
// ========================================
async function loadLeaveRequests() {
    const tbody = document.getElementById('leaveRequestsBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                <p>Loading leave requests...</p>
            </td>
        </tr>
    `;

    try {
        const response = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tables.leaveRequests}?filterByFormula={Status}='Pending'&sort[0][field]=Start%20Date&sort[0][direction]=desc`,
            {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`
                }
            }
        );

        if (!response.ok) throw new Error('Failed to load leave requests');

        const data = await response.json();

        if (data.records.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                        <p>No pending leave requests</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = '';

        data.records.forEach(record => {
            const fields = record.fields;
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';

            const days = calculateLeaveDays(fields['Start Date'], fields['End Date']);

            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${fields['Employee Name'] || 'N/A'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-700">${fields['Leave Type'] || 'N/A'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-700">${formatDate(fields['Start Date'])}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-700">${formatDate(fields['End Date'])}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-700">${days} ${days === 1 ? 'day' : 'days'}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm text-gray-700">${fields['Reason'] || 'No reason provided'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="approveLeaveRequest('${record.id}')" class="text-green-600 hover:text-green-900 mr-3" title="Approve">
                        <i class="fas fa-check-circle"></i> Approve
                    </button>
                    <button onclick="rejectLeaveRequest('${record.id}')" class="text-red-600 hover:text-red-900" title="Reject">
                        <i class="fas fa-times-circle"></i> Reject
                    </button>
                </td>
            `;

            tbody.appendChild(row);
        });

    } catch (error) {
        console.error('Error loading leave requests:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-12 text-center text-red-500">
                    <i class="fas fa-exclamation-circle text-2xl mb-2"></i>
                    <p>Error loading leave requests. Please try again.</p>
                </td>
            </tr>
        `;
    }
}

async function approveLeaveRequest(requestId) {
    if (!confirm('Are you sure you want to approve this leave request?')) return;

    try {
        // First, get the leave request details
        const leaveResponse = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tables.leaveRequests}/${requestId}`,
            {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`
                }
            }
        );

        if (!leaveResponse.ok) throw new Error('Failed to fetch leave request details');

        const leaveRequest = await leaveResponse.json();
        const leaveFields = leaveRequest.fields;

        // Calculate number of days
        const startDate = new Date(leaveFields['Start Date']);
        const endDate = new Date(leaveFields['End Date']);
        const daysRequested = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

        // Get employee ID from the linked record
        const employeeId = leaveFields['Employee'][0]; // Airtable linked records are arrays

        // Get current employee balance
        const empResponse = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tables.employees}/${employeeId}`,
            {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`
                }
            }
        );

        if (!empResponse.ok) throw new Error('Failed to fetch employee details');

        const employee = await empResponse.json();
        const currentBalance = employee.fields['Annual Leave Balance'] || 0;
        const newBalance = currentBalance - daysRequested;

        // Check if employee has enough balance
        if (newBalance < 0) {
            alert(`Cannot approve: Employee only has ${currentBalance} days remaining, but ${daysRequested} days were requested.`);
            return;
        }

        // Update leave request status
        const approveResponse = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tables.leaveRequests}/${requestId}`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: {
                        'Status': 'Approved'
                    }
                })
            }
        );

        if (!approveResponse.ok) throw new Error('Failed to approve leave request');

        // Deduct leave balance from employee
        const balanceResponse = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tables.employees}/${employeeId}`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: {
                        'Annual Leave Balance': newBalance
                    }
                })
            }
        );

        if (!balanceResponse.ok) throw new Error('Failed to update employee balance');

        alert(`Leave request approved successfully!\n${daysRequested} days deducted.\nRemaining balance: ${newBalance} days`);
        loadLeaveRequests();

    } catch (error) {
        console.error('Error approving leave request:', error);
        alert('Failed to approve leave request: ' + error.message);
    }
}

async function rejectLeaveRequest(requestId) {
    const reason = prompt('Please enter reason for rejection (optional):');
    if (reason === null) return; // User cancelled

    try {
        const response = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tables.leaveRequests}/${requestId}`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: {
                        'Status': 'Rejected',
                        'Rejection Reason': reason
                    }
                })
            }
        );

        if (!response.ok) throw new Error('Failed to reject leave request');

        alert('Leave request rejected');
        loadLeaveRequests();

    } catch (error) {
        console.error('Error rejecting leave request:', error);
        alert('Failed to reject leave request');
    }
}

// ========================================
// LOAD ATTENDANCE RECORDS
// ========================================
function populateEmployeeFilter() {
    const select = document.getElementById('attendanceEmployeeFilter');
    select.innerHTML = '<option value="">All Employees</option>';

    allEmployees.forEach(emp => {
        const option = document.createElement('option');
        option.value = emp.id;
        option.textContent = emp.fields['Full Name'] || 'Unknown';
        select.appendChild(option);
    });
}

async function loadAttendanceRecords() {
    const tbody = document.getElementById('attendanceRecordsBody');
    const dateRange = document.getElementById('attendanceDateRange').value;
    const dateInput = document.getElementById('attendanceDate');
    const employeeFilter = document.getElementById('attendanceEmployeeFilter').value;
    const statusFilter = document.getElementById('attendanceStatusFilter').value;

    // Show/hide custom date input
    const customDateContainer = document.getElementById('customDateContainer');
    if (dateRange === 'custom') {
        customDateContainer.classList.remove('hidden');
        if (!dateInput.value) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
    } else {
        customDateContainer.classList.add('hidden');
    }

    // Populate employee filter dropdown
    const empFilterSelect = document.getElementById('attendanceEmployeeFilter');
    if (empFilterSelect.options.length === 1 && allEmployees.length > 0) {
        allEmployees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.id;
            option.textContent = emp.fields['Full Name'] || 'Unknown';
            empFilterSelect.appendChild(option);
        });
    }

    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                <p>Loading attendance records...</p>
            </td>
        </tr>
    `;

    try {
        // Build filter formula based on date range
        let filterFormula = '';
        const today = new Date();

        switch (dateRange) {
            case 'today':
                const todayStr = today.toISOString().split('T')[0];
                filterFormula = `{Date}='${todayStr}'`;
                break;
            case 'week':
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                const weekStartStr = weekStart.toISOString().split('T')[0];
                filterFormula = `IS_AFTER({Date}, '${weekStartStr}')`;
                break;
            case 'month':
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                const monthStartStr = monthStart.toISOString().split('T')[0];
                filterFormula = `IS_AFTER({Date}, '${monthStartStr}')`;
                break;
            case 'custom':
                if (dateInput.value) {
                    filterFormula = `{Date}='${dateInput.value}'`;
                }
                break;
        }

        // Add employee filter
        if (employeeFilter) {
            const additionalFilter = `FIND('${employeeFilter}', ARRAYJOIN({Employee}))`;
            filterFormula = filterFormula ? `AND(${filterFormula}, ${additionalFilter})` : additionalFilter;
        }

        let url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tables.attendance}?sort[0][field]=Date&sort[0][direction]=desc`;
        if (filterFormula) {
            url += `&filterByFormula=${encodeURIComponent(filterFormula)}`;
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`
            }
        });

        if (!response.ok) throw new Error('Failed to load attendance records');

        const data = await response.json();
        let records = data.records;

        // Calculate statistics
        let presentToday = 0;
        let lateToday = 0;
        let totalMinutes = 0;
        let recordsWithHours = 0;
        const todayStr = new Date().toISOString().split('T')[0];

        records.forEach(record => {
            const fields = record.fields;
            const checkInRaw = fields['Check In'];
            const checkOutRaw = fields['Check Out'];
            const recordDate = fields['Date'];

            if (checkInRaw && checkOutRaw) {
                // Calculate hours
                const checkIn = new Date(checkInRaw);
                const checkOut = new Date(checkOutRaw);
                const minutes = (checkOut - checkIn) / (1000 * 60);
                totalMinutes += minutes;
                recordsWithHours++;

                // Check if today
                if (recordDate === todayStr) {
                    presentToday++;
                    const checkInHour = checkIn.getHours();
                    const checkInMinute = checkIn.getMinutes();
                    if (checkInHour > 9 || (checkInHour === 9 && checkInMinute > 0)) {
                        lateToday++;
                    }
                }
            }
        });

        // Update statistics
        document.getElementById('statPresentToday').textContent = presentToday;
        document.getElementById('statLateToday').textContent = lateToday;

        if (recordsWithHours > 0) {
            const avgMinutes = totalMinutes / recordsWithHours;
            const avgHours = Math.floor(avgMinutes / 60);
            const avgMins = Math.floor(avgMinutes % 60);
            document.getElementById('statAvgHours').textContent = `${avgHours}h ${avgMins}m`;
        } else {
            document.getElementById('statAvgHours').textContent = '0h';
        }

        // Calculate attendance rate (present days / total employees)
        if (allEmployees.length > 0) {
            const rate = Math.round((presentToday / allEmployees.length) * 100);
            document.getElementById('statAttendanceRate').textContent = `${rate}%`;
        }

        // Filter by status if selected
        if (statusFilter) {
            records = records.filter(record => {
                const fields = record.fields;
                const checkIn = fields['Check In'];
                const checkOut = fields['Check Out'];

                if (statusFilter === 'present') {
                    if (!checkIn || !checkOut) return false;
                    const checkInHour = new Date(checkIn).getHours();
                    const checkInMinute = new Date(checkIn).getMinutes();
                    return !(checkInHour > 9 || (checkInHour === 9 && checkInMinute > 0));
                } else if (statusFilter === 'late') {
                    if (!checkIn || !checkOut) return false;
                    const checkInHour = new Date(checkIn).getHours();
                    const checkInMinute = new Date(checkIn).getMinutes();
                    return (checkInHour > 9 || (checkInHour === 9 && checkInMinute > 0));
                } else if (statusFilter === 'incomplete') {
                    return !checkOut;
                }
                return true;
            });
        }

        if (records.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                        <p>No attendance records found</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = '';

        records.forEach(record => {
            const fields = record.fields;
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';

            const checkInRaw = fields['Check In'];
            const checkOutRaw = fields['Check Out'];
            const checkInLocation = fields['Check In Location'] || '';

            const checkIn = checkInRaw ? new Date(checkInRaw).toLocaleTimeString('en-US', {hour12: false}) : '-';
            const checkOut = checkOutRaw ? new Date(checkOutRaw).toLocaleTimeString('en-US', {hour12: false}) : '-';

            let hours = '-';
            let status = 'Incomplete';
            let statusClass = 'bg-yellow-100 text-yellow-800';

            if (checkIn !== '-' && checkOut !== '-') {
                const checkInTime = new Date(checkInRaw);
                const checkOutTime = new Date(checkOutRaw);
                const diffMinutes = (checkOutTime - checkInTime) / (1000 * 60);
                const h = Math.floor(diffMinutes / 60);
                const m = Math.floor(diffMinutes % 60);
                hours = `${h}h ${m}m`;

                const checkInHour = checkInTime.getHours();
                const checkInMinute = checkInTime.getMinutes();

                if (checkInHour > 9 || (checkInHour === 9 && checkInMinute > 0)) {
                    status = 'Late';
                    statusClass = 'bg-orange-100 text-orange-800';
                } else {
                    status = 'On Time';
                    statusClass = 'bg-green-100 text-green-800';
                }
            } else if (checkIn !== '-') {
                status = 'Checked In';
                statusClass = 'bg-blue-100 text-blue-800';
            }

            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${fields['Employee Name'] || 'N/A'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-700">${formatDate(fields['Date'])}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-700">${checkIn}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-700">${checkOut}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-semibold text-gray-900">${hours}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                        ${status}
                    </span>
                </td>
                <td class="px-6 py-4 text-xs text-gray-600" title="${checkInLocation}">
                    ${checkInLocation ? (checkInLocation.length > 30 ? checkInLocation.substring(0, 30) + '...' : checkInLocation) : '-'}
                </td>
            `;

            tbody.appendChild(row);
        });

    } catch (error) {
        console.error('Error loading attendance records:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-12 text-center text-red-500">
                    <i class="fas fa-exclamation-circle text-2xl mb-2"></i>
                    <p>Error loading attendance records. Please try again.</p>
                </td>
            </tr>
        `;
    }
}

// ========================================
// ATTENDANCE MODAL FUNCTIONS
// ========================================
function closeAttendanceModal() {
    document.getElementById('attendanceModal').classList.remove('active');
}

async function editAttendance(attendanceId) {
    try {
        const response = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tables.attendance}/${attendanceId}`,
            {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`
                }
            }
        );

        if (!response.ok) throw new Error('Failed to load attendance record');

        const record = await response.json();
        const fields = record.fields;

        // Populate form
        document.getElementById('attendanceId').value = record.id;
        document.getElementById('attEmployee').value = fields['Employee Name'] || '';
        document.getElementById('attDate').value = fields['Date'] || '';

        if (fields['Check In']) {
            const checkInTime = new Date(fields['Check In']).toTimeString().split(' ')[0].substring(0, 5);
            document.getElementById('attCheckIn').value = checkInTime;
        }

        if (fields['Check Out']) {
            const checkOutTime = new Date(fields['Check Out']).toTimeString().split(' ')[0].substring(0, 5);
            document.getElementById('attCheckOut').value = checkOutTime;
        }

        document.getElementById('attendanceModal').classList.add('active');

    } catch (error) {
        console.error('Error loading attendance record:', error);
        alert('Failed to load attendance record');
    }
}

// Handle attendance form submission
document.getElementById('attendanceForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const attendanceId = document.getElementById('attendanceId').value;
    const date = document.getElementById('attDate').value;
    const checkInTime = document.getElementById('attCheckIn').value;
    const checkOutTime = document.getElementById('attCheckOut').value;

    // Combine date and time to create ISO datetime
    const checkInDateTime = checkInTime ? new Date(`${date}T${checkInTime}:00`).toISOString() : null;
    const checkOutDateTime = checkOutTime ? new Date(`${date}T${checkOutTime}:00`).toISOString() : null;

    const fields = {};
    if (checkInDateTime) fields['Check In'] = checkInDateTime;
    if (checkOutDateTime) fields['Check Out'] = checkOutDateTime;

    try {
        const response = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tables.attendance}/${attendanceId}`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fields })
            }
        );

        if (!response.ok) throw new Error('Failed to update attendance');

        alert('Attendance record updated successfully');
        closeAttendanceModal();
        loadAttendanceRecords();

    } catch (error) {
        console.error('Error updating attendance:', error);
        alert('Failed to update attendance record');
    }
});

// ========================================
// EXPORT ATTENDANCE REPORT
// ========================================
async function exportAttendanceReport() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Get current filter settings
        const dateRange = document.getElementById('attendanceDateRange').value;
        const employeeFilter = document.getElementById('attendanceEmployeeFilter').value;

        let filterText = '';
        switch(dateRange) {
            case 'today': filterText = 'Today'; break;
            case 'week': filterText = 'This Week'; break;
            case 'month': filterText = 'This Month'; break;
            case 'custom': filterText = document.getElementById('attendanceDate').value; break;
        }

        // Title
        doc.setFontSize(18);
        doc.text('Attendance Report', 14, 20);

        doc.setFontSize(10);
        doc.text(`Period: ${filterText}`, 14, 28);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 34);

        // Fetch attendance data
        let filterFormula = '';
        const today = new Date();

        switch (dateRange) {
            case 'today':
                filterFormula = `{Date}='${today.toISOString().split('T')[0]}'`;
                break;
            case 'week':
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                filterFormula = `IS_AFTER({Date}, '${weekStart.toISOString().split('T')[0]}')`;
                break;
            case 'month':
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                filterFormula = `IS_AFTER({Date}, '${monthStart.toISOString().split('T')[0]}')`;
                break;
            case 'custom':
                const customDate = document.getElementById('attendanceDate').value;
                if (customDate) filterFormula = `{Date}='${customDate}'`;
                break;
        }

        if (employeeFilter) {
            const additionalFilter = `FIND('${employeeFilter}', ARRAYJOIN({Employee}))`;
            filterFormula = filterFormula ? `AND(${filterFormula}, ${additionalFilter})` : additionalFilter;
        }

        let url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tables.attendance}?sort[0][field]=Date&sort[0][direction]=desc`;
        if (filterFormula) {
            url += `&filterByFormula=${encodeURIComponent(filterFormula)}`;
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch attendance data');

        const data = await response.json();

        // Prepare table data
        const tableData = data.records.map(record => {
            const fields = record.fields;
            const checkIn = fields['Check In'] ? new Date(fields['Check In']).toLocaleTimeString('en-US', {hour12: false}) : '-';
            const checkOut = fields['Check Out'] ? new Date(fields['Check Out']).toLocaleTimeString('en-US', {hour12: false}) : '-';

            let hours = '-';
            let status = 'Incomplete';

            if (checkIn !== '-' && checkOut !== '-') {
                const checkInTime = new Date(fields['Check In']);
                const checkOutTime = new Date(fields['Check Out']);
                const diffMinutes = (checkOutTime - checkInTime) / (1000 * 60);
                const h = Math.floor(diffMinutes / 60);
                const m = Math.floor(diffMinutes % 60);
                hours = `${h}h ${m}m`;

                const checkInHour = checkInTime.getHours();
                const checkInMinute = checkInTime.getMinutes();
                status = (checkInHour > 9 || (checkInHour === 9 && checkInMinute > 0)) ? 'Late' : 'On Time';
            } else if (checkIn !== '-') {
                status = 'In Progress';
            }

            return [
                fields['Employee Name'] || 'N/A',
                fields['Date'] || 'N/A',
                checkIn,
                checkOut,
                hours,
                status
            ];
        });

        doc.autoTable({
            head: [['Employee', 'Date', 'Check In', 'Check Out', 'Hours', 'Status']],
            body: tableData,
            startY: 40,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [220, 38, 38] }
        });

        // Save PDF
        doc.save(`Attendance_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        alert('Attendance report exported successfully!');

    } catch (error) {
        console.error('Error exporting report:', error);
        alert('Failed to export report: ' + error.message);
    }
}

// ========================================
// REPORT GENERATION
// ========================================
function populateReportMonths() {
    const monthSelect = document.getElementById('reportMonth');
    const payrollMonthSelect = document.getElementById('payrollReportMonth');

    const months = [];
    const today = new Date();

    for (let i = 0; i < 12; i++) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const value = date.toISOString().split('T')[0].substring(0, 7); // YYYY-MM
        const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        months.push({ value, label });
    }

    months.forEach(month => {
        const option1 = document.createElement('option');
        option1.value = month.value;
        option1.textContent = month.label;
        monthSelect.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = month.value;
        option2.textContent = month.label;
        payrollMonthSelect.appendChild(option2);
    });
}

async function generateEmployeeReport() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Title
        doc.setFontSize(18);
        doc.text('Employee Report', 14, 20);

        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

        // Table data
        const tableData = allEmployees.map(emp => {
            const fields = emp.fields;
            return [
                fields['Full Name'] || 'N/A',
                fields['Email'] || 'N/A',
                fields['Role'] || 'N/A'
            ];
        });

        doc.autoTable({
            head: [['Name', 'Email', 'Role']],
            body: tableData,
            startY: 35
        });

        doc.save(`Employee_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        alert('Employee report generated successfully!');

    } catch (error) {
        console.error('Error generating report:', error);
        alert('Failed to generate report');
    }
}

async function generateAttendanceReport() {
    const month = document.getElementById('reportMonth').value;

    if (!month) {
        alert('Please select a month');
        return;
    }

    try {
        // Fetch attendance data for the month
        const response = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tables.attendance}`,
            {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`
                }
            }
        );

        if (!response.ok) throw new Error('Failed to fetch attendance data');

        const data = await response.json();

        // Filter by month
        const filteredRecords = data.records.filter(record => {
            const date = record.fields['Date'] || '';
            return date.startsWith(month);
        });

        if (filteredRecords.length === 0) {
            alert('No attendance records found for this month');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Title
        doc.setFontSize(18);
        doc.text('Attendance Report', 14, 20);

        doc.setFontSize(10);
        doc.text(`Month: ${month}`, 14, 28);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 34);

        // Table data
        const tableData = filteredRecords.map(record => {
            const fields = record.fields;
            const checkIn = fields['Check In'] ? new Date(fields['Check In']).toLocaleTimeString('en-US', {hour12: false}) : '-';
            const checkOut = fields['Check Out'] ? new Date(fields['Check Out']).toLocaleTimeString('en-US', {hour12: false}) : '-';
            const hours = fields['Hours Worked'] || '-';

            return [
                fields['Employee Name'] || 'N/A',
                fields['Date'] || 'N/A',
                checkIn,
                checkOut,
                hours
            ];
        });

        doc.autoTable({
            head: [['Employee', 'Date', 'Check In', 'Check Out', 'Hours']],
            body: tableData,
            startY: 40
        });

        doc.save(`Attendance_Report_${month}.pdf`);
        alert('Attendance report generated successfully!');

    } catch (error) {
        console.error('Error generating report:', error);
        alert('Failed to generate report');
    }
}

async function generateLeaveReport() {
    const year = document.getElementById('leaveReportYear').value;

    try {
        // Fetch leave data
        const response = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tables.leaveRequests}`,
            {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`
                }
            }
        );

        if (!response.ok) throw new Error('Failed to fetch leave data');

        const data = await response.json();

        // Filter by year
        const filteredRecords = data.records.filter(record => {
            const startDate = record.fields['Start Date'] || '';
            return startDate.startsWith(year);
        });

        if (filteredRecords.length === 0) {
            alert('No leave records found for this year');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Title
        doc.setFontSize(18);
        doc.text('Leave Report', 14, 20);

        doc.setFontSize(10);
        doc.text(`Year: ${year}`, 14, 28);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 34);

        // Table data
        const tableData = filteredRecords.map(record => {
            const fields = record.fields;
            const days = calculateLeaveDays(fields['Start Date'], fields['End Date']);

            return [
                fields['Employee Name'] || 'N/A',
                fields['Leave Type'] || 'N/A',
                fields['Start Date'] || 'N/A',
                fields['End Date'] || 'N/A',
                days,
                fields['Status'] || 'N/A'
            ];
        });

        doc.autoTable({
            head: [['Employee', 'Type', 'Start Date', 'End Date', 'Days', 'Status']],
            body: tableData,
            startY: 40
        });

        doc.save(`Leave_Report_${year}.pdf`);
        alert('Leave report generated successfully!');

    } catch (error) {
        console.error('Error generating report:', error);
        alert('Failed to generate report');
    }
}

async function generatePayrollReport() {
    const month = document.getElementById('payrollReportMonth').value;

    if (!month) {
        alert('Please select a month');
        return;
    }

    try {
        // Fetch payroll data
        const response = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tables.payroll}`,
            {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`
                }
            }
        );

        if (!response.ok) throw new Error('Failed to fetch payroll data');

        const data = await response.json();

        // Filter by month
        const filteredRecords = data.records.filter(record => {
            const payMonth = record.fields['Month'] || '';
            return payMonth.startsWith(month);
        });

        if (filteredRecords.length === 0) {
            alert('No payroll records found for this month');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Title
        doc.setFontSize(18);
        doc.text('Payroll Report', 14, 20);

        doc.setFontSize(10);
        doc.text(`Month: ${month}`, 14, 28);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 34);

        // Table data
        const tableData = filteredRecords.map(record => {
            const fields = record.fields;

            return [
                fields['Employee Name'] || 'N/A',
                fields['Base Salary'] || 0,
                fields['Bonuses'] || 0,
                fields['Deductions'] || 0,
                fields['Net Salary'] || 0
            ];
        });

        doc.autoTable({
            head: [['Employee', 'Base Salary', 'Bonuses', 'Deductions', 'Net Salary']],
            body: tableData,
            startY: 40
        });

        doc.save(`Payroll_Report_${month}.pdf`);
        alert('Payroll report generated successfully!');

    } catch (error) {
        console.error('Error generating report:', error);
        alert('Failed to generate report');
    }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================
function formatDate(dateString) {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function calculateLeaveDays(startDate, endDate) {
    if (!startDate || !endDate) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return diffDays;
}

// ========================================
// LOAD ANNOUNCEMENTS
// ========================================
async function loadAnnouncements() {
    const container = document.getElementById('announcementsContainer');
    const filter = document.getElementById('announcementFilter').value;

    container.innerHTML = '<div class="text-center py-8 text-gray-500"><i class="fas fa-spinner fa-spin text-2xl mr-2"></i> Loading announcements...</div>';

    try {
        let url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tables.announcements}?sort[0][field]=Date&sort[0][direction]=desc`;

        if (filter !== 'all') {
            url += `&filterByFormula={Priority}='${filter}'`;
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`
            }
        });

        if (!response.ok) throw new Error('Failed to load announcements');

        const data = await response.json();

        if (data.records.length === 0) {
            container.innerHTML = '<div class="text-center py-8 text-gray-500">No announcements found</div>';
            return;
        }

        container.innerHTML = '';

        data.records.forEach(record => {
            const fields = record.fields;
            const priority = fields['Priority'] || 'Medium';
            const priorityColors = {
                'High': 'border-red-500 bg-red-50',
                'Medium': 'border-yellow-500 bg-yellow-50',
                'Low': 'border-blue-500 bg-blue-50'
            };
            const priorityBadgeColors = {
                'High': 'bg-red-100 text-red-800',
                'Medium': 'bg-yellow-100 text-yellow-800',
                'Low': 'bg-blue-100 text-blue-800'
            };

            const card = document.createElement('div');
            card.className = `border-l-4 ${priorityColors[priority]} rounded-lg p-6 hover:shadow-md transition`;
            card.innerHTML = `
                <div class="flex justify-between items-start mb-3">
                    <div class="flex-1">
                        <h4 class="text-lg font-semibold text-gray-800 mb-1">${fields['Title'] || 'Untitled'}</h4>
                        <div class="flex items-center space-x-3">
                            <span class="px-2 py-1 text-xs font-semibold rounded-full ${priorityBadgeColors[priority]}">
                                ${priority} Priority
                            </span>
                            <span class="text-sm text-gray-500">
                                <i class="far fa-calendar mr-1"></i> ${formatDate(fields['Date'])}
                            </span>
                        </div>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="editAnnouncement('${record.id}')" class="text-red-600 hover:text-red-900" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteAnnouncement('${record.id}')" class="text-red-600 hover:text-red-900" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <p class="text-gray-700 whitespace-pre-line">${fields['Message'] || 'No message'}</p>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        console.error('Error loading announcements:', error);
        container.innerHTML = '<div class="text-center py-8 text-red-500">Error loading announcements. Please try again.</div>';
    }
}

// ========================================
// ANNOUNCEMENT MODAL FUNCTIONS
// ========================================
function openAddAnnouncementModal() {
    document.getElementById('announcementModalTitle').textContent = 'New Announcement';
    document.getElementById('announcementForm').reset();
    document.getElementById('announcementId').value = '';
    document.getElementById('announcementModal').classList.add('active');
}

function closeAnnouncementModal() {
    document.getElementById('announcementModal').classList.remove('active');
}

async function editAnnouncement(announcementId) {
    try {
        const response = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tables.announcements}/${announcementId}`,
            {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`
                }
            }
        );

        if (!response.ok) throw new Error('Failed to load announcement');

        const announcement = await response.json();
        const fields = announcement.fields;

        // Populate form
        document.getElementById('announcementModalTitle').textContent = 'Edit Announcement';
        document.getElementById('announcementId').value = announcement.id;
        document.getElementById('annTitle').value = fields['Title'] || '';
        document.getElementById('annMessage').value = fields['Message'] || '';
        document.getElementById('annPriority').value = fields['Priority'] || 'Medium';

        document.getElementById('announcementModal').classList.add('active');

    } catch (error) {
        console.error('Error loading announcement:', error);
        alert('Failed to load announcement details');
    }
}

async function deleteAnnouncement(announcementId) {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
        const response = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tables.announcements}/${announcementId}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`
                }
            }
        );

        if (!response.ok) throw new Error('Failed to delete announcement');

        alert('Announcement deleted successfully');
        loadAnnouncements();

    } catch (error) {
        console.error('Error deleting announcement:', error);
        alert('Failed to delete announcement');
    }
}

// Handle announcement form submission
document.getElementById('announcementForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const announcementId = document.getElementById('announcementId').value;
    const isEdit = !!announcementId;

    const fields = {
        'Title': document.getElementById('annTitle').value,
        'Message': document.getElementById('annMessage').value,
        'Priority': document.getElementById('annPriority').value
    };

    // Only set date for new announcements
    if (!isEdit) {
        fields['Date'] = new Date().toISOString().split('T')[0];
    }

    try {
        let response;

        if (isEdit) {
            // Update existing announcement
            response = await fetch(
                `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tables.announcements}/${announcementId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ fields })
                }
            );
        } else {
            // Create new announcement
            response = await fetch(
                `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tables.announcements}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ fields })
                }
            );
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || 'Failed to save announcement');
        }

        alert(isEdit ? 'Announcement updated successfully!' : 'Announcement posted successfully!');
        closeAnnouncementModal();
        loadAnnouncements();

    } catch (error) {
        console.error('Error saving announcement:', error);
        alert('Failed to save announcement: ' + error.message);
    }
});

// ========================================
// PAYROLL MANAGEMENT
// ========================================
async function loadPayrollRecords() {
    const tbody = document.getElementById('payrollTableBody');
    const employeeFilter = document.getElementById('payrollEmployeeFilter').value;
    const monthFilter = document.getElementById('payrollMonthFilter').value;

    // Populate employee filter dropdown if not already done
    const empFilterSelect = document.getElementById('payrollEmployeeFilter');
    if (empFilterSelect.options.length === 1 && allEmployees.length > 0) {
        allEmployees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.id;
            option.textContent = emp.fields['Full Name'] || 'Unknown';
            empFilterSelect.appendChild(option);
        });
    }

    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                <p>Loading payroll records...</p>
            </td>
        </tr>
    `;

    try {
        // First try without sorting to avoid field name errors
        let url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tables.payroll}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error loading payroll:', errorData);
            throw new Error('Failed to load payroll records');
        }

        const data = await response.json();
        let records = data.records;

        // Debug: Log available fields from first record
        if (records.length > 0) {
            console.log('Available Airtable fields:', Object.keys(records[0].fields));
        }

        // Filter by employee
        if (employeeFilter) {
            records = records.filter(record => {
                const employeeField = record.fields['Employee'];
                return employeeField && Array.isArray(employeeField) && employeeField.includes(employeeFilter);
            });
        }

        // Filter by month
        if (monthFilter) {
            records = records.filter(record => record.fields['Month'] === monthFilter);
        }

        if (records.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                        <p>No payroll records found</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = '';

        records.forEach(record => {
            const fields = record.fields;
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';

            const basicSalary = parseFloat(fields['Basic Salary'] || 0);
            const totalAllowances = parseFloat(fields['Total Allowances'] || 0);
            const totalDeductions = parseFloat(fields['Total Deductions'] || 0);
            const netSalary = parseFloat(fields['Net Salary'] || 0);

            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${fields['Employee Name'] || 'N/A'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-700">${fields['Month'] || 'N/A'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-semibold text-gray-900">GHS ${basicSalary.toFixed(2)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-green-600 font-semibold">+GHS ${totalAllowances.toFixed(2)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-red-600 font-semibold">-GHS ${totalDeductions.toFixed(2)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-bold text-red-700">GHS ${netSalary.toFixed(2)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="viewPayrollDetails('${record.id}')" class="text-red-600 hover:text-red-900 mr-3" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="editPayroll('${record.id}')" class="text-blue-600 hover:text-blue-900 mr-3" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deletePayroll('${record.id}', '${fields['Employee Name']}')" class="text-red-600 hover:text-red-900" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;

            tbody.appendChild(row);
        });

    } catch (error) {
        console.error('Error loading payroll records:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-12 text-center text-red-500">
                    <i class="fas fa-exclamation-circle text-2xl mb-2"></i>
                    <p>Error loading payroll records</p>
                    <p class="text-sm mt-2">${error.message}</p>
                    <p class="text-xs mt-2 text-gray-500">Check the console for more details</p>
                </td>
            </tr>
        `;
    }
}

// ========================================
// PAYROLL MODAL FUNCTIONS
// ========================================
function openAddPayrollModal() {
    document.getElementById('payrollModalTitle').textContent = 'Create Payroll';
    document.getElementById('payrollForm').reset();
    document.getElementById('payrollId').value = '';

    // Populate employee dropdown
    const employeeSelect = document.getElementById('payrollEmployee');
    employeeSelect.innerHTML = '<option value="">Select Employee</option>';
    allEmployees.forEach(emp => {
        const option = document.createElement('option');
        option.value = emp.id;
        option.textContent = emp.fields['Full Name'] || 'Unknown';
        employeeSelect.appendChild(option);
    });

    // Set default month to current month
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    document.getElementById('payrollMonth').value = currentMonth;

    // Reset calculations
    calculateNetSalary();

    document.getElementById('payrollModal').classList.add('active');
}

function closePayrollModal() {
    document.getElementById('payrollModal').classList.remove('active');
}

async function editPayroll(payrollId) {
    try {
        const response = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tables.payroll}/${payrollId}`,
            {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`
                }
            }
        );

        if (!response.ok) throw new Error('Failed to load payroll record');

        const payroll = await response.json();
        const fields = payroll.fields;

        // Populate form
        document.getElementById('payrollModalTitle').textContent = 'Edit Payroll';
        document.getElementById('payrollId').value = payroll.id;

        // Populate employee dropdown
        const employeeSelect = document.getElementById('payrollEmployee');
        employeeSelect.innerHTML = '<option value="">Select Employee</option>';
        allEmployees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.id;
            option.textContent = emp.fields['Full Name'] || 'Unknown';
            employeeSelect.appendChild(option);
        });

        // Set selected employee
        if (fields['Employee'] && fields['Employee'][0]) {
            employeeSelect.value = fields['Employee'][0];
        }

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

    } catch (error) {
        console.error('Error loading payroll record:', error);
        alert('Failed to load payroll record');
    }
}

async function viewPayrollDetails(payrollId) {
    try {
        const response = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tables.payroll}/${payrollId}`,
            {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`
                }
            }
        );

        if (!response.ok) throw new Error('Failed to load payroll record');

        const payroll = await response.json();
        const fields = payroll.fields;

        const details = `
PAYROLL DETAILS
===============================
Employee: ${fields['Employee Name'] || 'N/A'}
Month: ${fields['Month'] || 'N/A'}

EARNINGS:
- Basic Salary: GHS ${parseFloat(fields['Basic Salary'] || 0).toFixed(2)}
- Housing Allowance: GHS ${parseFloat(fields['Housing Allowance'] || 0).toFixed(2)}
- Transport Allowance: GHS ${parseFloat(fields['Transport Allowance'] || 0).toFixed(2)}
- Benefits: GHS ${parseFloat(fields['Benefits'] || 0).toFixed(2)}
- Other Allowances: GHS ${parseFloat(fields['Other Allowances'] || 0).toFixed(2)}
Total Allowances: GHS ${parseFloat(fields['Total Allowances'] || 0).toFixed(2)}

DEDUCTIONS:
- Income Tax: GHS ${parseFloat(fields['Income Tax'] || 0).toFixed(2)}
- Welfare: GHS ${parseFloat(fields['Welfare'] || 0).toFixed(2)}
- Social Security: GHS ${parseFloat(fields['Social Security'] || 0).toFixed(2)}
- Health Insurance: GHS ${parseFloat(fields['Health Insurance'] || 0).toFixed(2)}
- Other Deductions: GHS ${parseFloat(fields['Other Deductions'] || 0).toFixed(2)}
Total Deductions: GHS ${parseFloat(fields['Total Deductions'] || 0).toFixed(2)}

===============================
GROSS SALARY: GHS ${parseFloat(fields['Gross Salary'] || 0).toFixed(2)}
NET SALARY: GHS ${parseFloat(fields['Net Salary'] || 0).toFixed(2)}
        `;

        alert(details);

    } catch (error) {
        console.error('Error loading payroll details:', error);
        alert('Failed to load payroll details');
    }
}

async function deletePayroll(payrollId, employeeName) {
    if (!confirm(`Are you sure you want to delete the payroll record for ${employeeName}?`)) return;

    try {
        const response = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tables.payroll}/${payrollId}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`
                }
            }
        );

        if (!response.ok) throw new Error('Failed to delete payroll record');

        alert('Payroll record deleted successfully');
        loadPayrollRecords();

    } catch (error) {
        console.error('Error deleting payroll record:', error);
        alert('Failed to delete payroll record');
    }
}

// Calculate net salary in real-time
function calculateNetSalary() {
    const basicSalary = parseFloat(document.getElementById('basicSalary').value) || 0;

    // Allowances
    const housingAllowance = parseFloat(document.getElementById('housingAllowance').value) || 0;
    const transportAllowance = parseFloat(document.getElementById('transportAllowance').value) || 0;
    const benefits = parseFloat(document.getElementById('benefits').value) || 0;
    const otherAllowances = parseFloat(document.getElementById('otherAllowances').value) || 0;

    // Deductions
    const incomeTax = parseFloat(document.getElementById('incomeTax').value) || 0;
    const welfare = parseFloat(document.getElementById('welfare').value) || 0;
    const socialSecurity = parseFloat(document.getElementById('socialSecurity').value) || 0;
    const healthInsurance = parseFloat(document.getElementById('healthInsurance').value) || 0;
    const otherDeductions = parseFloat(document.getElementById('otherDeductions').value) || 0;

    // Calculate totals
    const totalAllowances = housingAllowance + transportAllowance + benefits + otherAllowances;
    const totalDeductions = incomeTax + welfare + socialSecurity + healthInsurance + otherDeductions;
    const grossSalary = basicSalary + totalAllowances;
    const netSalary = grossSalary - totalDeductions;

    // Update displays
    document.getElementById('totalAllowancesDisplay').textContent = `GHS ${totalAllowances.toFixed(2)}`;
    document.getElementById('totalDeductionsDisplay').textContent = `GHS ${totalDeductions.toFixed(2)}`;
    document.getElementById('grossSalaryDisplay').textContent = `GHS ${grossSalary.toFixed(2)}`;
    document.getElementById('totalDeductionsSummary').textContent = `GHS ${totalDeductions.toFixed(2)}`;
    document.getElementById('netSalaryDisplay').textContent = `GHS ${netSalary.toFixed(2)}`;
}

// Handle payroll form submission
document.getElementById('payrollForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const payrollId = document.getElementById('payrollId').value;
    const isEdit = !!payrollId;

    const employeeId = document.getElementById('payrollEmployee').value;
    if (!employeeId) {
        alert('Please select an employee');
        return;
    }

    const basicSalary = parseFloat(document.getElementById('basicSalary').value) || 0;
    const housingAllowance = parseFloat(document.getElementById('housingAllowance').value) || 0;
    const transportAllowance = parseFloat(document.getElementById('transportAllowance').value) || 0;
    const benefits = parseFloat(document.getElementById('benefits').value) || 0;
    const otherAllowances = parseFloat(document.getElementById('otherAllowances').value) || 0;
    const incomeTax = parseFloat(document.getElementById('incomeTax').value) || 0;
    const welfare = parseFloat(document.getElementById('welfare').value) || 0;
    const socialSecurity = parseFloat(document.getElementById('socialSecurity').value) || 0;
    const healthInsurance = parseFloat(document.getElementById('healthInsurance').value) || 0;
    const otherDeductions = parseFloat(document.getElementById('otherDeductions').value) || 0;

    const totalAllowances = housingAllowance + transportAllowance + benefits + otherAllowances;
    const totalDeductions = incomeTax + welfare + socialSecurity + healthInsurance + otherDeductions;
    const grossSalary = basicSalary + totalAllowances;
    const netSalary = grossSalary - totalDeductions;

    const fields = {
        'Employee': [employeeId],
        'Month': document.getElementById('payrollMonth').value,
        'Basic Salary': basicSalary,
        'Housing Allowance': housingAllowance,
        'Transport Allowance': transportAllowance,
        'Benefits': benefits,
        'Other Allowances': otherAllowances,
        'Income Tax': incomeTax,
        'Welfare': welfare,
        'Social Security': socialSecurity,
        'Health Insurance': healthInsurance,
        'Other Deductions': otherDeductions
        // Note: Total Allowances, Total Deductions, Gross Salary, and Net Salary
        // are computed fields in Airtable and should not be sent via API
    };

    try {
        let response;

        if (isEdit) {
            // Update existing payroll
            response = await fetch(
                `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tables.payroll}/${payrollId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ fields })
                }
            );
        } else {
            // Create new payroll
            response = await fetch(
                `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${AIRTABLE_CONFIG.tables.payroll}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ fields })
                }
            );
        }

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Airtable API Error:', errorData);

            // Extract field-specific errors if available
            let errorMessage = 'Failed to save payroll';
            if (errorData.error && errorData.error.message) {
                errorMessage = errorData.error.message;
            }
            throw new Error(errorMessage);
        }

        alert(isEdit ? 'Payroll updated successfully!' : 'Payroll created successfully!');
        closePayrollModal();
        loadPayrollRecords();

    } catch (error) {
        console.error('Error saving payroll:', error);
        alert('Failed to save payroll: ' + error.message);
    }
});

// ========================================
// INITIALIZE PAGE
// ========================================
// Load employees on page load
loadEmployees();
