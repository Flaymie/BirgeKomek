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
    // --- НОВОЕ УСЛОВИЕ ---
    // Не логируем 404 для запросов профиля или отдельных реквестов, так как это ожидаемое поведение
    const isUserNotFound = error.response?.status === 404 && error.config.url.startsWith('/users/');
    const isRequestNotFound = (error.response?.status === 404 || error.response?.status === 400) && error.config.url.startsWith('/requests/');

    if (isUserNotFound || isRequestNotFound) {
      return Promise.reject(error); // Просто пробрасываем ошибку дальше без логирования
    }

    console.error('Перехват ошибки в api interceptor:', error.message);
    if (error.response) {
      console.error('Данные ответа:', error.response.data);
      console.error('Статус ответа:', error.response.status);
      
      // Обработка бана пользователя
      if (error.response?.data?.isBanned) {
        if (window.authContext) {
          // Вызываем единый обработчик бана из AuthContext
          window.authContext.handleBan(error.response.data.banDetails);
        }
      }
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
  },

  // --- Новые функции для модерации ---
  banUser: (userId, reason, duration) => {
    return api.post(`/users/${userId}/ban`, { reason, duration });
  },

  unbanUser: (userId) => {
    return api.post(`/users/${userId}/unban`);
  }
};

// Сервис для работы с аутентификацией
const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  checkAuth: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  getProfile: (userId) => api.get(`/users/profile/${userId}`),
  updateProfile: (userId, profileData) => api.put(`/users/profile/${userId}`, profileData),
  // --- Новые функции для проверки ---
  checkUsername: (username) => api.post('/auth/check-username', { username }),
  checkEmail: (email) => api.post('/auth/check-email', { email }),
  
  // Генерация токена для входа через Telegram
  generateTelegramToken: () => api.post('/auth/telegram/generate-token'),

  // Проверка статуса токена Telegram
  checkTelegramToken: (token) => api.get(`/auth/telegram/check-token/${token}`),
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
  markAsRead: async (requestId) => {
    return api.post(`/messages/${requestId}/read`);
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
const reviewsService = {
  // Создать отзыв
  createReview: (requestId, rating, comment) => {
    return api.post('/reviews', { requestId, rating, comment });
  },

  // Получить отзывы для хелпера
  getReviewsForHelper: (helperId) => {
    return api.get(`/reviews/helper/${helperId}`);
  },

  // Получить отзывы для пользователя
  getReviewsForUser: (userId) => {
    return api.get(`/reviews/user/${userId}`);
  }
};

// --- Сервис для работы с Telegram ---
const telegramService = {
  generateLinkToken: () => api.post('/auth/generate-link-token'),
  checkLinkStatus: (token) => api.get(`/auth/check-link-status/${token}`),
  unlinkAccount: () => api.post('/auth/unlink-telegram')
};

export {
  api,
  requestsService,
  usersService,
  authService,
  messagesService,
  responsesService,
  chatsService,
  notificationsService,
  reviewsService,
  telegramService
}; 