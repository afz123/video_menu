import { api } from './api';

const CACHE_PREFIX = 'luxury_menu_cache_';

export const menuService = {
  // Restaurants
  getRestaurants: () => api.get('/restaurants'),
  getRestaurant: (slug) => api.get(`/restaurants/${slug}`),
  updateRestaurant: (slug, data) => api.put(`/restaurants/${slug}`, data),
  
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

  // Translation Service
  translateTexts: (data) => api.post('/translate', data),

  // Admin Auth
  loginAdmin: (password, slug = 'asr-royale') => api.post('/auth/login', { password, slug }),
  verifyAdminToken: (token) => api.post('/auth/verify', { token }),
  changeAdminPassword: (data) => api.post('/auth/change-password', data),
  logoutAdmin: (token) => api.post('/auth/logout', { token })
};
