import { api } from './api';

export const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  
  if (token) {
    return { 'Authorization': `Bearer ${token}` };
  } else {
    return {};
  }
};

const notificationService = {
  getAllNotifications: async (page = 1, limit = 10) => {
    return api.get('/notifications', { params: { page, limit } });
  },

  getUnreadCount: async () => {
    return api.get('/notifications/unread/count');
  },

  markAsRead: async (notificationId) => {
    return api.put(`/notifications/${notificationId}/read`);
  },

  markAllAsRead: async () => {
    return api.put('/notifications/read-all');
  },

  delete: async (notificationId) => {
    return api.delete(`/notifications/${notificationId}`);
  },
};

export default notificationService; 