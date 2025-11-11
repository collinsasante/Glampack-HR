# Navigation Update Guide

## Standard Navigation HTML

Use this navigation for all pages (except attendance-tracker.html which has a centered card layout):

```html
    <!-- Navigation Bar -->
    <nav class="bg-white shadow-lg">
        <div class="container mx-auto px-4">
            <div class="flex justify-between items-center py-4">
                <div class="flex items-center space-x-4">
                    <h1 class="text-2xl font-bold text-sky-600">HR System</h1>
                    <span class="text-gray-600" id="userInfo"></span>
                </div>
                <div class="flex items-center space-x-4">
                    <a href="dashboard.html" class="text-gray-600 hover:text-sky-600">
                        <i class="fas fa-chart-line mr-1"></i> Dashboard
                    </a>
                    <a href="attendance-tracker.html" class="text-gray-600 hover:text-sky-600">
                        <i class="fas fa-clock mr-1"></i> Attendance
                    </a>
                    <a href="leave-request.html" class="text-gray-600 hover:text-sky-600">
                        <i class="fas fa-calendar-alt mr-1"></i> Leave
                    </a>
                    <a href="profile.html" class="text-gray-600 hover:text-sky-600">
                        <i class="fas fa-user mr-1"></i> Profile
                    </a>
                    <a href="announcements.html" class="text-gray-600 hover:text-sky-600">
                        <i class="fas fa-bullhorn mr-1"></i> Announcements
                    </a>
                    <a href="payroll.html" class="text-gray-600 hover:text-sky-600">
                        <i class="fas fa-money-bill-wave mr-1"></i> Payroll
                    </a>
                    <a href="monthly-summary.html" class="text-gray-600 hover:text-sky-600">
                        <i class="fas fa-chart-bar mr-1"></i> Reports
                    </a>
                    <a href="settings.html" class="text-gray-600 hover:text-sky-600">
                        <i class="fas fa-cog mr-1"></i> Settings
                    </a>
                    <button onclick="logout()" class="text-gray-600 hover:text-red-600">
                        <i class="fas fa-sign-out-alt mr-1"></i> Logout
                    </button>
                </div>
            </div>
        </div>
    </nav>
```

## For Active Page Highlighting

Change the active page link to use:
```html
class="text-sky-600 font-semibold"
```

Instead of:
```html
class="text-gray-600 hover:text-sky-600"
```

## For User Info Display

Use this in your JavaScript:
```javascript
document.getElementById('userInfo').textContent = `Welcome, ${currentUser.name}`;
```

NOT:
```javascript
document.getElementById('navUserInfo').textContent = currentUser.name;
```

## Files to Update

- ✅ settings.html (template - already correct)
- ✅ profile.html (updated)
- ⏳ leave-request.html
- ⏳ announcements.html
- ⏳ payroll.html
- ⏳ monthly-summary.html
- ⏳ dashboard.html
- ⏳ admin-dashboard.html
- ⭕ attendance-tracker.html (different layout - skip)
