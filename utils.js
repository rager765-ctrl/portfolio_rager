/**
 * Kwabs Store Online — Utility Functions
 */

const KwabsUtils = {
  /**
   * Format a number as USD currency.
   */
  formatPrice(amount) {
    return '$' + parseFloat(amount).toFixed(2);
  },

  /**
   * Calculate discounted price.
   */
  calcDiscountedPrice(price, discountPercent) {
    if (!discountPercent || discountPercent <= 0) return price;
    return price * (1 - discountPercent / 100);
  },

  /**
   * Format ISO date string to readable format.
   */
  formatDate(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  },

  /**
   * Relative time (e.g., "2 mins ago").
   */
  timeAgo(isoString) {
    if (!isoString) return '';
    const now = Date.now();
    const then = new Date(isoString).getTime();
    const diff = Math.floor((now - then) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    return KwabsUtils.formatDate(isoString);
  },

  /**
   * Get URL query parameter.
   */
  getParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  },

  /**
   * Show a toast notification.
   */
  toast(message, type = 'success') {
    const existing = document.getElementById('kwabs-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'kwabs-toast';
    toast.className = `kwabs-toast kwabs-toast--${type}`;
    toast.innerHTML = `
      <span class="material-symbols-outlined" style="font-size:18px;">
        ${type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info'}
      </span>
      <span>${message}</span>
    `;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('kwabs-toast--visible'));
    setTimeout(() => {
      toast.classList.remove('kwabs-toast--visible');
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  },

  /**
   * Debounce function.
   */
  debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  /**
   * Convert a file to a data URL (for local image preview/storage).
   */
  fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  /**
   * Check if admin is logged in, redirect if not.
   */
  requireAdmin() {
    if (!KwabsStore.isAdminLoggedIn()) {
      window.location.href = 'admin-login.html';
      return false;
    }
    return true;
  },

  /**
   * Render the cart badge count in a nav element.
   */
  updateCartBadge() {
    const badges = document.querySelectorAll('[data-cart-badge]');
    const count = KwabsStore.getCartItemCount();
    badges.forEach(badge => {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    });
  },
};
