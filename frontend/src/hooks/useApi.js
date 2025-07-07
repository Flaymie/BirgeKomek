import { useState, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { logout } = useAuth();

  const callApi = useCallback(async (url, method = 'GET', body = null) => {
    setLoading(true);
    setError(null);
    try {
      const config = {
        method,
        url,
      };
      if (body) {
        config.data = body;
      }
      const response = await api(config);
      setLoading(false);
      return { data: response.data, status: response.status };
    } catch (err) {
      setLoading(false);
      const errorMessage = err.response?.data?.msg || err.message || 'Произошла ошибка';
      setError({ message: errorMessage, status: err.response?.status });
      
      // Если токен невалиден или истек, разлогиниваем пользователя
      if (err.response?.status === 401) {
        logout();
      }

      console.error(`API Error (${method} ${url}):`, err);
      throw err; // Пробрасываем ошибку дальше, чтобы ее можно было поймать в компоненте
    }
  }, [logout]);

  return { loading, error, callApi };
}; 