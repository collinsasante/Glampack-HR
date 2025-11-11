// ========================================
// SHARED NAVIGATION COMPONENT
// ========================================

function createNavigation(currentPage = '') {
    const currentUser = getCurrentUser();

    // Check if user is admin/HR
    let isAdmin = false;
    checkIfUserIsAdmin().then(result => {
        isAdmin = result;
        updateAdminLink();
    });

    async function checkIfUserIsAdmin() {
        try {
            const AIRTABLE_CONFIG = {
                apiKey: 'YOUR_AIRTABLE_API_KEY',
                baseId: 'YOUR_AIRTABLE_BASE_ID'
            };

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
                return role === 'Admin' || role === 'HR';
            }
        } catch (error) {
            console.error('Error checking admin status:', error);
        }
        return false;
    }

    function updateAdminLink() {
        const adminLinkContainer = document.getElementById('adminLinkContainer');
        if (adminLinkContainer && isAdmin) {
            adminLinkContainer.classList.remove('hidden');
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
        return `
            <a href="${item.href}" class="${activeClass}">
                <i class="fas ${item.icon} mr-1"></i> ${item.name}
            </a>
        `;
    }).join('');

    // Admin link (hidden by default)
    const adminLink = `
        <div id="adminLinkContainer" class="hidden">
            <a href="admin-dashboard.html" class="${currentPage === 'admin' ? 'text-red-600 font-semibold' : 'text-gray-600 hover:text-red-600'}">
                <i class="fas fa-user-shield mr-1"></i> Admin
            </a>
        </div>
    `;

    // Mobile Menu Items
    const mobileNav = navItems.map(item => {
        const isActive = currentPage === item.page;
        const activeClass = isActive ? 'bg-red-100 text-red-600 font-semibold' : 'text-gray-700 hover:bg-gray-100';
        return `
            <a href="${item.href}" class="block px-4 py-3 ${activeClass} rounded-lg">
                <i class="fas ${item.icon} mr-2"></i> ${item.name}
            </a>
        `;
    }).join('');

    // Mobile Admin Link
    const mobileAdminLink = `
        <div id="mobileAdminLinkContainer" class="hidden">
            <a href="admin-dashboard.html" class="block px-4 py-3 ${currentPage === 'admin' ? 'bg-red-100 text-red-600 font-semibold' : 'text-gray-700 hover:bg-gray-100'} rounded-lg">
                <i class="fas fa-user-shield mr-2"></i> Admin
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
