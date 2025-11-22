// Upcoming Leaves View Functions for Admin Dashboard

async function renderLeaveCalendar() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStr = today.toISOString().split('T')[0];
    const in7Days = new Date(today);
    in7Days.setDate(today.getDate() + 7);
    const in7DaysStr = in7Days.toISOString().split('T')[0];

    const in30Days = new Date(today);
    in30Days.setDate(today.getDate() + 30);
    const in30DaysStr = in30Days.toISOString().split('T')[0];

    // Filter only approved leaves that are upcoming or ongoing
    const upcomingLeaves = allLeaveRequests.filter(req => {
        const endDate = req.fields['End Date'];
        const status = req.fields['Status'];
        return status === 'Approved' && endDate >= todayStr && endDate <= in30DaysStr;
    });

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
    document.getElementById('onLeaveToday').textContent = onLeaveToday;
    document.getElementById('onLeaveWeek').textContent = onLeaveWeek;
    document.getElementById('onLeaveMonth').textContent = onLeaveMonth;

    // Render upcoming leaves list
    await renderUpcomingLeavesList(upcomingLeaves, todayStr);
}

async function renderUpcomingLeavesList(upcomingLeaves, todayStr) {
    const container = document.getElementById('upcomingLeavesList');

    if (upcomingLeaves.length === 0) {
        container.innerHTML = `
            <div class="px-6 py-12 text-center text-gray-500">
                <i class="fas fa-calendar-check text-4xl mb-3"></i>
                <p class="text-lg font-medium">No upcoming approved leaves</p>
                <p class="text-sm text-gray-400 mt-1">for the next 30 days</p>
            </div>
        `;
        return;
    }

    // Fetch employee names
    const employeePromises = upcomingLeaves.map(async (req) => {
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
