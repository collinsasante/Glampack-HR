// ========================================
// SHARED NAVIGATION COMPONENT
// ========================================

function createNavigation(currentPage = '') {
    const currentUser = getCurrentUser();

    // Check if user is admin/HR/Manager - use cached value first
    let isAdmin = localStorage.getItem('isAdmin') === 'true';
    let userRole = localStorage.getItem('userRole') || 'Employee';

    // Update admin status and role in background
    checkIfUserIsAdmin().then(result => {
        isAdmin = result.isAdmin;
        userRole = result.role;
        localStorage.setItem('isAdmin', isAdmin);
        localStorage.setItem('userRole', userRole);
        updateAdminLink();
        updatePayrollLink(userRole);
    });

    async function checkIfUserIsAdmin() {
        try {
            // Use Worker API to fetch employee data
            const employee = await getEmployee(currentUser.id);

            if (employee && employee.fields) {
                const role = employee.fields['Role'] || 'Employee';
                // Manager role can access admin dashboard (all features except payroll)
                const isAdmin = role === 'Admin' || role === 'HR' || role === 'Manager';
                return { isAdmin, role };
            }
        } catch (error) {
            // Silently handle error
        }
        return { isAdmin: false, role: 'Employee' };
    }

    function updateAdminLink() {
        const adminLinkContainer = document.getElementById('adminLinkContainer');
        const mobileAdminLinkContainer = document.getElementById('mobileAdminLinkContainer');

        if (adminLinkContainer && isAdmin) {
            adminLinkContainer.classList.remove('hidden');
        }
        if (mobileAdminLinkContainer && isAdmin) {
            mobileAdminLinkContainer.classList.remove('hidden');
        }
    }

    function updatePayrollLink(role) {
        // Hide payroll menu item for Manager role
        const payrollLinkContainer = document.getElementById('payrollLinkContainer');
        const mobilePayrollLinkContainer = document.getElementById('mobilePayrollLinkContainer');

        if (role === 'Manager') {
            if (payrollLinkContainer) payrollLinkContainer.style.display = 'none';
            if (mobilePayrollLinkContainer) mobilePayrollLinkContainer.style.display = 'none';
        } else {
            if (payrollLinkContainer) payrollLinkContainer.style.display = '';
            if (mobilePayrollLinkContainer) mobilePayrollLinkContainer.style.display = '';
        }
    }

    const navItems = [
        { name: 'Dashboard', icon: 'fa-chart-line', href: 'dashboard.html', page: 'dashboard' },
        { name: 'Attendance', icon: 'fa-clock', href: 'attendance-tracker.html', page: 'attendance' },
        { name: 'Leave', icon: 'fa-calendar-alt', href: 'leave-request.html', page: 'leave' },
        { name: 'Profile', icon: 'fa-user', href: 'profile.html', page: 'profile' },
        { name: 'Announcements', icon: 'fa-bullhorn', href: 'announcements.html', page: 'announcements' },
        { name: 'Payroll', icon: 'fa-money-bill-wave', href: 'payroll.html', page: 'payroll' },
        { name: 'Reports', icon: 'fa-chart-bar', href: 'monthly-summary.html', page: 'reports' },
        { name: 'Settings', icon: 'fa-cog', href: 'settings.html', page: 'settings' }
    ];

    // Desktop Navigation
    const desktopNav = navItems.map(item => {
        const isActive = currentPage === item.page;
        const activeClass = isActive ? 'text-red-600 font-semibold' : 'text-gray-600 hover:text-red-600';

        // Wrap Payroll link in container for Manager role hiding
        if (item.page === 'payroll') {
            return `
                <div id="payrollLinkContainer">
                    <a href="${item.href}" class="${activeClass}">
                        <i class="fas ${item.icon} mr-1"></i> ${item.name}
                    </a>
                </div>
            `;
        }

        return `
            <a href="${item.href}" class="${activeClass}">
                <i class="fas ${item.icon} mr-1"></i> ${item.name}
            </a>
        `;
    }).join('');

    // Admin Dashboard link (shown if user is admin/manager/HR from cache)
    const adminLink = `
        <div id="adminLinkContainer" class="${isAdmin ? '' : 'hidden'}">
            <a href="admin-dashboard.html" class="inline-flex items-center px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-md hover:shadow-lg">
                <i class="fas fa-user-shield mr-2"></i> Admin Dashboard
            </a>
        </div>
    `;

    // Mobile Menu Items
    const mobileNav = navItems.map(item => {
        const isActive = currentPage === item.page;
        const activeClass = isActive ? 'bg-red-100 text-red-600 font-semibold' : 'text-gray-700 hover:bg-gray-100';

        // Wrap Payroll link in container for Manager role hiding
        if (item.page === 'payroll') {
            return `
                <div id="mobilePayrollLinkContainer">
                    <a href="${item.href}" class="block px-4 py-3 ${activeClass} rounded-lg">
                        <i class="fas ${item.icon} mr-2"></i> ${item.name}
                    </a>
                </div>
            `;
        }

        return `
            <a href="${item.href}" class="block px-4 py-3 ${activeClass} rounded-lg">
                <i class="fas ${item.icon} mr-2"></i> ${item.name}
            </a>
        `;
    }).join('');

    // Mobile Admin Dashboard link (shown if user is admin/manager/HR from cache)
    const mobileAdminLink = `
        <div id="mobileAdminLinkContainer" class="${isAdmin ? '' : 'hidden'}">
            <a href="admin-dashboard.html" class="block px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-md">
                <i class="fas fa-user-shield mr-2"></i> Admin Dashboard
            </a>
        </div>
    `;

    return `
        <nav class="bg-white shadow-lg sticky top-0 z-50">
            <div class="container mx-auto px-4">
                <div class="flex justify-between items-center py-4">
                    <!-- Logo and User Info -->
                    <div class="flex items-center space-x-4">
                        <h1 class="text-2xl font-bold text-red-600">HR System</h1>
                        <span class="text-gray-600 hidden md:inline" id="userInfo">Welcome, ${currentUser.name}</span>
                    </div>

                    <!-- Desktop Navigation -->
                    <div class="hidden lg:flex items-center space-x-4">
                        ${desktopNav}
                        ${adminLink}
                        <button onclick="logout()" class="text-gray-600 hover:text-red-600 transition duration-200">
                            <i class="fas fa-sign-out-alt mr-1"></i> Logout
                        </button>
                    </div>

                    <!-- Mobile Menu Button -->
                    <button onclick="toggleMobileMenu()" class="lg:hidden text-gray-600 hover:text-red-600 focus:outline-none">
                        <i class="fas fa-bars text-2xl"></i>
                    </button>
                </div>

                <!-- Mobile Menu (Hidden by default) -->
                <div id="mobileMenu" class="hidden lg:hidden pb-4 space-y-2">
                    ${mobileNav}
                    ${mobileAdminLink}
                    <button onclick="logout()" class="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg">
                        <i class="fas fa-sign-out-alt mr-2"></i> Logout
                    </button>
                </div>
            </div>
        </nav>
    `;
}

// Toggle mobile menu
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu) {
        mobileMenu.classList.toggle('hidden');
    }
}

// Initialize navigation on page load
document.addEventListener('DOMContentLoaded', function() {
    const navContainer = document.getElementById('navigationContainer');
    if (navContainer) {
        const currentPage = navContainer.getAttribute('data-current-page');
        navContainer.innerHTML = createNavigation(currentPage);
    }
});
