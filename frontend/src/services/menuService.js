import { api } from './api';

export const menuService = {
  // Restaurants
  getRestaurants: () => api.get('/restaurants'),
  getRestaurant: (slug) => api.get(`/restaurants/${slug}`),
  getFullMenu: (slug, includeUnavailable = false) => 
    api.get(`/restaurants/${slug}/full-menu?include_unavailable=${includeUnavailable}`),
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
  getKioskConfig: (slug) => api.get(`/kiosk/${slug}/config`)
};
