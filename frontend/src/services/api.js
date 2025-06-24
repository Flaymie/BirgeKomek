import axios from 'axios';

const SERVER_URL = process.env.REACT_APP_API_URL || 'http://localhost:5050';
const API_URL = `${SERVER_URL}/api`;

// Создаем экземпляр axios с базовым URL
const api = axios.create({
  baseURL: API_URL,
  // Не указываем Content-Type по умолчанию.
  // Axios сам будет определять его в зависимости от данных:
  // 'application/json' для объектов и 'multipart/form-data' для FormData.
  withCredentials: true,
});

// Экспортируем ОБА URL для разных нужд
export const serverURL = SERVER_URL; // Для статики (картинки и т.д.)
export const baseURL = API_URL;     // Для запросов к API

// Перехватчик для добавления токена к запросам
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Перехватчик для обработки ошибок ответа
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('Перехват ошибки в api interceptor:', error.message);
    if (error.response) {
      console.error('Данные ответа:', error.response.data);
      console.error('Статус ответа:', error.response.status);
    }
    
    const isRegistrationPage = window.location.pathname.includes('/register');
    
    if (error.response && error.response.status === 401 && !isRegistrationPage) {
      localStorage.removeItem('token');
      if (!window.location.pathname.includes('/login')) {
        sessionStorage.setItem('auth_message', 'Сессия истекла, пожалуйста, авторизуйтесь снова');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Сервис для работы с запросами
const requestsService = {
  // Получить все запросы с фильтрацией и пагинацией
  getRequests: async (params = {}) => {
    return api.get('/requests', { params });
  },
  
  // Получить запрос по ID
  getRequestById: async (id) => {
    return api.get(`/requests/${id}`);
  },
  
  // Создать новый запрос
  createRequest: async (requestData) => {
    return api.post('/requests', requestData);
  },
  
  // Обновить запрос
  updateRequest: async (id, requestData) => {
    return api.put(`/requests/${id}`, requestData);
  },
  
  // Удалить запрос
  deleteRequest: async (id, data) => {
    return api.delete(`/requests/${id}`, { data });
  },
  
  // Назначить помощника
  assignHelper: async (requestId, helperId) => {
    return api.post(`/requests/${requestId}/assign/${helperId}`);
  },

  // --- Новая функция для обновления статуса ---
  updateRequestStatus: (id, status) => {
    return api.put(`/requests/${id}/status`, { status });
  },

  // Отклик на заявку
  addResponse: (requestId, comment) => {
    return api.post('/responses', { requestId, comment });
  },

  // Отменить запрос
  cancelRequest: (id) => api.post(`/requests/${id}/cancel`),

  // Переоткрыть запрос
  reopenRequest: (id) => api.post(`/requests/${id}/reopen`)
};

// Сервис для работы с откликами на запросы
const responsesService = {
  // Получить все отклики для запроса
  getResponsesForRequest: async (requestId) => {
    return api.get(`/responses/${requestId}`);
  },
  
  // Отправить отклик на запрос
  createResponse: async (responseData) => {
    // Проверяем формат данных и обеспечиваем правильную структуру
    const payload = {
      requestId: responseData.requestId,
      message: responseData.message,
    };
    return api.post('/responses', payload);
  },
  
  // Принять отклик
  acceptResponse: async (responseId) => {
    return api.put(`/responses/${responseId}/status`, { status: 'accepted' });
  },
  
  // Отклонить отклик
  rejectResponse: async (responseId) => {
    return api.put(`/responses/${responseId}/status`, { status: 'rejected' });
  }
};

// Сервис для работы с пользователями
const usersService = {
  // Получить текущего пользователя
  getCurrentUser: async () => {
    return api.get('/users/me');
  },
  
  // Получить пользователя по ID
  getUserById: async (id) => {
    return api.get(`/users/${id}`);
  },
  
  // Обновить профиль пользователя
  updateProfile: async (userData) => {
    return api.put('/users/me', userData);
  },
  
  // Обновить пароль пользователя
  updatePassword: async (currentPassword, newPassword) => {
    return api.put('/users/password', { currentPassword, newPassword });
  },

  // Удалить свой аккаунт
  deleteAccount: () => {
    return api.delete('/users/me');
  }
};

// Сервис для работы с аутентификацией
const authService = {
  register: async (userData) => {
    try {
      const formData = new FormData();
      formData.append('username', userData.username);
      formData.append('email', userData.email);
      formData.append('password', userData.password);

      if (userData.roles) {
        if (userData.roles.student) {
          formData.append('role', 'student');
          if (userData.grade) formData.append('grade', userData.grade);
        } else if (userData.roles.helper) {
          formData.append('role', 'helper');
          if (userData.subjects && userData.subjects.length > 0) {
            formData.append('subjects', JSON.stringify(userData.subjects));
          }
        }
      }

      if (userData.avatar && userData.avatar.startsWith('data:image')) {
        const base64Response = await fetch(userData.avatar);
        const blob = await base64Response.blob();
        formData.append('avatar', blob, 'avatar.jpg');
      }

      return api.post('/auth/register', formData);
    } catch (error) {
      console.error('Ошибка при регистрации в api.js:', error.response?.data || error.message);
      throw error;
    }
  },
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => localStorage.removeItem('token'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  // --- Новые функции для проверки ---
  checkUsername: (username) => api.post('/auth/check-username', { username }),
  checkEmail: (email) => api.post('/auth/check-email', { email }),
};

// Сервис для работы с сообщениями
const messagesService = {
  // Получить сообщения для запроса
  getMessages: async (requestId) => {
    return api.get(`/messages/${requestId}`);
  },
  
  // Отправить сообщение
  sendMessage: async (requestId, content) => {
    return api.post('/messages', { requestId, content });
  },
  
  // Отправить сообщение с вложением
  sendMessageWithAttachment: async (requestId, content, file) => {
    const formData = new FormData();
    formData.append('requestId', requestId);
    formData.append('content', content);
    formData.append('attachment', file);
    
    // Axios сам установит правильный Content-Type с boundary
    return api.post('/messages/upload', formData);
  },
  
  // Отметить сообщения как прочитанные
  markMessagesAsRead: async (requestId) => {
    return api.post('/messages/read', { requestId });
  },
  
  // Редактировать сообщение
  editMessage: async (messageId, content) => {
    return api.put(`/messages/${messageId}`, { content });
  },

  // Удалить сообщение
  deleteMessage: async (messageId) => {
    return api.delete(`/messages/${messageId}`);
  },
  
  // Получить список чатов пользователя
  getUserChats: async () => {
    return api.get('/chats');
  }
};

// Сервис для работы с чатами
const chatsService = {
  // Получить список чатов пользователя
  getUserChats: async () => {
    return api.get('/chats');
  },
  
  // Получить количество непрочитанных сообщений
  getUnreadCount: async () => {
    return api.get('/chats/unread');
  }
};

// Сервис для работы с уведомлениями
const notificationsService = {
  // Получить все уведомления
  getNotifications: async () => {
    return api.get('/notifications');
  },
  
  // Получить количество непрочитанных уведомлений
  getUnreadCount: async () => {
    return api.get('/notifications/unread');
  },

  // Пометить все уведомления как прочитанные
  markAllAsRead: async () => {
    return api.put('/notifications/read-all');
  },
};

// --- Сервис для отзывов ---
export const reviewsService = {
  // Создать отзыв
  createReview: (requestId, rating, comment) => {
    return api.post('/reviews', { requestId, rating, comment });
  },

  // Получить отзывы для хелпера
  getReviewsForHelper: (helperId) => {
    return api.get(`/reviews/helper/${helperId}`);
  }
};

export {
  api,
  requestsService,
  usersService,
  authService,
  messagesService,
  responsesService,
  chatsService,
  notificationsService
}; 