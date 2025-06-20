import axios from 'axios';

const API_URL = 'http://192.168.1.87:5050/api';

// Создаем экземпляр axios с базовым URL
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Экспортируем базовый URL для использования в компонентах
export const baseURL = API_URL;

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
    // Если 401 - токен истек или невалидный
    if (error.response && error.response.status === 401) {
      // Удаляем невалидный токен
      localStorage.removeItem('token');
      
      // Проверяем, находимся ли мы уже на странице логина, чтобы избежать бесконечного редиректа
      if (!window.location.pathname.includes('/login')) {
        // Сохраняем сообщение в sessionStorage для отображения на странице логина
        sessionStorage.setItem('auth_message', 'Сессия истекла, пожалуйста, авторизуйтесь снова');
        
        // Перенаправляем на страницу логина
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
  deleteRequest: async (id) => {
    return api.delete(`/requests/${id}`);
  },
  
  // Назначить помощника
  assignHelper: async (requestId, helperId) => {
    return api.post(`/requests/${requestId}/assign/${helperId}`);
  }
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
  }
};

// Сервис для работы с аутентификацией
const authService = {
  // Регистрация
  register: async (userData) => {
    return api.post('/auth/register', userData);
  },
  
  // Вход
  login: async (credentials) => {
    return api.post('/auth/login', credentials);
  },
  
  // Выход
  logout: () => {
    localStorage.removeItem('token');
  },
  
  // Восстановление пароля
  forgotPassword: async (email) => {
    return api.post('/auth/forgot-password', { email });
  },
  
  // Сброс пароля
  resetPassword: async (token, password) => {
    return api.post('/auth/reset-password', { token, password });
  }
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
    
    return api.post('/messages/attachment', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  
  // Отметить сообщения как прочитанные
  markAsRead: async (requestId) => {
    return api.post(`/messages/${requestId}/read`);
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