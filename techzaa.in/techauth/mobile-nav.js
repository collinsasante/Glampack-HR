// ========================================
// MOBILE NAVIGATION UTILITIES
// ========================================
// Shared mobile navigation functions for all employee pages

/**
 * Toggle mobile menu visibility
 */
function toggleMobileMenu() {
  const mobileMenu = document.getElementById('mobileMenu');
  if (mobileMenu) {
    mobileMenu.classList.toggle('hidden');
  }
}

/**
 * Check if user is admin/HR and show admin links
 */
async function checkAndShowAdminLink() {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.id) return;

    const employee = await getEmployee(currentUser.id);
    if (employee && employee.fields) {
      const role = employee.fields['Role'] || '';
      if (role === 'Admin' || role === 'HR') {
        // Show desktop admin link
        const adminLink = document.getElementById('adminLink');
        if (adminLink) adminLink.style.display = '';

        // Show mobile admin link
        const adminLinkMobile = document.getElementById('adminLinkMobile');
        if (adminLinkMobile) adminLinkMobile.style.display = '';
      }
    }
  } catch (error) {
    console.error('Error checking admin status:', error);
  }
}

// Auto-run admin link check when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkAndShowAdminLink);
} else {
  // DOM already loaded
  checkAndShowAdminLink();
}
