import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService, usersService } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Генерация цвета аватара на основе имени пользователя
  const generateAvatarColor = (username) => {
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 80%)`;
  };

  // Загрузка данных пользователя при инициализации
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

  // Функция для выхода пользователя
  const logout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    loading,
    error,
    login,
    register,
    logout,
    generateAvatarColor
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext; 