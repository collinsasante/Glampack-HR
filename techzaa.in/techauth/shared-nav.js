// ========================================
// SHARED NAVIGATION BAR
// ========================================

function renderNavigation(activePage = '') {
    const navLinks = [
        { href: 'dashboard.html', icon: 'fa-chart-line', text: 'Dashboard', page: 'dashboard' },
        { href: 'attendance-tracker.html', icon: 'fa-clock', text: 'Attendance', page: 'attendance' },
        { href: 'leave-request.html', icon: 'fa-calendar-alt', text: 'Leave', page: 'leave' },
        { href: 'profile.html', icon: 'fa-user', text: 'Profile', page: 'profile' },
        { href: 'announcements.html', icon: 'fa-bullhorn', text: 'Announcements', page: 'announcements' },
        { href: 'payroll.html', icon: 'fa-money-bill-wave', text: 'Payroll', page: 'payroll' },
        { href: 'monthly-summary.html', icon: 'fa-chart-bar', text: 'Reports', page: 'reports' },
        { href: 'settings.html', icon: 'fa-cog', text: 'Settings', page: 'settings' }
    ];

    const linksHTML = navLinks.map(link => {
        const isActive = activePage === link.page;
        const className = isActive ? 'text-red-600 font-semibold' : 'text-gray-600 hover:text-red-600';
        return `
            <a href="${link.href}" class="${className}">
                <i class="fas ${link.icon} mr-1"></i> ${link.text}
            </a>
        `;
    }).join('');

    return `
        <!-- Navigation Bar -->
        <nav class="bg-white shadow-lg">
            <div class="container mx-auto px-4">
                <div class="flex justify-between items-center py-4">
                    <div class="flex items-center space-x-4">
                        <h1 class="text-2xl font-bold text-red-600">HR System</h1>
                        <span class="text-gray-600" id="userInfo"></span>
                    </div>
                    <div class="flex items-center space-x-4">
                        ${linksHTML}
                        <button onclick="logout()" class="text-gray-600 hover:text-red-600">
                            <i class="fas fa-sign-out-alt mr-1"></i> Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    `;
}

// Auto-render navigation if container exists
document.addEventListener('DOMContentLoaded', function() {
    const navContainer = document.getElementById('sharedNav');
    if (navContainer) {
        const activePage = navContainer.getAttribute('data-page');
        navContainer.outerHTML = renderNavigation(activePage);

        // Update user info after nav is rendered
        if (typeof updateUserInfo === 'function') {
            updateUserInfo();
        }
    }
});
