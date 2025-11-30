/**
 * Shared Modal System - Replaces native alert() with custom UI
 * Used across all pages for consistent user experience
 */

// Create modal HTML and inject into page
function initializeModalSystem() {
  // Check if modal already exists
  if (document.getElementById('customModal')) return;

  const modalHTML = `
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
        <div class="relative bg-gradient-to-br from-yellow-50 to-orange-50 rounded-3xl shadow-2xl max-w-2xl w-full transform transition-all animate-bounce-in" style="animation: bounceIn 0.6s ease-out">
          <!-- Confetti Background -->
          <div class="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
            <div class="confetti"></div>
          </div>

          <!-- Close Button -->
          <button onclick="closeBirthdayModal()" class="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors z-10">
            <i class="fas fa-times text-2xl"></i>
          </button>

          <!-- Modal Content -->
          <div class="relative p-8 text-center">
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

            <!-- Action Button -->
            <button onclick="closeBirthdayModal()" class="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full transition-colors text-lg shadow-lg">
              <i class="fas fa-gift mr-2"></i>
              Continue
            </button>
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
function showBirthdayModal(employees) {
  initializeModalSystem();

  const modal = document.getElementById('birthdayModal');
  const nameElement = document.getElementById('birthdayEmployeeName');
  const listElement = document.getElementById('birthdayList');

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
    const employees = await getEmployees();

    // Filter employees with today's birthday
    const todayMonth = new Date().getMonth() + 1; // 1-12
    const todayDay = new Date().getDate();

    const birthdayEmployees = employees.filter(emp => {
      const dob = emp.fields['Date of Birth'];
      if (!dob) return false;

      const dobDate = new Date(dob);
      return dobDate.getMonth() + 1 === todayMonth && dobDate.getDate() === todayDay;
    });

    if (birthdayEmployees.length > 0) {
      // Format employee data
      const celebrants = birthdayEmployees.map(emp => ({
        name: emp.fields['Full Name'] || 'Employee',
        department: emp.fields['Department'] || ''
      }));

      // Show birthday modal
      showBirthdayModal(celebrants);

      // Mark as shown for today
      localStorage.setItem('birthdayModalShown', today);
    }
  } catch (error) {
    // Silently handle error
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
