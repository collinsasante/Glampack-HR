// Upcoming Leaves View Functions for Admin Dashboard

// Toggle custom date range visibility
function toggleCustomDateRange() {
    const rangeFilter = document.getElementById('leaveDateRangeFilter');
    const customStart = document.getElementById('customDateStart');
    const customEnd = document.getElementById('customDateEnd');

    if (rangeFilter && rangeFilter.value === 'custom') {
        customStart.classList.remove('hidden');
        customEnd.classList.add('hidden');
        // Set default start date to today
        document.getElementById('leaveStartDate').value = new Date().toISOString().split('T')[0];
    } else if (customStart && customEnd) {
        customStart.classList.add('hidden');
        customEnd.classList.add('hidden');
    }
}

// Update custom date end visibility
function toggleCustomEndDate() {
    const startDate = document.getElementById('leaveStartDate').value;
    const customEnd = document.getElementById('customDateEnd');

    if (startDate && customEnd) {
        customEnd.classList.remove('hidden');
        // Set min date for end date
        const endDateInput = document.getElementById('leaveEndDate');
        if (endDateInput) {
            endDateInput.min = startDate;
        }
    }
}

// Add event listeners for custom date range
document.addEventListener('DOMContentLoaded', function() {
    const rangeFilter = document.getElementById('leaveDateRangeFilter');
    const startDate = document.getElementById('leaveStartDate');

    if (rangeFilter) {
        rangeFilter.addEventListener('change', toggleCustomDateRange);
    }

    if (startDate) {
        startDate.addEventListener('change', toggleCustomEndDate);
    }
});

// Filter function
async function filterUpcomingLeaves() {
    await renderLeaveCalendar();
}

async function renderLeaveCalendar() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStr = today.toISOString().split('T')[0];

    // Get date range from filter
    const rangeFilter = document.getElementById('leaveDateRangeFilter')?.value || '30';
    let startFilterStr = todayStr;
    let endDateStr;

    if (rangeFilter === 'custom') {
        const startDate = document.getElementById('leaveStartDate')?.value;
        const endDate = document.getElementById('leaveEndDate')?.value;

        if (!startDate || !endDate) {
            // Default to 30 days if custom dates not set
            const in30Days = new Date(today);
            in30Days.setDate(today.getDate() + 30);
            endDateStr = in30Days.toISOString().split('T')[0];
        } else {
            startFilterStr = startDate;
            endDateStr = endDate;
        }
    } else {
        const days = parseInt(rangeFilter);
        const endDate = new Date(today);
        endDate.setDate(today.getDate() + days);
        endDateStr = endDate.toISOString().split('T')[0];
    }

    const in7Days = new Date(today);
    in7Days.setDate(today.getDate() + 7);
    const in7DaysStr = in7Days.toISOString().split('T')[0];

    // Get department filter
    const departmentFilter = document.getElementById('leaveDepartmentFilter')?.value || '';

    // Filter only approved leaves that are upcoming or ongoing
    let upcomingLeaves = allLeaveRequests.filter(req => {
        const endDate = req.fields['End Date'];
        const status = req.fields['Status'];
        return status === 'Approved' && endDate >= todayStr && endDate <= endDateStr;
    });

    // Filter by department if selected
    if (departmentFilter) {
        // Need to fetch employee data to filter by department
        const leavesWithEmployees = await Promise.all(upcomingLeaves.map(async (req) => {
            if (req.fields['Employee'] && req.fields['Employee'][0]) {
                try {
                    const employee = await getEmployee(req.fields['Employee'][0]);
                    return { ...req, employeeData: employee };
                } catch (error) {
                    return { ...req, employeeData: null };
                }
            }
            return { ...req, employeeData: null };
        }));

        upcomingLeaves = leavesWithEmployees.filter(req => {
            return req.employeeData && req.employeeData.fields &&
                   req.employeeData.fields['Department'] === departmentFilter;
        });
    }

    // Sort by start date
    upcomingLeaves.sort((a, b) => {
        const dateA = new Date(a.fields['Start Date']);
        const dateB = new Date(b.fields['Start Date']);
        return dateA - dateB;
    });

    // Calculate statistics
    const onLeaveToday = upcomingLeaves.filter(req => {
        const start = req.fields['Start Date'];
        const end = req.fields['End Date'];
        return start <= todayStr && end >= todayStr;
    }).length;

    const onLeaveWeek = upcomingLeaves.filter(req => {
        const start = req.fields['Start Date'];
        return start >= todayStr && start <= in7DaysStr;
    }).length;

    const onLeaveMonth = upcomingLeaves.length;

    // Update stats
    const onLeaveTodayEl = document.getElementById('onLeaveToday');
    const onLeaveWeekEl = document.getElementById('onLeaveWeek');
    const onLeaveMonthEl = document.getElementById('onLeaveMonth');

    if (onLeaveTodayEl) onLeaveTodayEl.textContent = onLeaveToday;
    if (onLeaveWeekEl) onLeaveWeekEl.textContent = onLeaveWeek;
    if (onLeaveMonthEl) onLeaveMonthEl.textContent = onLeaveMonth;

    // Render upcoming leaves list
    await renderUpcomingLeavesList(upcomingLeaves, todayStr);
}

async function renderUpcomingLeavesList(upcomingLeaves, todayStr) {
    const container = document.getElementById('upcomingLeavesList');

    if (!container) return;

    if (upcomingLeaves.length === 0) {
        container.innerHTML = `
            <div class="px-6 py-12 text-center text-gray-500">
                <i class="fas fa-calendar-check text-4xl mb-3"></i>
                <p class="text-lg font-medium">No upcoming approved leaves</p>
                <p class="text-sm text-gray-400 mt-1">for the selected date range</p>
            </div>
        `;
        return;
    }

    // Fetch employee names
    const employeePromises = upcomingLeaves.map(async (req) => {
        // Check if we already have employeeData from filtering
        if (req.employeeData) {
            return { id: req.id, name: (req.employeeData.fields && req.employeeData.fields['Full Name']) || 'Unknown' };
        }

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

    // Render each leave
    container.innerHTML = upcomingLeaves.map(req => {
        const fields = req.fields;
        const employeeName = nameMap[req.id];
        const startDate = new Date(fields['Start Date']);
        const endDate = new Date(fields['End Date']);
        const leaveType = fields['Leave Type'] || 'Leave';

        // Calculate days
        const days = fields['Number of Days'] || Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

        // Check if currently on leave
        const isOngoingLeave = fields['Start Date'] <= todayStr && fields['End Date'] >= todayStr;

        // Format dates
        const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        return `
            <div class="px-6 py-4 hover:bg-gray-50 transition-colors ${isOngoingLeave ? 'bg-blue-50' : ''}">
                <div class="flex items-center justify-between">
                    <div class="flex-1">
                        <div class="flex items-center gap-3">
                            <div class="flex-shrink-0">
                                <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                    <span class="text-red-600 font-bold text-lg">${employeeName.charAt(0)}</span>
                                </div>
                            </div>
                            <div class="flex-1">
                                <div class="flex items-center gap-2">
                                    <h5 class="font-semibold text-gray-900">${employeeName}</h5>
                                    ${isOngoingLeave ? '<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-600 text-white">On Leave</span>' : ''}
                                </div>
                                <p class="text-sm text-gray-600 mt-0.5">
                                    <i class="fas fa-briefcase mr-1"></i>${leaveType}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div class="text-right ml-4">
                        <p class="text-sm font-medium text-gray-900">
                            <i class="fas fa-calendar text-gray-400 mr-1"></i>
                            ${startStr} - ${endStr}
                        </p>
                        <p class="text-xs text-gray-500 mt-1">
                            <i class="fas fa-clock text-gray-400 mr-1"></i>
                            ${days} ${days === 1 ? 'day' : 'days'}
                        </p>
                    </div>
                </div>
                ${fields['Reason'] ? `
                    <div class="mt-3 pl-15">
                        <p class="text-sm text-gray-600 italic">
                            <i class="fas fa-comment-alt text-gray-400 mr-2"></i>
                            ${fields['Reason']}
                        </p>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}
