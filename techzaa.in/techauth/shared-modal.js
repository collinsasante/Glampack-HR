/**
 * Shared Modal System - Replaces native alert() with custom UI
 * Used across all pages for consistent user experience
 */

// Toast notification queue
let toastQueue = [];
let isShowingToast = false;

// Create modal HTML and inject into page
function initializeModalSystem() {
  // Check if modal already exists
  if (document.getElementById('customModal')) return;

  const modalHTML = `
    <!-- Toast Container -->
    <div id="toastContainer" class="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <!-- Toasts will be inserted here -->
    </div>

    <!-- Custom Modal -->
    <div id="customModal" class="fixed inset-0 z-50 hidden overflow-y-auto">
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" id="modalBackdrop"></div>

      <!-- Modal Container -->
      <div class="flex items-center justify-center min-h-screen p-4">
        <div class="relative bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all" id="modalContent">
          <!-- Modal Header -->
          <div class="p-6 pb-4">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center">
                <div id="modalIcon" class="mr-3">
                  <!-- Icon will be inserted here -->
                </div>
                <h3 id="modalTitle" class="text-xl font-bold text-gray-900"></h3>
              </div>
              <button onclick="closeCustomModal()" class="text-gray-400 hover:text-gray-600 transition-colors">
                <i class="fas fa-times text-xl"></i>
              </button>
            </div>

            <!-- Modal Body -->
            <div id="modalBody" class="text-gray-700 leading-relaxed">
              <!-- Message will be inserted here -->
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="px-6 py-4 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
            <button id="modalCancelBtn" onclick="closeCustomModal()" class="hidden px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium">
              Cancel
            </button>
            <button id="modalConfirmBtn" onclick="confirmCustomModal()" class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold">
              OK
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Birthday Modal -->
    <div id="birthdayModal" class="fixed inset-0 z-50 hidden overflow-y-auto">
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black bg-opacity-60 transition-opacity"></div>

      <!-- Modal Container -->
      <div class="flex items-center justify-center min-h-screen p-4">
        <div class="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full transform transition-all animate-bounce-in" style="animation: bounceIn 0.6s ease-out; background: linear-gradient(135deg, #fef9e7 0%, #fff5e6 100%);">
          <!-- Confetti Background -->
          <div class="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
            <div class="confetti"></div>
          </div>

          <!-- Close Button -->
          <button onclick="closeBirthdayModal()" class="absolute top-4 right-4 text-gray-600 hover:text-gray-800 transition-colors z-10">
            <i class="fas fa-times text-2xl"></i>
          </button>

          <!-- Modal Content -->
          <div class="relative p-8 text-center" style="background-color: rgba(255, 255, 255, 0.85); border-radius: 1.5rem;">
            <!-- Cake Icon -->
            <div class="mb-6">
              <i class="fas fa-birthday-cake text-8xl text-red-600 animate-pulse"></i>
            </div>

            <!-- Birthday Message -->
            <h2 class="text-4xl font-bold text-gray-900 mb-4">
              🎉 Happy Birthday! 🎉
            </h2>

            <div id="birthdayEmployeeName" class="text-2xl font-semibold text-red-600 mb-6">
              <!-- Employee name will be inserted here -->
            </div>

            <p class="text-lg text-gray-700 mb-8 max-w-md mx-auto">
              Wishing you a wonderful day filled with happiness, success, and all the things you love! 🎂🎈
            </p>

            <!-- Birthday List (if multiple birthdays) -->
            <div id="birthdayList" class="hidden mb-6">
              <!-- List will be inserted here -->
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-4 justify-center">
              <button onclick="viewBirthdayAnnouncement()" class="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full transition-colors text-lg shadow-lg">
                <i class="fas fa-comments mr-2"></i>
                Send Birthday Wishes
              </button>
              <button onclick="closeBirthdayModal()" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-full transition-colors text-lg shadow-lg">
                <i class="fas fa-times mr-2"></i>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <style>
      @keyframes bounceIn {
        0% {
          opacity: 0;
          transform: scale(0.3);
        }
        50% {
          transform: scale(1.05);
        }
        70% {
          transform: scale(0.9);
        }
        100% {
          opacity: 1;
          transform: scale(1);
        }
      }

      .confetti {
        position: absolute;
        width: 10px;
        height: 10px;
        background: #f0f;
        animation: confetti-fall 3s linear infinite;
      }

      @keyframes confetti-fall {
        to {
          transform: translateY(100vh) rotate(360deg);
        }
      }
    </style>
  `;

  // Inject modal into body
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Custom Alert Function
let modalResolve = null;

function customAlert(message, title = 'Alert', type = 'info') {
  return new Promise((resolve) => {
    initializeModalSystem();

    const modal = document.getElementById('customModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalIcon = document.getElementById('modalIcon');
    const cancelBtn = document.getElementById('modalCancelBtn');
    const confirmBtn = document.getElementById('modalConfirmBtn');

    // Store resolve function
    modalResolve = resolve;

    // Set title
    modalTitle.textContent = title;

    // Set message (support HTML)
    if (typeof message === 'string' && message.includes('<')) {
      modalBody.innerHTML = message;
    } else {
      modalBody.textContent = message;
    }

    // Set icon based on type
    const icons = {
      'info': '<div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center"><i class="fas fa-info-circle text-2xl text-blue-600"></i></div>',
      'success': '<div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center"><i class="fas fa-check-circle text-2xl text-green-600"></i></div>',
      'warning': '<div class="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center"><i class="fas fa-exclamation-triangle text-2xl text-yellow-600"></i></div>',
      'error': '<div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center"><i class="fas fa-times-circle text-2xl text-red-600"></i></div>'
    };

    modalIcon.innerHTML = icons[type] || icons['info'];

    // Hide cancel button for alerts
    cancelBtn.classList.add('hidden');

    // Update confirm button style based on type
    confirmBtn.className = 'px-6 py-2 rounded-lg transition-colors font-semibold';
    if (type === 'error' || type === 'warning') {
      confirmBtn.className += ' bg-red-600 text-white hover:bg-red-700';
    } else if (type === 'success') {
      confirmBtn.className += ' bg-green-600 text-white hover:bg-green-700';
    } else {
      confirmBtn.className += ' bg-blue-600 text-white hover:bg-blue-700';
    }

    // Show modal
    modal.classList.remove('hidden');

    // Add animation
    setTimeout(() => {
      modal.querySelector('#modalContent').classList.add('scale-100');
    }, 10);
  });
}

// Custom Confirm Function
function customConfirm(message, title = 'Confirm') {
  return new Promise((resolve) => {
    initializeModalSystem();

    const modal = document.getElementById('customModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalIcon = document.getElementById('modalIcon');
    const cancelBtn = document.getElementById('modalCancelBtn');
    const confirmBtn = document.getElementById('modalConfirmBtn');

    // Store resolve function
    modalResolve = resolve;

    // Set title
    modalTitle.textContent = title;

    // Set message
    modalBody.textContent = message;

    // Set icon
    modalIcon.innerHTML = '<div class="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center"><i class="fas fa-question-circle text-2xl text-orange-600"></i></div>';

    // Show cancel button
    cancelBtn.classList.remove('hidden');

    // Show modal
    modal.classList.remove('hidden');
  });
}

function closeCustomModal() {
  const modal = document.getElementById('customModal');
  modal.classList.add('hidden');

  // Resolve with false for confirm dialogs
  if (modalResolve) {
    modalResolve(false);
    modalResolve = null;
  }
}

function confirmCustomModal() {
  const modal = document.getElementById('customModal');
  modal.classList.add('hidden');

  // Resolve with true
  if (modalResolve) {
    modalResolve(true);
    modalResolve = null;
  }
}

// Birthday Modal Functions
let currentBirthdayCelebrants = [];

function showBirthdayModal(employees) {
  initializeModalSystem();

  const modal = document.getElementById('birthdayModal');
  const nameElement = document.getElementById('birthdayEmployeeName');
  const listElement = document.getElementById('birthdayList');

  // Store celebrants globally for wish sending
  currentBirthdayCelebrants = employees;

  if (employees.length === 1) {
    // Single birthday
    nameElement.textContent = employees[0].name;
    listElement.classList.add('hidden');
  } else {
    // Multiple birthdays
    nameElement.textContent = `${employees.length} team members are celebrating today!`;

    const listHTML = `
      <div class="bg-white rounded-xl p-6 max-w-md mx-auto">
        <h4 class="font-bold text-gray-800 mb-4 text-left">Today's Celebrants:</h4>
        <div class="space-y-3">
          ${employees.map(emp => `
            <div class="flex items-center p-3 bg-yellow-50 rounded-lg">
              <div class="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                ${emp.name.charAt(0)}
              </div>
              <div class="text-left">
                <div class="font-semibold text-gray-900">${emp.name}</div>
                <div class="text-sm text-gray-600">${emp.department || 'Employee'}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    listElement.innerHTML = listHTML;
    listElement.classList.remove('hidden');
  }

  modal.classList.remove('hidden');
}

function closeBirthdayModal() {
  const modal = document.getElementById('birthdayModal');
  modal.classList.add('hidden');
}

// Create birthday announcement in Airtable
async function createBirthdayAnnouncement(celebrants) {
  try {
    if (typeof getAnnouncements !== 'function' || typeof createAnnouncement !== 'function') {
      return; // Announcements API not available
    }

    // Check if birthday announcement already exists for today
    const today = new Date().toISOString().split('T')[0];
    const existingAnnouncements = await getAnnouncements();
    const announcements = existingAnnouncements.records || existingAnnouncements || [];

    const todaysBirthdayAnnouncement = announcements.find(ann => {
      const title = ann.fields['Title'] || '';
      // Check title contains birthday celebration (date field might not exist)
      return title.includes('🎉 Birthday Celebration') && title.includes(today);
    });

    if (todaysBirthdayAnnouncement) {
      return; // Already created
    }

    // Get system user (admin) or first admin user for announcement creator
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    const creatorId = currentUser.id;

    if (!creatorId) return;

    // Create birthday announcement
    const names = celebrants.map(c => c.name).join(', ');
    const message = celebrants.length === 1
      ? `🎂 Today is ${names}'s birthday! Let's wish them a wonderful day filled with happiness and success!\n\n🎈 Use the comments section below to send your birthday wishes! 🎉`
      : `🎂 Today we celebrate ${celebrants.length} team members: ${names}! Let's wish them a wonderful day!\n\n🎈 Use the comments section below to send your birthday wishes! 🎉`;

    // Create announcement (Date field is optional in Airtable)
    const announcementData = {
      'Title': `🎉 Birthday Celebration - ${today}`,
      'Type': 'Event',
      'Message': message,
      'Created By': [creatorId]
    };

    // Only add Date field if it exists in schema
    try {
      announcementData['Date'] = today;
    } catch (e) {
      // Date field doesn't exist, skip it
    }

    await createAnnouncement(announcementData);
  } catch (error) {
    // Show error for debugging
    if (typeof customAlert === 'function') {
      await customAlert('Birthday announcement created with limited info. Check announcements page.', 'Info', 'info');
    }
  }
}

// Clean up old birthday announcements (older than 1 day)
async function cleanupOldBirthdayAnnouncements() {
  try {
    if (typeof getAnnouncements !== 'function' || typeof deleteAnnouncementRecord !== 'function') {
      return; // Announcements API not available
    }

    const announcements = await getAnnouncements();
    const records = announcements.records || announcements || [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Find birthday announcements older than 1 day
    const oldBirthdayAnnouncements = records.filter(ann => {
      const title = ann.fields['Title'] || '';

      if (!title.includes('🎉 Birthday Celebration')) {
        return false; // Not a birthday announcement
      }

      // Extract date from title (format: "🎉 Birthday Celebration - YYYY-MM-DD")
      const dateMatch = title.match(/(\d{4}-\d{2}-\d{2})/);
      if (!dateMatch) {
        return false; // Can't determine date
      }

      const annDateStr = dateMatch[1];

      // Check if announcement is from yesterday or older
      return annDateStr < todayStr;
    });

    // Delete old birthday announcements
    for (const announcement of oldBirthdayAnnouncements) {
      await deleteAnnouncementRecord(announcement.id);
    }
  } catch (error) {
    // Silently handle error
  }
}

// View birthday announcement - redirects to announcements page
async function viewBirthdayAnnouncement() {
  try {
    // Get current user
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    if (!currentUser.id) {
      await customAlert('You must be logged in to view announcements', 'Not Logged In', 'error');
      return;
    }

    // Store birthday celebrants info for announcement page
    sessionStorage.setItem('birthdayCelebrants', JSON.stringify(currentBirthdayCelebrants));

    // Close modal
    closeBirthdayModal();

    // Redirect to announcements page
    window.location.href = 'announcements.html';
  } catch (error) {
    await customAlert('Failed to open announcements. Please try again.', 'Error', 'error');
  }
}

// Check for birthdays on page load
async function checkBirthdays() {
  try {
    // Get current user
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    if (!currentUser.id) return;

    // Check if birthday modal was already shown today
    const lastShown = localStorage.getItem('birthdayModalShown');
    const today = new Date().toDateString();

    if (lastShown === today) {
      return; // Already shown today
    }

    // Get all employees
    const employeesResponse = await getEmployees();
    const employees = employeesResponse.records || employeesResponse || [];

    // Filter employees with today's birthday
    const todayMonth = new Date().getMonth() + 1; // 1-12
    const todayDay = new Date().getDate();

    const birthdayEmployees = employees.filter(emp => {
      // Check multiple possible field names for date of birth
      const dob = emp.fields['Date of Birth'] ||
                  emp.fields['DateOfBirth'] ||
                  emp.fields['Birthday'] ||
                  emp.fields['DOB'];

      if (!dob) return false;

      try {
        const dobDate = new Date(dob);
        // Check if date is valid
        if (isNaN(dobDate.getTime())) return false;

        return dobDate.getMonth() + 1 === todayMonth && dobDate.getDate() === todayDay;
      } catch (e) {
        return false;
      }
    });

    if (birthdayEmployees.length > 0) {
      // Format employee data with IDs for wish sending
      const celebrants = birthdayEmployees.map(emp => ({
        id: emp.id,
        name: emp.fields['Full Name'] || 'Employee',
        department: emp.fields['Department'] || ''
      }));

      // Create birthday announcement if it doesn't exist yet
      await createBirthdayAnnouncement(celebrants);

      // Show birthday modal
      showBirthdayModal(celebrants);

      // Mark as shown for today
      localStorage.setItem('birthdayModalShown', today);
    }

    // Clean up old birthday announcements (older than 1 day)
    await cleanupOldBirthdayAnnouncements();
  } catch (error) {
    // Silently handle error - birthday feature is optional
  }
}

// Check for latest announcement on login
async function checkLatestAnnouncement() {
  try {
    // Get current user
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    if (!currentUser.id) return;

    // Get all announcements
    const announcementsResponse = await getAnnouncements();
    const announcements = announcementsResponse.records || [];

    if (announcements.length === 0) return;

    // Sort by date descending to get the latest
    announcements.sort((a, b) => {
      const dateA = new Date(a.fields['Date'] || 0);
      const dateB = new Date(b.fields['Date'] || 0);
      return dateB - dateA;
    });

    const latestAnnouncement = announcements[0];

    // Check if we've already shown this announcement to this user
    const shownAnnouncementKey = `latestAnnouncementShown_${currentUser.id}`;
    const lastShownAnnouncementId = localStorage.getItem(shownAnnouncementKey);

    // Only show if it's a new announcement
    if (lastShownAnnouncementId !== latestAnnouncement.id) {
      // Check if user has already viewed this announcement
      const announcementReadsResponse = await getAnnouncementReads(null);
      const announcementReads = announcementReadsResponse.records || [];

      const hasUserViewed = announcementReads.some(read => {
        const announcementField = read.fields['Announcement'];
        const employeeField = read.fields['Employee'];
        return Array.isArray(announcementField) && announcementField.includes(latestAnnouncement.id) &&
               Array.isArray(employeeField) && employeeField.includes(currentUser.id);
      });

      // Only show if user hasn't viewed it yet
      if (!hasUserViewed) {
        showLatestAnnouncementModal(latestAnnouncement);
        localStorage.setItem(shownAnnouncementKey, latestAnnouncement.id);
      }
    }
  } catch (error) {
    // Silently handle error - announcement feature is optional
  }
}

// Show latest announcement modal
function showLatestAnnouncementModal(announcement) {
  const priority = announcement.fields['Priority'] || 'Medium';
  const title = announcement.fields['Title'] || 'Untitled';
  const message = announcement.fields['Message'] || '';
  const dateObj = new Date(announcement.fields['Date'] || announcement.createdTime);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const priorityColors = {
    High: 'bg-red-100 text-red-800 border-red-300',
    Medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    Low: 'bg-blue-100 text-blue-800 border-blue-300',
  };

  const priorityIcons = {
    High: 'fa-exclamation-circle',
    Medium: 'fa-info-circle',
    Low: 'fa-flag',
  };

  const priorityColor = priorityColors[priority] || 'bg-gray-100 text-gray-800 border-gray-300';
  const priorityIcon = priorityIcons[priority] || 'fa-info-circle';

  customAlert(
    `
    <div class="text-left">
      <div class="mb-4">
        <span class="px-3 py-1 rounded-full text-sm font-semibold ${priorityColor} border">
          <i class="fas ${priorityIcon} mr-1"></i> ${priority} Priority
        </span>
      </div>
      <p class="text-sm text-gray-600 mb-4">
        <i class="fas fa-calendar mr-2"></i>${formattedDate}
      </p>
      <div class="bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-60 overflow-y-auto">
        <p class="text-gray-800 whitespace-pre-line">${message}</p>
      </div>
      <div class="mt-4 text-center">
        <a href="announcements.html" class="text-red-600 hover:text-red-700 font-semibold">
          <i class="fas fa-bullhorn mr-2"></i>View All Announcements
        </a>
      </div>
    </div>
    `,
    `<i class="fas fa-bullhorn mr-2"></i>${title}`,
    'info'
  );

  // Record view when the modal is shown
  recordAnnouncementViewFromDashboard(announcement.id);
}

// Record announcement view from dashboard
async function recordAnnouncementViewFromDashboard(announcementId) {
  try {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    if (!currentUser.id) return;

    const viewData = {
      'Announcement': [announcementId],
      'Employee': [currentUser.id],
      'Read Date': new Date().toISOString()
    };

    await createAnnouncementRead(viewData);
  } catch (error) {
    // Silently fail
  }
}

// ========================================
// TOAST NOTIFICATION SYSTEM
// ========================================

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - Type of toast: success, error, info, warning
 * @param {number} duration - How long to show the toast in milliseconds (default: 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) {
    // If container doesn't exist yet, initialize modal system first
    initializeModalSystem();
    return showToast(message, type, duration);
  }

  // Create toast element
  const toastId = 'toast-' + Date.now();
  const toast = document.createElement('div');
  toast.id = toastId;
  toast.className = 'pointer-events-auto max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 transform transition-all duration-300 ease-out translate-x-full opacity-0';

  // Define colors and icons for different types
  const typeStyles = {
    success: {
      bgColor: 'bg-green-50',
      textColor: 'text-green-800',
      iconColor: 'text-green-600',
      icon: 'fa-check-circle'
    },
    error: {
      bgColor: 'bg-red-50',
      textColor: 'text-red-800',
      iconColor: 'text-red-600',
      icon: 'fa-exclamation-circle'
    },
    warning: {
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-800',
      iconColor: 'text-yellow-600',
      icon: 'fa-exclamation-triangle'
    },
    info: {
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-800',
      iconColor: 'text-blue-600',
      icon: 'fa-info-circle'
    }
  };

  const style = typeStyles[type] || typeStyles.info;

  toast.innerHTML = `
    <div class="flex-1 w-0 p-4">
      <div class="flex items-start">
        <div class="flex-shrink-0">
          <i class="fas ${style.icon} text-2xl ${style.iconColor}"></i>
        </div>
        <div class="ml-3 flex-1">
          <p class="text-sm font-medium ${style.textColor}">
            ${message}
          </p>
        </div>
      </div>
    </div>
    <div class="flex border-l border-gray-200">
      <button onclick="closeToast('${toastId}')" class="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium ${style.textColor} hover:${style.bgColor} focus:outline-none">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;

  // Add to container
  container.appendChild(toast);

  // Trigger animation
  setTimeout(() => {
    toast.classList.remove('translate-x-full', 'opacity-0');
  }, 10);

  // Auto-remove after duration
  setTimeout(() => {
    closeToast(toastId);
  }, duration);
}

/**
 * Close a specific toast
 */
function closeToast(toastId) {
  const toast = document.getElementById(toastId);
  if (toast) {
    toast.classList.add('translate-x-full', 'opacity-0');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }
}

// Override native alert
window.alert = function(message) {
  return customAlert(message, 'Alert', 'info');
};

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeModalSystem);
} else {
  initializeModalSystem();
}
