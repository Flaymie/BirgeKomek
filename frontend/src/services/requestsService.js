import axios from 'axios';
import { getAuthHeader } from './notificationService'; // Используем getAuthHeader из соседнего сервиса

const API_URL = 'http://localhost:5050/api/requests';

/**
 * Создает новый запрос на помощь
 * @param {object} requestData - Данные запроса (title, description, subject, grade)
 * @returns {Promise<object>} - Ответ от сервера с созданным запросом
 */
export const createRequest = async (requestData) => {
  try {
    const response = await axios.post(API_URL, requestData, {
      headers: getAuthHeader(),
    });
    return response.data;
  } catch (error) {
    console.error('Ошибка при создании запроса:', error.response?.data || error.message);
    // Прокидываем ошибку дальше, чтобы ее можно было обработать в компоненте
    throw error;
  }
};

// Можно добавить и другие функции для работы с запросами
// export const getRequests = async (params) => { ... };
// export const getRequestById = async (id) => { ... };

export default {
  createRequest,
}; 