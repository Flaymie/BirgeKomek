import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService, usersService, notificationsService, baseURL } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Генерация цвета аватара на основе имени пользователя
  const generateAvatarColor = (username) => {
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 80%)`;
  };

  const fetchUnreadCount = async () => {
    try {
      // На бэке роут GET /unread возвращает массив непрочитанных, поэтому считаем их длину
      const response = await notificationsService.getUnreadCount();
      setUnreadNotifications(response.data.notifications.length);
    } catch (err) {
      console.error('Не удалось загрузить количество уведомлений', err);
    }
  };

  const markNotificationsAsRead = () => {
    setUnreadNotifications(0);
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
        setCurrentUser(response.data);
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
  }, []);
  
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
        setUnreadNotifications(prev => prev + 1);
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
      
      // Получаем данные пользователя
      const userResponse = await usersService.getCurrentUser();
      setCurrentUser(userResponse.data);
      setLoading(false);
      return true;
    } catch (err) {
      console.error('Ошибка входа:', err);
      setError(err.response?.data?.msg || 'Ошибка при входе в систему');
      setLoading(false);
      return false;
    }
  };

  // Функция для регистрации пользователя
  const register = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.register(userData);
      setLoading(false);
      return { success: true, data: response.data };
    } catch (err) {
      console.error('Ошибка регистрации:', err);
      setError(err.response?.data?.msg || 'Ошибка при регистрации');
      setLoading(false);
      return { success: false, error: err.response?.data?.msg || 'Ошибка при регистрации' };
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
      setCurrentUser({...currentUser, ...response.data});
      setLoading(false);
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
    setUnreadNotifications(0); // Сбрасываем счетчик при выходе
  };

  const value = {
    currentUser,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    updatePassword,
    generateAvatarColor,
    unreadNotifications,
    markNotificationsAsRead
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext; 