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
        console.error('Error checking admin access:', error);
        window.location.href = 'dashboard.html';
        return false;
    }
}

// Display user info
function updateUserInfo() {
    const userInfoElement = document.getElementById('userInfo');
    if (userInfoElement && currentUser) {
        userInfoElement.textContent = `Welcome, ${currentUser.name} (Admin)`;
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
        loadAttendanceRecords();
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
        console.error('Error loading employees:', error);
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

    if (employees.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-8 text-center text-gray-500">
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
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${fields['Full Name'] || '--'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${fields['Email'] || '--'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[fields['Status']] || 'bg-gray-100 text-gray-800'}">
                        ${fields['Status'] || '--'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${roleColors[fields['Role']] || 'bg-gray-100 text-gray-800'}">
                        ${fields['Role'] || '--'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button onclick='editEmployee(${JSON.stringify(emp).replace(/'/g, "&#39;")})' class="text-red-600 hover:text-red-900">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button onclick="deleteEmployeeHandler('${emp.id}', '${fields['Full Name']}')" class="text-red-600 hover:text-red-900">
                        <i class="fas fa-trash"></i> Delete
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
        console.error('Missing required form elements');
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
        'Annual Leave Balance': 20,
        'Sick Leave Balance': 10
    };

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
        console.error('Error saving employee:', error);
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
        console.error('Error deleting employee:', error);
        alert('Error deleting employee. Please try again.');
    }
}

// ========================================
// LEAVE APPROVALS
// ========================================
async function loadLeaveRequests() {
    try {
        const filterFormula = "{Status}='Pending'";
        const data = await getLeaveRequests(filterFormula);
        allLeaveRequests = data.records || [];

        // Sort by Start Date descending (client-side)
        allLeaveRequests.sort((a, b) => {
            const dateA = new Date(a.fields['Start Date'] || 0);
            const dateB = new Date(b.fields['Start Date'] || 0);
            return dateB - dateA;
        });

        displayLeaveRequests(allLeaveRequests);
    } catch (error) {
        console.error('Error loading leave requests:', error);
        document.getElementById('leaveRequestsBody').innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-4 text-center text-red-600">
                    Error loading leave requests. Please try again.
                </td>
            </tr>
        `;
    }
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
                console.error('Error fetching employee:', error);
            }
        }
        return { id: req.id, name: 'Unknown' };
    });

    const employeeNames = await Promise.all(employeePromises);
    const nameMap = Object.fromEntries(employeeNames.map(e => [e.id, e.name]));

    tbody.innerHTML = requests.map(req => {
        const fields = req.fields;
        const employeeName = nameMap[req.id] || 'Unknown';

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
                    <div class="text-sm text-gray-900">${fields['Number of Days'] || '--'}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm text-gray-900 max-w-xs truncate">${fields['Reason'] || '--'}</div>
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
        await updateLeaveRequest(leaveId, {
            'Status': 'Approved',
            'Admin Comments': comment || 'Approved by admin'
        });

        alert('Leave request approved!');
        loadLeaveRequests();
    } catch (error) {
        console.error('Error approving leave:', error);
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
        console.error('Error rejecting leave:', error);
        alert('Error rejecting leave. Please try again.');
    }
}

// ========================================
// ATTENDANCE RECORDS
// ========================================
async function loadAttendanceRecords() {
    const date = document.getElementById('attendanceDate').value || new Date().toISOString().split('T')[0];
    const employeeId = document.getElementById('attendanceEmployeeFilter').value;

    try {
        let filterFormula = `{Date} = '${date}'`;
        if (employeeId) {
            filterFormula = `AND({Date} = '${date}', {Employee} = '${employeeId}')`;
        }

        const data = await getAttendance(filterFormula);
        allAttendanceRecords = data.records || [];
        await displayAttendanceRecords(allAttendanceRecords);
    } catch (error) {
        console.error('Error loading attendance records:', error);
        document.getElementById('attendanceRecordsBody').innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-4 text-center text-red-600">
                    Error loading attendance records. Please try again.
                </td>
            </tr>
        `;
    }
}

async function displayAttendanceRecords(records) {
    const tbody = document.getElementById('attendanceRecordsBody');

    if (records.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                    No attendance records found for selected date
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
                console.error('Error fetching employee:', error);
            }
        }
        return { id: rec.id, name: 'Unknown', empId: '' };
    });

    const employeeNames = await Promise.all(employeePromises);
    const nameMap = Object.fromEntries(employeeNames.map(e => [e.id, { name: e.name, empId: e.empId }]));

    tbody.innerHTML = records.map(rec => {
        const fields = rec.fields;
        const employeeInfo = nameMap[rec.id] || { name: 'Unknown', empId: '' };
        const checkIn = fields['Check In'] || '--:--';

        let status = 'Absent';
        let statusClass = 'bg-red-100 text-red-800';

        if (checkIn !== '--:--') {
            const hour = parseInt(checkIn.split(':')[0]);
            if (hour < 9) {
                status = 'On Time';
                statusClass = 'bg-green-100 text-green-800';
            } else {
                status = 'Late';
                statusClass = 'bg-yellow-100 text-yellow-800';
            }
        }

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
                    <div class="text-sm text-gray-900">${fields['Check Out'] || '--:--'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                        ${status}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick='editAttendance(${JSON.stringify(rec).replace(/'/g, "&#39;")}, "${employeeInfo.name}")' class="text-red-600 hover:text-red-900">
                        <i class="fas fa-edit"></i> Edit
                    </button>
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
        console.error('Error updating attendance:', error);
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
        console.error('Error generating report:', error);
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
                    console.error('Error fetching employee:', error);
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
        console.error('Error generating report:', error);
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
                    console.error('Error fetching employee:', error);
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
        console.error('Error generating report:', error);
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
                    console.error('Error fetching employee:', error);
                }
            }

            return [
                employeeName,
                `$${(fields['Gross Salary'] || 0).toFixed(2)}`,
                `$${(fields['Total Deductions'] || 0).toFixed(2)}`,
                `$${(fields['Net Salary'] || 0).toFixed(2)}`,
                fields['Status'] || '--'
            ];
        }));

        // Calculate totals
        const totalGross = data.records.reduce((sum, rec) => sum + (rec.fields['Gross Salary'] || 0), 0);
        const totalDeductions = data.records.reduce((sum, rec) => sum + (rec.fields['Total Deductions'] || 0), 0);
        const totalNet = data.records.reduce((sum, rec) => sum + (rec.fields['Net Salary'] || 0), 0);

        tableData.push([
            { content: 'TOTAL', styles: { fontStyle: 'bold' } },
            { content: `$${totalGross.toFixed(2)}`, styles: { fontStyle: 'bold' } },
            { content: `$${totalDeductions.toFixed(2)}`, styles: { fontStyle: 'bold' } },
            { content: `$${totalNet.toFixed(2)}`, styles: { fontStyle: 'bold' } },
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
        console.error('Error generating report:', error);
        alert('Error generating report. Please try again.');
    }
}

// ========================================
// PAYROLL MANAGEMENT
// ========================================
let allPayrollRecords = [];
let customAllowances = [];
let customDeductions = [];

async function loadPayrollRecords() {
    const employeeFilter = document.getElementById('payrollEmployeeFilter').value;
    const monthFilter = document.getElementById('payrollMonthFilter').value;

    try {
        // Build filter formula
        let filters = [];
        if (employeeFilter) {
            filters.push(`FIND('${employeeFilter}', ARRAYJOIN({Employee}))`);
        }
        if (monthFilter) {
            filters.push(`{Month} = '${monthFilter}'`);
        }

        const filterFormula = filters.length > 0 ? `AND(${filters.join(',')})` : null;
        const data = await getPayroll(filterFormula);
        allPayrollRecords = data.records || [];

        // Sort by month descending
        allPayrollRecords.sort((a, b) => {
            const monthA = a.fields['Month'] || '';
            const monthB = b.fields['Month'] || '';
            return monthB.localeCompare(monthA);
        });

        displayPayrollRecords();
    } catch (error) {
        console.error('Error loading payroll:', error);
        document.getElementById('payrollTableBody').innerHTML = `
            <tr>
                <td colspan="8" class="px-6 py-4 text-center text-red-600">
                    Error loading payroll records. Please try again.
                </td>
            </tr>
        `;
    }
}

async function displayPayrollRecords() {
    const tbody = document.getElementById('payrollTableBody');

    if (allPayrollRecords.length === 0) {
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

    // Fetch employee names
    const employeePromises = allPayrollRecords.map(async (record) => {
        if (record.fields['Employee'] && record.fields['Employee'][0]) {
            try {
                const employee = await getEmployee(record.fields['Employee'][0]);
                return { id: record.id, name: employee.fields['Full Name'] || 'Unknown' };
            } catch (error) {
                return { id: record.id, name: 'Unknown' };
            }
        }
        return { id: record.id, name: 'Unknown' };
    });

    const employeeNames = await Promise.all(employeePromises);
    const nameMap = Object.fromEntries(employeeNames.map(e => [e.id, e.name]));

    tbody.innerHTML = allPayrollRecords.map(record => {
        const fields = record.fields;
        const employeeName = nameMap[record.id];

        return `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${employeeName}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${fields['Month'] || '--'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">$${parseFloat(fields['Basic Salary'] || 0).toFixed(2)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">$${parseFloat(fields['Total Allowances'] || 0).toFixed(2)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">$${parseFloat(fields['Total Deductions'] || 0).toFixed(2)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">$${parseFloat(fields['Gross Salary'] || 0).toFixed(2)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">$${parseFloat(fields['Net Salary'] || 0).toFixed(2)}</td>
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
        console.error('Error loading employees:', error);
    }

    document.getElementById('payrollModal').classList.add('active');
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

    // Update displays
    document.getElementById('totalAllowancesDisplay').textContent = `$${totalAllowances.toFixed(2)}`;
    document.getElementById('totalDeductionsDisplay').textContent = `$${totalDeductions.toFixed(2)}`;
    document.getElementById('grossSalaryDisplay').textContent = `$${grossSalary.toFixed(2)}`;
    document.getElementById('netSalaryDisplay').textContent = `$${netSalary.toFixed(2)}`;
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
            <span class="text-sm">${item.name}: <strong>$${parseFloat(item.amount).toFixed(2)}</strong></span>
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
                ${item.name}: <strong>$${parseFloat(item.amount).toFixed(2)}</strong>
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

    const payrollData = {
        'Employee': [document.getElementById('payrollEmployee').value],
        'Month': document.getElementById('payrollMonth').value,
        'Basic Salary': basicSalary,
        'Housing Allowance': housingAllowance,
        'Transport Allowance': transportAllowance,
        'Benefits': benefits,
        'Other Allowances': otherAllowances + customAllowancesTotal,
        'Total Allowances': totalAllowances,
        'Gross Salary': grossSalary,
        'Income Tax': incomeTax,
        'Welfare': welfare,
        'Social Security': socialSecurity,
        'Health Insurance': healthInsurance,
        'Other Deductions': otherDeductions + customDeductionsTotal,
        'Total Deductions': totalDeductions,
        'Net Salary': netSalary,
        'Custom Allowances': JSON.stringify(customAllowances),
        'Custom Deductions': JSON.stringify(customDeductions),
        'Status': 'Processed',
        'Payment Date': new Date().toISOString().split('T')[0]
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
        console.error('Error saving payroll:', error);
        alert('Error saving payroll. Please try again.');
    }
});

// ========================================
// INITIALIZE
// ========================================
checkAdminAccess().then(hasAccess => {
    if (hasAccess) {
        loadEmployees();
    }
});
