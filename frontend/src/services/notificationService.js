import { api } from './api';

// Функция для получения хедера авторизации
export const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  
  if (token) {
    return { 'Authorization': `Bearer ${token}` };
  } else {
    return {};
  }
};

const notificationService = {
  // Получить все уведомления (с пагинацией)
  getAllNotifications: async (page = 1, limit = 10) => {
    return api.get('/notifications', { params: { page, limit } });
  },

  // Получить количество непрочитанных уведомлений
  getUnreadCount: async () => {
    return api.get('/notifications/unread/count');
  },

  // Отметить уведомление как прочитанное
  markAsRead: async (notificationId) => {
    return api.put(`/notifications/${notificationId}/read`);
  },

  // Отметить все уведомления как прочитанные
  markAllAsRead: async () => {
    return api.put('/notifications/read-all');
  },

  // Удалить уведомление
  delete: async (notificationId) => {
    return api.delete(`/notifications/${notificationId}`);
  },
};

export default notificationService; 