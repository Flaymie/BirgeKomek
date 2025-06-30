import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { toast } from 'react-toastify';
import { authService, usersService, notificationsService, baseURL, setAuthToken } from '../services/api';
import { formatAvatarUrl } from '../services/avatarUtils';
import BannedUserModal from '../components/modals/BannedUserModal';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isBanned, setIsBanned] = useState(false);
  const [banDetails, setBanDetails] = useState(null);
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

  const _updateCurrentUserState = useCallback((user) => {
    if (user) {
      setCurrentUser(user);
      // Проверяем бан статус при обновлении
      if (user.banDetails && user.banDetails.isBanned) {
        setIsBanned(true);
        setBanDetails(user.banDetails);
      } else {
        setIsBanned(false);
        setBanDetails(null);
      }
    } else {
      setCurrentUser(null);
      setIsBanned(false);
      setBanDetails(null);
    }
  }, []);
  
  const checkUserStatus = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (token) {
      setAuthToken(token);
      try {
        const res = await usersService.getMe();
        _updateCurrentUserState(res.data);
      } catch (error) {
        if (error.response && error.response.status === 403 && error.response.data.banDetails) {
            // Пользователь забанен - не выходим, а показываем модалку
            setIsBanned(true);
            setBanDetails(error.response.data.banDetails);
            setCurrentUser(error.response.data.user); // Сохраняем данные юзера, чтобы показать инфу в модалке
        } else {
            // Другая ошибка - выходим
            logout();
            console.error("Ошибка при проверке статуса, выход из системы", error);
        }
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [_updateCurrentUserState]);

  useEffect(() => {
    checkUserStatus();
  }, [checkUserStatus]);

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
  const login = useCallback(async (email, password) => {
    const res = await authService.login(email, password);
    localStorage.setItem('token', res.data.token);
    setAuthToken(res.data.token);
    await checkUserStatus();
    return res.data.user;
  }, [checkUserStatus]);

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
  const register = useCallback(async (userData) => {
    const res = await authService.register(userData);
    localStorage.setItem('token', res.data.token);
    setAuthToken(res.data.token);
    await checkUserStatus();
  }, [checkUserStatus]);

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
  const updateProfile = useCallback(async (profileData) => {
      const { data } = await usersService.updateMyProfile(profileData);
      _updateCurrentUserState(data);
  }, [_updateCurrentUserState]);

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
  const logout = () => {
    localStorage.removeItem('token');
    setAuthToken(null);
    _updateCurrentUserState(null);
    toast.info("Вы вышли из аккаунта.");
  };

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
    isBanned,
    setIsBanned,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
      <BannedUserModal 
        isOpen={isBanned}
        onClose={() => {
            /* Не даем закрыть модалку просто так */
            /* Закрытие только через выход */
        }}
        banDetails={banDetails}
      />
    </AuthContext.Provider>
  );
};

export default AuthContext; 