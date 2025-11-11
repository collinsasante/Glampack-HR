// ========================================
// SHARED UI COMPONENTS AND UTILITIES
// ========================================

// Loading Spinner Component
function showLoadingSpinner(container, message = 'Loading...') {
    return `
        <div class="flex flex-col items-center justify-center py-12">
            <div class="relative">
                <div class="w-16 h-16 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
            </div>
            <p class="text-gray-600 mt-4">${message}</p>
        </div>
    `;
}

// Empty State Component
function showEmptyState(icon, title, message) {
    return `
        <div class="flex flex-col items-center justify-center py-12">
            <i class="fas ${icon} text-6xl text-gray-300 mb-4"></i>
            <h3 class="text-xl font-semibold text-gray-700 mb-2">${title}</h3>
            <p class="text-gray-500">${message}</p>
        </div>
    `;
}

// Error State Component
function showErrorState(message) {
    return `
        <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <i class="fas fa-exclamation-circle text-red-600 text-4xl mb-3"></i>
            <p class="text-red-800 font-medium">${message}</p>
            <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition duration-200">
                <i class="fas fa-redo mr-2"></i> Try Again
            </button>
        </div>
    `;
}

// Success Toast Notification
function showSuccessToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-4 rounded-lg shadow-xl z-50 flex items-center space-x-3 animate-slide-in';
    toast.innerHTML = `
        <i class="fas fa-check-circle text-2xl"></i>
        <span class="font-medium">${message}</span>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('animate-fade-out');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Error Toast Notification
function showErrorToast(message, duration = 4000) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-4 rounded-lg shadow-xl z-50 flex items-center space-x-3 animate-slide-in';
    toast.innerHTML = `
        <i class="fas fa-exclamation-circle text-2xl"></i>
        <span class="font-medium">${message}</span>
        <button onclick="this.parentElement.remove()" class="ml-4 hover:text-red-200">
            <i class="fas fa-times"></i>
        </button>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('animate-fade-out');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Info Toast Notification
function showInfoToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-4 rounded-lg shadow-xl z-50 flex items-center space-x-3 animate-slide-in';
    toast.innerHTML = `
        <i class="fas fa-info-circle text-2xl"></i>
        <span class="font-medium">${message}</span>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('animate-fade-out');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Confirmation Dialog
function showConfirmDialog(title, message, onConfirm, confirmText = 'Confirm', cancelText = 'Cancel') {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    overlay.innerHTML = `
        <div class="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <h3 class="text-xl font-bold text-gray-800 mb-3">${title}</h3>
            <p class="text-gray-600 mb-6">${message}</p>
            <div class="flex justify-end space-x-3">
                <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition duration-200">
                    ${cancelText}
                </button>
                <button id="confirmBtn" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition duration-200">
                    ${confirmText}
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('confirmBtn').onclick = () => {
        onConfirm();
        overlay.remove();
    };

    overlay.onclick = (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    };
}

// Format Currency
function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

// Format Date
function formatDate(dateString, format = 'long') {
    const date = new Date(dateString);
    const options = {
        short: { year: 'numeric', month: 'short', day: 'numeric' },
        long: { year: 'numeric', month: 'long', day: 'numeric' },
        full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    };
    return date.toLocaleDateString('en-US', options[format] || options.long);
}

// Format Time
function formatTime(timeString) {
    if (!timeString || timeString === '--:--') return '--:--';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

// Calculate Time Difference in Hours
function calculateHoursDifference(startTime, endTime) {
    if (!startTime || !endTime) return 0;
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    const startInMinutes = startHours * 60 + startMinutes;
    const endInMinutes = endHours * 60 + endMinutes;
    return ((endInMinutes - startInMinutes) / 60).toFixed(2);
}

// Debounce Function for Search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Copy to Clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showSuccessToast('Copied to clipboard!');
    }).catch(() => {
        showErrorToast('Failed to copy to clipboard');
    });
}

// Download as CSV
function downloadCSV(data, filename) {
    const csv = data.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    showSuccessToast('CSV downloaded successfully!');
}

// Stat Card Component
function createStatCard(title, value, icon, color, trend = null) {
    const trendHtml = trend ? `
        <div class="flex items-center text-xs ${trend > 0 ? 'text-green-600' : 'text-red-600'}">
            <i class="fas fa-arrow-${trend > 0 ? 'up' : 'down'} mr-1"></i>
            ${Math.abs(trend)}%
        </div>
    ` : '';

    const colorClasses = {
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        yellow: 'bg-yellow-100 text-yellow-600',
        red: 'bg-red-100 text-red-600',
        purple: 'bg-purple-100 text-purple-600',
        sky: 'bg-red-100 text-red-600'
    };

    return `
        <div class="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all duration-200 cursor-pointer transform hover:-translate-y-1">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-gray-500 text-sm font-medium">${title}</p>
                    <h3 class="text-3xl font-bold text-gray-800 mt-2">${value}</h3>
                    ${trendHtml}
                </div>
                <div class="${colorClasses[color] || colorClasses.blue} rounded-full p-4">
                    <i class="fas ${icon} text-2xl"></i>
                </div>
            </div>
        </div>
    `;
}

// Badge Component
function createBadge(text, type = 'default') {
    const types = {
        success: 'bg-green-100 text-green-800',
        warning: 'bg-yellow-100 text-yellow-800',
        danger: 'bg-red-100 text-red-800',
        info: 'bg-blue-100 text-blue-800',
        default: 'bg-gray-100 text-gray-800'
    };

    return `<span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${types[type]}">${text}</span>`;
}

// Pagination Component
function createPagination(currentPage, totalPages, onPageChange) {
    if (totalPages <= 1) return '';

    let pages = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
    }

    return `
        <div class="flex items-center justify-center space-x-2 mt-6">
            <button onclick="${onPageChange}(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}
                    class="px-3 py-2 border rounded-lg ${currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}">
                <i class="fas fa-chevron-left"></i>
            </button>
            ${pages.map(page => `
                <button onclick="${onPageChange}(${page})"
                        class="px-4 py-2 border rounded-lg ${page === currentPage ? 'bg-red-600 text-white' : 'text-gray-700 hover:bg-gray-100'}">
                    ${page}
                </button>
            `).join('')}
            <button onclick="${onPageChange}(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}
                    class="px-3 py-2 border rounded-lg ${currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
}

// Add custom animations to the page
function injectCustomStyles() {
    if (document.getElementById('customStyles')) return;

    const style = document.createElement('style');
    style.id = 'customStyles';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        @keyframes fadeOut {
            from {
                opacity: 1;
            }
            to {
                opacity: 0;
            }
        }

        @keyframes scaleIn {
            from {
                transform: scale(0.9);
                opacity: 0;
            }
            to {
                transform: scale(1);
                opacity: 1;
            }
        }

        .animate-slide-in {
            animation: slideIn 0.3s ease-out;
        }

        .animate-fade-out {
            animation: fadeOut 0.3s ease-out;
        }

        .animate-scale-in {
            animation: scaleIn 0.2s ease-out;
        }

        .skeleton {
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: loading 1.5s infinite;
        }

        @keyframes loading {
            0% {
                background-position: 200% 0;
            }
            100% {
                background-position: -200% 0;
            }
        }

        .table-hover tbody tr:hover {
            background-color: #f9fafb;
            cursor: pointer;
        }

        .smooth-shadow {
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
            transition: box-shadow 0.3s ease;
        }

        .smooth-shadow:hover {
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }
    `;
    document.head.appendChild(style);
}

// Initialize components on page load
document.addEventListener('DOMContentLoaded', injectCustomStyles);

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showLoadingSpinner,
        showEmptyState,
        showErrorState,
        showSuccessToast,
        showErrorToast,
        showInfoToast,
        showConfirmDialog,
        formatCurrency,
        formatDate,
        formatTime,
        calculateHoursDifference,
        debounce,
        copyToClipboard,
        downloadCSV,
        createStatCard,
        createBadge,
        createPagination
    };
}
