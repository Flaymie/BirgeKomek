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
  const [banDetails, setBanDetails] = useState({ isBanned: false, reason: '', expiresAt: null });
  const [isReadOnly, setIsReadOnly] = useState(true);

  const processAndCheckBan = (userData) => {
    if (userData?.banDetails?.isBanned) {
      setBanDetails({
        isBanned: true,
        reason: userData.banDetails.reason,
        expiresAt: userData.banDetails.expiresAt,
      });
    } else {
      setBanDetails({ isBanned: false, reason: '', expiresAt: null });
    }
    setCurrentUser(processUserData(userData));
  };

  // Сохраняем ссылку на методы в глобальной переменной для доступа из api.js
  useEffect(() => {
    window.authContext = {
      handleBan: (details) => {
        setBanDetails({
          isBanned: true,
          reason: details.reason || 'Причина не указана',
          expiresAt: details.expiresAt || null,
        });
      },
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
      const response = await notificationsService.getNotifications({ limit: 1 });
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
        processAndCheckBan(response.data);
        await fetchUnreadCount();
        setIsReadOnly(!response.data.telegramId);
      } catch (err) {
        console.error('Ошибка при загрузке пользователя:', err);
        // Если токен недействителен, удаляем его
        if (err.response && err.response.status === 401) {
          localStorage.removeItem('token');
        }
        setError(err.message);
        setIsReadOnly(true);
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
      const { data } = await authService.login(credentials);
      localStorage.setItem('token', data.token);
      
      // Данные о бане и пользователе приходят в одном ответе
      if (data.banDetails?.isBanned) {
        setBanDetails({
          isBanned: true,
          reason: data.banDetails.reason || 'Причина не указана.',
          expiresAt: data.banDetails.expiresAt,
        });
      } else {
        setBanDetails({ isBanned: false, reason: '', expiresAt: null });
      }

      setCurrentUser(processUserData(data.user));
      await fetchUnreadCount(); // Загружаем уведомления после успешного входа
      setIsReadOnly(!data.user.telegramId);
      
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
      setIsReadOnly(true);
      return { success: false, error: errorMessage };
    }
  };

  // Вход с использованием токена (например, после Telegram)
  const loginWithToken = (token, user) => {
    setLoading(true);
    try {
      localStorage.setItem('token', token);
      processAndCheckBan(user);
      fetchUnreadCount();
      toast.success(`Добро пожаловать, ${user.username}!`);
      // Прямой редирект на страницу запросов
      // Этот код будет выполнен в браузере, поэтому window.location.href - это то, что нужно
      window.location.href = '/requests';
    } catch (error) {
      console.error('Ошибка при обработке токена:', error);
      setError('Ошибка при обработке токена');
      toast.error('Ошибка при обработке токена');
    } finally {
      setLoading(false);
    }
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
          processAndCheckBan(response.data.user);
          await fetchUnreadCount();
          setIsReadOnly(!response.data.user.telegramId);
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
      setIsReadOnly(true);
      
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
      setIsReadOnly(!updatedUserData.telegramId);
      
      setLoading(false);
      toast.success('Профиль успешно обновлен!');
      return { success: true, user: response.data };
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
      setIsReadOnly(true);
      return { success: false, error: errorMessage };
    }
  };

  const _updateCurrentUserState = (newUserData) => {
    if (!newUserData) return;
    setCurrentUser(processUserData(newUserData));
    setIsReadOnly(!newUserData.telegramId);
  };

  // Функция для обновления пароля пользователя
  const updatePassword = async (currentPassword, newPassword) => {
    setLoading(true);
    setError(null);
    try {
      const response = await usersService.updatePassword(currentPassword, newPassword);
      setLoading(false);
      setIsReadOnly(!response.data.telegramId);
      return { success: true, data: response.data };
    } catch (err) {
      console.error('Ошибка обновления пароля:', err);
      setError(err.response?.data?.msg || 'Ошибка при обновлении пароля');
      setLoading(false);
      setIsReadOnly(true);
      return { success: false, error: err.response?.data?.msg || 'Ошибка при обновлении пароля' };
    }
  };

  // Функция для выхода пользователя
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    setUnreadCount(0);
    setBanDetails({ isBanned: false, reason: '', expiresAt: null });
    setIsReadOnly(true);
  }, []);

  const value = {
    currentUser,
    loading,
    error,
    unreadCount,
    banDetails,
    setUnreadCount,
    setBanDetails,
    login,
    logout,
    register,
    updateProfile,
    _updateCurrentUserState,
    updatePassword,
    updateAvatar,
    generateAvatarColor,
    markNotificationsAsRead,
    loginWithToken,
    fetchUnreadCount,
    isReadOnly,
    updateUser: _updateCurrentUserState,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext; 