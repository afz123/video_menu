import { api } from './api';

const CACHE_PREFIX = 'luxury_menu_cache_';

export const menuService = {
  // Restaurants
  getRestaurants: () => api.get('/restaurants'),
  getRestaurant: (slug) => api.get(`/restaurants/${slug}`),
  createRestaurant: (data) => api.post('/restaurants', data),
  updateRestaurant: (slug, data) => api.put(`/restaurants/${slug}`, data),
  cloneMenu: (targetSlug, sourceSlug) => api.post(`/restaurants/${targetSlug}/clone-menu-from/${sourceSlug}`),
  
  getCachedMenu: (slug, includeUnavailable = false) => {
    if (typeof window === 'undefined') return null;
    const cacheKey = `${CACHE_PREFIX}${slug}_${includeUnavailable}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (_) {
      return null;
    }
  },

  // Resilient Full Menu with Stale-While-Revalidate strategy
  getFullMenu: async (slug, includeUnavailable = false) => {
    const cacheKey = `${CACHE_PREFIX}${slug}_${includeUnavailable}`;
    try {
      const data = await api.get(`/restaurants/${slug}/full-menu?include_unavailable=${includeUnavailable}`);
      if (typeof window !== 'undefined' && data) {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch (_) {}
      }
      return data;
    } catch (err) {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            parsed._isOffline = true;
            return parsed;
          } catch (_) {}
        }
      }
      throw err;
    }
  },

  updateTheme: (slug, themeConfig) => 
    api.put(`/restaurants/${slug}/theme`, themeConfig),

  updateUIConfig: (slug, uiConfig) =>
    api.put(`/restaurants/${slug}/ui-config`, uiConfig),

  // Categories
  getCategories: (restaurantId) => 
    api.get(`/categories?restaurant_id=${restaurantId}`),
  createCategory: (data) => 
    api.post('/categories', data),
  updateCategory: (id, data) => 
    api.put(`/categories/${id}`, data),
  deleteCategory: (id) => 
    api.delete(`/categories/${id}`),
  reorderCategories: (items) => 
    api.post('/categories/reorder', items),

  // Dishes
  getDishes: (restaurantId, categoryId) => {
    let url = `/dishes?restaurant_id=${restaurantId}`;
    if (categoryId) url += `&category_id=${categoryId}`;
    return api.get(url);
  },
  createDish: (data) => api.post('/dishes', data),
  updateDish: (id, data) => api.put(`/dishes/${id}`, data),
  deleteDish: (id) => api.delete(`/dishes/${id}`),
  toggleStopList: (id) => api.patch(`/dishes/${id}/toggle-stop-list`),
  reorderDishes: (items) => api.post('/dishes/reorder', items),

  // Video Upload
  uploadVideo: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/dishes/upload-video', formData);
  },
  getMediaStatus: (mediaId) => api.get(`/media/${mediaId}`),

  // Kiosk
  getKioskConfig: (slug) => api.get(`/kiosk/${slug}/config`),

  // Smart Table Service (Waiters, Bills, Guest Orders)
  createServiceRequest: (slug, data) => 
    api.post(`/restaurants/${slug}/service-requests`, data),
  getServiceRequests: (slug, status) => 
    api.get(`/restaurants/${slug}/service-requests${status ? `?status=${status}` : ''}`),
  updateServiceRequestStatus: (slug, reqId, status) => 
    api.patch(`/restaurants/${slug}/service-requests/${reqId}/status`, { status }),
  testTelegram: (slug) => api.post(`/restaurants/${slug}/test-telegram`),
  getTableSignature: (slug, table) => 
    api.get(`/restaurants/${slug}/table-signature?table=${encodeURIComponent(table)}`),
  getTableSignatures: (slug, count = 50, tables = '') => 
    api.get(`/restaurants/${slug}/table-signatures?count=${count}${tables ? `&tables=${encodeURIComponent(tables)}` : ''}`),
  getEngineConfig: (slug) => 
    api.get(`/restaurants/${slug}/engine-config`),

  // Translation Service
  translateTexts: (data) => api.post('/translate', data),

  // Table Reservations Engine
  getReservationSlots: (slug, date, guests = 2, zoneId = null) => {
    let url = `/reservations/slots?restaurant_slug=${encodeURIComponent(slug)}&date=${encodeURIComponent(date)}&guests=${guests}`;
    if (zoneId) url += `&zone_id=${zoneId}`;
    return api.get(url);
  },
  getReservationZones: (slug) =>
    api.get(`/reservations/zones?restaurant_slug=${encodeURIComponent(slug)}`),
  createReservation: (data) =>
    api.post('/reservations', data),
  getAdminReservations: (slug, date = null, status = null) => {
    let url = `/reservations/admin/list?restaurant_slug=${encodeURIComponent(slug)}`;
    if (date) url += `&date=${encodeURIComponent(date)}`;
    if (status && status !== 'ALL') url += `&status=${encodeURIComponent(status)}`;
    return api.get(url);
  },
  updateReservationStatus: (reservationId, status, tableId = null, adminNotes = null) =>
    api.patch(`/reservations/${reservationId}/status`, { status, table_id: tableId, admin_notes: adminNotes }),

  // Table & Zone Floor Management
  createZone: (slug, data) => api.post('/reservations/admin/zones', { restaurant_slug: slug, ...data }),
  updateZone: (zoneId, data) => api.put(`/reservations/admin/zones/${zoneId}`, data),
  deleteZone: (zoneId) => api.delete(`/reservations/admin/zones/${zoneId}`),
  createTable: (slug, data) => api.post('/reservations/admin/tables', { restaurant_slug: slug, ...data }),
  updateTable: (tableId, data) => api.put(`/reservations/admin/tables/${tableId}`, data),
  deleteTable: (tableId) => api.delete(`/reservations/admin/tables/${tableId}`),


  // Admin Auth
  loginAdmin: (password, slug = 'asr-royale') => api.post('/auth/login', { password, slug }),
  verifyAdminToken: (token) => api.post('/auth/verify', { token }),
  changeAdminPassword: (data) => api.post('/auth/change-password', data),
  logoutAdmin: (token) => api.post('/auth/logout', { token })
};

