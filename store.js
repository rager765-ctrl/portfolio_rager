/**
 * Kwabs Store Online — Global State Manager
 * Pure localStorage-based state management with event system.
 */

const KwabsStore = (() => {
  // ─── Storage Keys ────────────────────────────────────────────
  const KEYS = {
    PRODUCTS: 'kwabs_products',
    CATEGORIES: 'kwabs_categories',
    CART: 'kwabs_cart',
    ORDERS: 'kwabs_orders',
    ADMIN_AUTH: 'kwabs_admin_auth',
    INITIALIZED: 'kwabs_initialized',
  };

  // ─── Event System ─────────────────────────────────────────────
  const listeners = {};

  function on(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
  }

  function emit(event, data) {
    if (listeners[event]) {
      listeners[event].forEach(cb => cb(data));
    }
  }

  // ─── Generic Storage Helpers ──────────────────────────────────
  function _get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error(`[KwabsStore] Failed to read ${key}:`, e);
      return null;
    }
  }

  function _set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`[KwabsStore] Failed to write ${key}:`, e);
    }
  }

  // ─── ID Generator ────────────────────────────────────────────
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  // ═══════════════════════════════════════════════════════════════
  //  PRODUCTS
  // ═══════════════════════════════════════════════════════════════

  function getProducts() {
    return _get(KEYS.PRODUCTS) || [];
  }

  function getProductById(id) {
    const products = getProducts();
    return products.find(p => p.id === id) || null;
  }

  function getProductsByCategory(categoryId) {
    if (!categoryId || categoryId === 'all') return getProducts();
    return getProducts().filter(p => p.category_id === categoryId);
  }

  function getFeaturedProducts() {
    return getProducts().filter(p => p.in_stock !== false).slice(0, 8);
  }

  function searchProducts(query) {
    if (!query) return getProducts();
    const q = query.toLowerCase();
    return getProducts().filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  }

  function addProduct(productData) {
    const products = getProducts();
    const newProduct = {
      id: generateId(),
      name: productData.name || '',
      price: parseFloat(productData.price) || 0,
      discount: parseInt(productData.discount) || 0,
      category_id: productData.category_id || '',
      image_url: productData.image_url || '',
      stock: parseInt(productData.stock) || 0,
      description: productData.description || '',
      in_stock: productData.in_stock !== false,
      created_at: new Date().toISOString(),
    };
    products.unshift(newProduct);
    _set(KEYS.PRODUCTS, products);
    emit('products_changed', products);
    return newProduct;
  }

  function updateProduct(id, updates) {
    const products = getProducts();
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return null;
    products[index] = { ...products[index], ...updates, id };
    _set(KEYS.PRODUCTS, products);
    emit('products_changed', products);
    return products[index];
  }

  function deleteProduct(id) {
    const products = getProducts().filter(p => p.id !== id);
    _set(KEYS.PRODUCTS, products);
    emit('products_changed', products);
    return true;
  }

  function toggleProductStock(id) {
    const products = getProducts();
    const product = products.find(p => p.id === id);
    if (!product) return null;
    product.in_stock = !product.in_stock;
    _set(KEYS.PRODUCTS, products);
    emit('products_changed', products);
    return product;
  }

  // ═══════════════════════════════════════════════════════════════
  //  CATEGORIES
  // ═══════════════════════════════════════════════════════════════

  function getCategories() {
    return _get(KEYS.CATEGORIES) || [];
  }

  function getCategoryById(id) {
    return getCategories().find(c => c.id === id) || null;
  }

  function addCategory(categoryData) {
    const categories = getCategories();
    const newCategory = {
      id: generateId(),
      name: categoryData.name || '',
      created_at: new Date().toISOString(),
    };
    categories.push(newCategory);
    _set(KEYS.CATEGORIES, categories);
    emit('categories_changed', categories);
    return newCategory;
  }

  function deleteCategory(id) {
    const categories = getCategories().filter(c => c.id !== id);
    _set(KEYS.CATEGORIES, categories);
    emit('categories_changed', categories);
    return true;
  }

  // ═══════════════════════════════════════════════════════════════
  //  CART
  // ═══════════════════════════════════════════════════════════════

  function getCart() {
    return _get(KEYS.CART) || [];
  }

  function addToCart(product, quantity = 1) {
    const cart = getCart();
    const existing = cart.find(item => item.product_id === product.id);

    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({
        product_id: product.id,
        name: product.name,
        price: product.discount > 0
          ? product.price * (1 - product.discount / 100)
          : product.price,
        original_price: product.price,
        discount: product.discount || 0,
        quantity: quantity,
        image_url: product.image_url,
      });
    }

    _set(KEYS.CART, cart);
    emit('cart_changed', cart);
    return cart;
  }

  function removeFromCart(productId) {
    const cart = getCart().filter(item => item.product_id !== productId);
    _set(KEYS.CART, cart);
    emit('cart_changed', cart);
    return cart;
  }

  function updateCartQuantity(productId, quantity) {
    const cart = getCart();
    const item = cart.find(i => i.product_id === productId);
    if (!item) return cart;

    if (quantity <= 0) {
      return removeFromCart(productId);
    }

    item.quantity = quantity;
    _set(KEYS.CART, cart);
    emit('cart_changed', cart);
    return cart;
  }

  function clearCart() {
    _set(KEYS.CART, []);
    emit('cart_changed', []);
  }

  function getCartTotal() {
    const cart = getCart();
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  function getCartItemCount() {
    const cart = getCart();
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  // ═══════════════════════════════════════════════════════════════
  //  ORDERS
  // ═══════════════════════════════════════════════════════════════

  function getOrders() {
    return _get(KEYS.ORDERS) || [];
  }

  function createOrder(customerInfo) {
    const cart = getCart();
    if (cart.length === 0) return null;

    const orders = getOrders();
    const order = {
      id: generateId(),
      order_number: '#' + (1000 + orders.length + 1),
      customer: {
        name: customerInfo.name || '',
        phone: customerInfo.phone || '',
        address: customerInfo.address || '',
      },
      items: [...cart],
      total_price: getCartTotal(),
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    orders.unshift(order);
    _set(KEYS.ORDERS, orders);
    clearCart();
    emit('orders_changed', orders);
    return order;
  }

  function updateOrderStatus(orderId, status) {
    const orders = getOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order) return null;
    order.status = status;
    _set(KEYS.ORDERS, orders);
    emit('orders_changed', orders);
    return order;
  }

  // ═══════════════════════════════════════════════════════════════
  //  AUTH (Simple Admin Gate)
  // ═══════════════════════════════════════════════════════════════

  const ADMIN_CREDENTIALS = {
    email: 'admin@kwabsstore.com',
    password: 'kwabs2024',
  };

  function adminLogin(email, password) {
    if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
      _set(KEYS.ADMIN_AUTH, { loggedIn: true, email, timestamp: Date.now() });
      return true;
    }
    return false;
  }

  function adminLogout() {
    localStorage.removeItem(KEYS.ADMIN_AUTH);
  }

  function isAdminLoggedIn() {
    const auth = _get(KEYS.ADMIN_AUTH);
    return auth && auth.loggedIn === true;
  }

  // ═══════════════════════════════════════════════════════════════
  //  WHATSAPP INTEGRATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Generate a WhatsApp order message and open wa.me link.
   * @param {Object} order — The order object from createOrder()
   * @param {string} businessPhone — Business WhatsApp number (with country code, no +)
   */
  function sendOrderViaWhatsApp(order, businessPhone = '233553866329') {
    if (!order) return;

    let message = `🛍️ *NEW ORDER — KWABS STORE ONLINE*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📋 Order: ${order.order_number}\n`;
    message += `📅 Date: ${new Date(order.created_at).toLocaleDateString()}\n\n`;
    message += `👤 *Customer Details*\n`;
    message += `Name: ${order.customer.name}\n`;
    message += `Phone: ${order.customer.phone}\n`;
    message += `Address: ${order.customer.address}\n\n`;
    message += `📦 *Order Items*\n`;

    order.items.forEach((item, i) => {
      const itemTotal = (item.price * item.quantity).toFixed(2);
      message += `${i + 1}. ${item.name}\n`;
      message += `   Qty: ${item.quantity} × $${item.price.toFixed(2)} = $${itemTotal}\n`;
    });

    message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    message += `💰 *Total: $${order.total_price.toFixed(2)}*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `Status: ⏳ Pending Confirmation\n`;
    message += `\n_Sent via Kwabs Store Online_`;

    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${businessPhone}?text=${encoded}`;
    window.open(url, '_blank');
    return url;
  }

  // ═══════════════════════════════════════════════════════════════
  //  SEED DATA
  // ═══════════════════════════════════════════════════════════════

  function initializeSeedData() {
    if (_get(KEYS.INITIALIZED)) return;

    // Seed categories
    const categories = [
      { id: 'cat_clothing', name: 'Clothing', created_at: new Date().toISOString() },
      { id: 'cat_shoes', name: 'Shoes', created_at: new Date().toISOString() },
      { id: 'cat_accessories', name: 'Accessories', created_at: new Date().toISOString() },
      { id: 'cat_home', name: 'Home', created_at: new Date().toISOString() },
      { id: 'cat_outerwear', name: 'Outerwear', created_at: new Date().toISOString() },
    ];
    _set(KEYS.CATEGORIES, categories);

    // Seed products
    const products = [
      {
        id: 'prod_001',
        name: 'Structured Midi Dress',
        price: 290.00,
        discount: 15,
        category_id: 'cat_clothing',
        image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCTyqCUa2onA9RmjFs6nQiXv7Qr1WAZc-K7CZBMtNjA1GRDhSzBPk2tJUflrn8VLr4nAqCCJhmeCLjilM_CHxRP3QhnCsCPCHg1Vr03p1cCrZs452-YgcBKAq3X4EYrGmzDP8rP94VmVeTui3u1JoOgkF0hZjlS4nMpmu86PAuX-bnakpTgG9RjCMjdFrhBaEbP-KwV8vT66pf_1CgDgFsplNgXlgERNpXsRID7MYfkOV_G5PKLTDQpBvJ9G7F_ueRQLeTOhRKrXxc',
        stock: 25,
        description: 'An architectural midi dress crafted from premium Italian cotton. Features clean geometric lines and a structured silhouette that drapes with effortless sophistication.',
        in_stock: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'prod_002',
        name: 'Pebbled Leather Trainer',
        price: 180.00,
        discount: 0,
        category_id: 'cat_shoes',
        image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBHuCgXVoNc3S-6sljW0nVjOHGgQxSG6kbFzlIlcaOwNyVFV5fUjvUJXRUpzOBHjFPQMLOUghDpBn_zwdkRhav0VOL7asVTe3Dy95bRMAQ5jYyzdNTTrfI6Dm58LJcJ7S0VolFzP-T9a_ivMANsmvB-LRQSwwnZnpF4Y51QPzK6bRoBa1z9lYg5LSnBLTkxEc-_u9pQVxAOGdZ7fw2jCBzrurb0268sGO6NA91g6VRaxATMrUjlb3kdG2I8OaiqhGnPq6CnOU5TPc8',
        stock: 40,
        description: 'Handcrafted from premium pebbled leather with a minimalist silhouette. Features a cushioned insole and natural rubber outsole for all-day comfort.',
        in_stock: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'prod_003',
        name: 'Essential Heavy Tee',
        price: 65.00,
        discount: 0,
        category_id: 'cat_clothing',
        image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB6ij9OmyxyGSaVyGo0SzSEmiKj1K3eZpBFzce2zxSHjIoVSaTYt4zuEJWE3WTZGKnGnVkEQeY2AobIQdyRZgxN61Tb9yM-eZIzHZcBsDMBP_w-U6u_Ymvb_NLgB91VdRHgv4RHNevqpt-_BLBJhagimMKqHnNGio2gnQ1zfeP6U7978Q8FUEN1YxOq7cZfpsJwkR0YhahS-W3D5yIhCEEevdheZStXI6jrLBIUXOXAZX3dgo22kHqZ6PHyYONsOd68yFWHjf19DCY',
        stock: 100,
        description: 'A wardrobe essential. 280 GSM heavyweight cotton with a relaxed drop-shoulder fit. Pre-washed for a lived-in softness from day one.',
        in_stock: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'prod_004',
        name: 'Vault Leather Clutch',
        price: 445.00,
        discount: 30,
        category_id: 'cat_accessories',
        image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB3mAAdCWEtEK6RP1YCsNzm4_N2jg8j6R69GhT92CHhQ-gKI9q4zskHWzi30xodjrZXg861lotBqWx5zywcLsZQgTDyGU7pdd3GRe41qaBxBC-vyctKjQns0zfjobJtX6SMsQ7d9-0gAE0fZWQcAdpjwTcR36CVwxEhl7_6FJwF6xljDhglaXgEI3MtuySXRnOP-RNipHFfIa6bO5EwSEKa52rMzvL9yXbp6j0b8-e9Z9fY2J2fDmvlSvde23NS3lT1ob8k__4SeV4',
        stock: 12,
        description: 'Statement leather clutch in heritage calfskin. Magnetic closure with luxe satin lining. Hardware in brushed gold finish.',
        in_stock: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'prod_005',
        name: 'Monolith Sculpted Coat',
        price: 1800.00,
        discount: 30,
        category_id: 'cat_outerwear',
        image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlsg2j9U0WRGfrFUG27oJxYee7E4whuELm7MASq9SK4GyL8cECglFnrR_o3MoZk3XmE9_m798-bLaSZ0ioisZ07ZtYwr6M-j7JASs9b5vKLjnnNkpFMAwg6ZTZe6z-IwTFTLKZ9XqIbiMqQdtFRboBe-OyKUXBpOMunRk_9vOT6exs6a22ikTdiuRJg13HI_7rft3L-5IbFOYRZQwxJd1GI0YkrwLoVBExRRplv94E6gfVcc211FmYEz10LfZwzMef5aA9rLhm1qI',
        stock: 8,
        description: 'A study in architectural silhouettes. Meticulously crafted from sustainably sourced heavyweight Italian wool, featuring a signature oversized lapel and hidden magnetic closures.',
        in_stock: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'prod_006',
        name: 'Ascent Wool Blazer',
        price: 520.00,
        discount: 10,
        category_id: 'cat_outerwear',
        image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBaVOWoz6bpxFLzg4SOPoW4Q_Nq9zO2lrKch7LFFS_FquIU7UtJJNuwHhHYN6rk_cCIqlJXW90NLpokQIDxWqbvXEHdzft6djmivND4ounXVpSxH24C5ZzCM2jBwiLAFisKt4mAeTiJHnVqRhzNDMtg2x-AynANdZZ3CYsDDnvOIi-I3hOiIG48BlCUQ5vQV_oY2Ys0yeUKXdB_g6gKlsLE1uTGf3h6P4eDWk_g_kNav7PljKITeUDEQJqR9CV9JZ9tLjJ3QYEtcGo',
        stock: 15,
        description: 'A sharp, contemporary blazer in merino wool blend. Half-canvas construction for a natural drape. Interior pockets in contrasting suede.',
        in_stock: true,
        created_at: new Date().toISOString(),
      },
    ];
    _set(KEYS.PRODUCTS, products);

    _set(KEYS.INITIALIZED, true);
    console.log('[KwabsStore] Seed data initialized.');
  }

  // ─── Public API ──────────────────────────────────────────────
  return {
    // Events
    on,
    emit,

    // Products
    getProducts,
    getProductById,
    getProductsByCategory,
    getFeaturedProducts,
    searchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    toggleProductStock,

    // Categories
    getCategories,
    getCategoryById,
    addCategory,
    deleteCategory,

    // Cart
    getCart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    getCartTotal,
    getCartItemCount,

    // Orders
    getOrders,
    createOrder,
    updateOrderStatus,

    // Auth
    adminLogin,
    adminLogout,
    isAdminLoggedIn,

    // WhatsApp
    sendOrderViaWhatsApp,

    // Init
    initializeSeedData,
    generateId,
  };
})();
