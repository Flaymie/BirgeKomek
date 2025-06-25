import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { toast } from 'react-toastify';
import { authService, usersService, notificationsService, baseURL } from '../services/api';
import { formatAvatarUrl } from '../services/avatarUtils';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState('');

  // Сохраняем ссылку на методы в глобальной переменной для доступа из api.js
  useEffect(() => {
    window.authContext = {
      setIsBanned,
      setBanReason,
      logout
    };
    
    return () => {
      delete window.authContext;
    };
  }, []);

  // Генерация цвета аватара на основе имени пользователя
  const generateAvatarColor = (username) => {
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 80%)`;
  };

  const fetchUnreadCount = useCallback(async () => {
    try {
      // Бэкенд теперь отдает count в отдельном поле, используем его
      const response = await notificationsService.getNotifications({ limit: 1 }); // limit: 1 для экономии
      setUnreadCount(response.data.unreadCount || 0);
    } catch (err) {
      console.error('Не удалось загрузить количество уведомлений', err);
    }
  }, []);

  const markNotificationsAsRead = () => {
    setUnreadCount(0);
  };

  // Обработка данных пользователя перед установкой в стейт
  const processUserData = (userData) => {
    if (!userData) return null;
    return {
      ...userData,
      formattedAvatar: formatAvatarUrl(userData),
    };
  };

  // Загрузка данных пользователя
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await usersService.getCurrentUser();
        setCurrentUser(processUserData(response.data));
        await fetchUnreadCount(); // Загружаем счетчик после загрузки юзера
      } catch (err) {
        console.error('Ошибка при загрузке пользователя:', err);
        // Если токен недействителен, удаляем его
        if (err.response && err.response.status === 401) {
          localStorage.removeItem('token');
        }
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [fetchUnreadCount]);
  
  // Управление SSE-соединением для real-time уведомлений
  useEffect(() => {
    let eventSource;
    if (currentUser) {
      const token = localStorage.getItem('token');
      // Прямое использование EventSource, так как axios не подходит для SSE
      eventSource = new EventSource(`${baseURL}/notifications/subscribe?token=${token}`);

      eventSource.onopen = () => {
        console.log('SSE-соединение установлено.');
      };

      eventSource.addEventListener('new_notification', (event) => {
        // const notification = JSON.parse(event.data);
        // Просто инкрементируем счетчик, когда приходит новое уведомление
        setUnreadCount(prev => prev + 1);
        
        // Можно добавить всплывашку тут
        const notification = JSON.parse(event.data);
        if (notification.title) {
          toast.info(notification.title);
        }
      });

      eventSource.onerror = (err) => {
        console.error('Ошибка SSE-соединения:', err);
        eventSource.close();
      };
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [currentUser]);

  // Функция для входа пользователя
  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.login(credentials);
      localStorage.setItem('token', response.data.token);
      
      const userResponse = await usersService.getCurrentUser();
      setCurrentUser(processUserData(userResponse.data));
      setLoading(false);
      toast.success('Вход выполнен успешно!');
      return { success: true };
    } catch (err) {
      console.error('Ошибка входа:', err);

      let errorMessage;
      if (err.response && err.response.status === 429) {
        errorMessage = 'Слишком много попыток входа. Попробуйте снова через час.';
      } else if (err.response && err.response.status === 403) {
        errorMessage = err.response?.data?.msg || 'Доступ запрещен. Ваш аккаунт может быть заблокирован.';
      } else {
        errorMessage = err.response?.data?.msg || 'Неверный email или пароль';
      }

      setError(errorMessage);
      toast.error(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  };

  // Функция для входа через Telegram/другой сервис с готовым токеном
  const loginWithToken = (token, user) => {
    localStorage.setItem('token', token);
    setCurrentUser(processUserData(user));
    fetchUnreadCount();
    toast.success(`Добро пожаловать, ${user.username}!`);
  };

  // Функция для регистрации пользователя
  const register = async (userData) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('AuthContext: Начинаем регистрацию, данные:', JSON.stringify(userData));
      
      // Проверяем, есть ли данные аватара в userData и подготавливаем их к отправке
      let processedUserData = { ...userData };
      
      if (userData.avatar) {
        if (userData.avatar.startsWith('data:image')) {
          console.log('AuthContext: В данных присутствует аватар в формате base64');
          // Если аватар в base64, не нужно его загружать отдельно - просто отправляем
          // Бэкенд должен распознать, что это base64, и обработать соответственно
        } else {
          console.log('AuthContext: В данных присутствует аватар в формате URL:', userData.avatar.substring(0, 100) + '...');
        }
      } else {
        console.log('AuthContext: Аватар не предоставлен в данных регистрации');
      }
      
      const response = await authService.register(processedUserData);
      console.log('AuthContext: Ответ сервера о регистрации:', response);
      
      if (response && response.data) {
        console.log('AuthContext: Регистрация успешна, данные ответа:', response.data);
        
        // Проверяем, содержит ли ответ токен, который нужно сохранить
        if (response.data.token) {
          console.log('AuthContext: Токен получен, сохраняем в localStorage');
          localStorage.setItem('token', response.data.token);
        }
        
        // Устанавливаем пользователя в стейт, если в ответе есть данные пользователя
        if (response.data.user) {
          console.log('AuthContext: Устанавливаем данные пользователя в стейт');
          setCurrentUser(processUserData(response.data.user));
          await fetchUnreadCount();
        }
        
      setLoading(false);
        toast.success('Регистрация прошла успешно!');
      return { success: true, data: response.data };
      } else {
        console.error('AuthContext: Неожиданный формат ответа:', response);
        setLoading(false);
        throw new Error('Неожиданный формат ответа от сервера');
      }
    } catch (error) {
      console.error('AuthContext: Ошибка при регистрации:', error);
      
      // Расширенное логирование информации об ошибке
      if (error.response) {
        console.error('AuthContext: Данные ошибки:', error.response.data);
        console.error('AuthContext: Статус ошибки:', error.response.status);
        console.error('AuthContext: Заголовки ответа:', error.response.headers);
        
        // Полезно для отладки - сериализуем полностью ответ об ошибке
        try {
          console.error('AuthContext: Полный объект ответа:', JSON.stringify(error.response));
        } catch (e) {
          console.error('AuthContext: Не удалось сериализовать объект ответа');
        }
      }
      
      const errorMessage = error.response?.data?.msg || error.message || 'Ошибка регистрации';
      setError(errorMessage);
      toast.error(errorMessage);
      setLoading(false);
      
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  };

  // Функция для обновления аватара пользователя
  const updateAvatar = (avatarUrl) => {
    if (currentUser) {
      const updatedUser = { 
        ...currentUser, 
        avatar: avatarUrl,
        formattedAvatar: formatAvatarUrl(avatarUrl, currentUser.username)
      };
      setCurrentUser(processUserData(updatedUser));
    }
  };

  // Функция для обновления профиля пользователя
  const updateProfile = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      console.log('Отправка данных на сервер:', JSON.stringify(userData));
      const response = await usersService.updateProfile(userData);
      console.log('Ответ сервера:', response);
      
      const updatedUserData = processUserData({...currentUser, ...response.data});
      setCurrentUser(updatedUserData);
      
      setLoading(false);
      toast.success('Профиль успешно обновлен!');
      return { success: true, data: response.data };
    } catch (err) {
      console.error('Ошибка обновления профиля:', err);
      console.error('Детали ошибки:', JSON.stringify(err.response?.data || {}));
      
      // Более детальная обработка ошибок
      let errorMessage = 'Ошибка при обновлении профиля';
      if (err.response) {
        if (err.response.data.errors && err.response.data.errors.length > 0) {
          errorMessage = err.response.data.errors.map(e => e.msg).join(', ');
        } else if (err.response.data.msg) {
          errorMessage = err.response.data.msg;
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  };

  // Функция для обновления пароля пользователя
  const updatePassword = async (currentPassword, newPassword) => {
    setLoading(true);
    setError(null);
    try {
      const response = await usersService.updatePassword(currentPassword, newPassword);
      setLoading(false);
      return { success: true, data: response.data };
    } catch (err) {
      console.error('Ошибка обновления пароля:', err);
      setError(err.response?.data?.msg || 'Ошибка при обновлении пароля');
      setLoading(false);
      return { success: false, error: err.response?.data?.msg || 'Ошибка при обновлении пароля' };
    }
  };

  // Функция для выхода пользователя
  const logout = () => {
    authService.logout();
    setCurrentUser(null);
    setUnreadCount(0); // Сбрасываем счетчик при выходе
    setIsBanned(false); // Сбрасываем статус бана при выходе
    setBanReason('');
  };

  const value = {
    currentUser,
    loading,
    error,
    unreadCount,
    isBanned,
    banReason,
    setUnreadCount,
    setIsBanned,
    setBanReason,
    login,
    logout,
    register,
    updateProfile,
    updatePassword,
    updateAvatar,
    generateAvatarColor,
    markNotificationsAsRead,
    loginWithToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext; 