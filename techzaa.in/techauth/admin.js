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
        const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/Employees/${currentUser.id}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            const role = data.fields['Role'] || '';
            if (role !== 'Admin' && role !== 'HR') {
                alert('Access denied. Admin privileges required.');
                window.location.href = 'dashboard.html';
                return false;
            }
            return true;
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
        const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/Employees?sort[0][field]=Full Name&sort[0][direction]=asc`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch employees');
        }

        const data = await response.json();
        allEmployees = data.records;
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
            'Contract': 'bg-blue-100 text-blue-800',
            'Probation': 'bg-yellow-100 text-yellow-800'
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
                    <div class="text-sm text-gray-900">${fields['Department'] || '--'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${fields['Job Title'] || '--'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[fields['Status']] || 'bg-gray-100 text-gray-800'}">
                        ${fields['Status'] || '--'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button onclick='editEmployee(${JSON.stringify(emp).replace(/'/g, "&#39;")})' class="text-red-600 hover:text-red-900">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button onclick="deleteEmployee('${emp.id}', '${fields['Full Name']}')" class="text-red-600 hover:text-red-900">
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
    document.getElementById('employeeModal').classList.add('active');
}

function editEmployee(employee) {
    document.getElementById('modalTitle').textContent = 'Edit Employee';
    document.getElementById('employeeId').value = employee.id;
    document.getElementById('empFullName').value = employee.fields['Full Name'] || '';
    document.getElementById('empEmail').value = employee.fields['Email'] || '';
    document.getElementById('empDepartment').value = employee.fields['Department'] || '';
    document.getElementById('empJobTitle').value = employee.fields['Job Title'] || '';
    document.getElementById('empStatus').value = employee.fields['Status'] || 'Permanent';
    document.getElementById('empRole').value = employee.fields['Role'] || 'Employee';
    document.getElementById('empAnnualLeave').value = employee.fields['Annual Leave Balance'] || 20;
    document.getElementById('empSickLeave').value = employee.fields['Sick Leave Balance'] || 10;
    document.getElementById('employeeModal').classList.add('active');
}

function closeEmployeeModal() {
    document.getElementById('employeeModal').classList.remove('active');
}

document.getElementById('employeeForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const employeeId = document.getElementById('employeeId').value;
    const data = {
        'Full Name': document.getElementById('empFullName').value,
        'Email': document.getElementById('empEmail').value,
        'Department': document.getElementById('empDepartment').value,
        'Job Title': document.getElementById('empJobTitle').value,
        'Status': document.getElementById('empStatus').value,
        'Role': document.getElementById('empRole').value,
        'Annual Leave Balance': parseInt(document.getElementById('empAnnualLeave').value),
        'Sick Leave Balance': parseInt(document.getElementById('empSickLeave').value)
    };

    try {
        let url, method;
        if (employeeId) {
            // Update existing employee
            url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/Employees/${employeeId}`;
            method = 'PATCH';
        } else {
            // Create new employee
            url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/Employees`;
            method = 'POST';
            // Add default password for new employees
            data['Password'] = 'password123';
        }

        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fields: data })
        });

        if (response.ok) {
            alert(employeeId ? 'Employee updated successfully!' : 'Employee added successfully! Default password: password123');
            closeEmployeeModal();
            loadEmployees();
        } else {
            alert('Failed to save employee. Please try again.');
        }
    } catch (error) {
        console.error('Error saving employee:', error);
        alert('Error saving employee. Please try again.');
    }
});

async function deleteEmployee(employeeId, employeeName) {
    if (!confirm(`Are you sure you want to delete ${employeeName}? This action cannot be undone.`)) {
        return;
    }

    try {
        const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/Employees/${employeeId}`;
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`
            }
        });

        if (response.ok) {
            alert('Employee deleted successfully!');
            loadEmployees();
        } else {
            alert('Failed to delete employee. Please try again.');
        }
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
        const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/Leave Requests?filterByFormula={Status}='Pending'&sort[0][field]=Start Date&sort[0][direction]=desc`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch leave requests');
        }

        const data = await response.json();
        allLeaveRequests = data.records;
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

    // Fetch employee names
    const employeePromises = requests.map(async (req) => {
        if (req.fields['Employee'] && req.fields['Employee'][0]) {
            try {
                const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/Employees/${req.fields['Employee'][0]}`;
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    return { id: req.id, name: data.fields['Full Name'] };
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
        const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/Leave Requests/${leaveId}`;
        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    'Status': 'Approved',
                    'Admin Comments': comment || 'Approved by admin'
                }
            })
        });

        if (response.ok) {
            alert('Leave request approved!');
            loadLeaveRequests();
        } else {
            alert('Failed to approve leave request. Please try again.');
        }
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
        const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/Leave Requests/${leaveId}`;
        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    'Status': 'Rejected',
                    'Admin Comments': comment
                }
            })
        });

        if (response.ok) {
            alert('Leave request rejected!');
            loadLeaveRequests();
        } else {
            alert('Failed to reject leave request. Please try again.');
        }
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

        const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/Attendance?filterByFormula=${encodeURIComponent(filterFormula)}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch attendance records');
        }

        const data = await response.json();
        allAttendanceRecords = data.records;
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

    // Fetch employee names
    const employeePromises = records.map(async (rec) => {
        if (rec.fields['Employee'] && rec.fields['Employee'][0]) {
            try {
                const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/Employees/${rec.fields['Employee'][0]}`;
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    return { id: rec.id, name: data.fields['Full Name'], empId: rec.fields['Employee'][0] };
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
        const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/Attendance/${attendanceId}`;
        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    'Check In': checkIn,
                    'Check Out': checkOut
                }
            })
        });

        if (response.ok) {
            alert('Attendance record updated successfully!');
            closeAttendanceModal();
            loadAttendanceRecords();
        } else {
            alert('Failed to update attendance record. Please try again.');
        }
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

        // Fetch all employees
        const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/Employees`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch employees');

        const data = await response.json();
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

        // Fetch attendance records
        const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/Attendance?filterByFormula=AND(YEAR({Date})=${year},MONTH({Date})=${parseInt(month)})`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch attendance');

        const data = await response.json();

        // Fetch employee names
        const tableData = await Promise.all(data.records.map(async (rec) => {
            const fields = rec.fields;
            let employeeName = 'Unknown';

            if (fields['Employee'] && fields['Employee'][0]) {
                try {
                    const empUrl = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/Employees/${fields['Employee'][0]}`;
                    const empResponse = await fetch(empUrl, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    if (empResponse.ok) {
                        const empData = await empResponse.json();
                        employeeName = empData.fields['Full Name'];
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

        // Fetch leave records
        const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/Leave Requests?filterByFormula=YEAR({Start Date})=${year}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch leave records');

        const data = await response.json();

        // Fetch employee names
        const tableData = await Promise.all(data.records.map(async (rec) => {
            const fields = rec.fields;
            let employeeName = 'Unknown';

            if (fields['Employee'] && fields['Employee'][0]) {
                try {
                    const empUrl = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/Employees/${fields['Employee'][0]}`;
                    const empResponse = await fetch(empUrl, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    if (empResponse.ok) {
                        const empData = await empResponse.json();
                        employeeName = empData.fields['Full Name'];
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

        // Fetch payment records
        const url = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/PaymentHistory?filterByFormula=AND(YEAR({Payment Date})=${year},MONTH({Payment Date})=${parseInt(month)})`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch payroll records');

        const data = await response.json();

        // Fetch employee names and create table
        const tableData = await Promise.all(data.records.map(async (rec) => {
            const fields = rec.fields;
            let employeeName = 'Unknown';

            if (fields['Employee'] && fields['Employee'][0]) {
                try {
                    const empUrl = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/Employees/${fields['Employee'][0]}`;
                    const empResponse = await fetch(empUrl, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    if (empResponse.ok) {
                        const empData = await empResponse.json();
                        employeeName = empData.fields['Full Name'];
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
// INITIALIZE
// ========================================
checkAdminAccess().then(hasAccess => {
    if (hasAccess) {
        loadEmployees();
    }
});
