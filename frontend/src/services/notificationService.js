import axios from 'axios';

const API_URL = 'http://localhost:5050/api';

// Функция для получения хедера авторизации
export const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  
  if (token) {
    return { 'Authorization': `Bearer ${token}` };
  } else {
    return {};
  }
};

/**
 * Получение списка непрочитанных уведомлений пользователя
 * @returns {Promise<Array>} - Массив уведомлений
 */
export const getUnreadNotifications = async () => {
  try {
    const response = await axios.get(`${API_URL}/notifications/unread`, {
      headers: getAuthHeader()
    });
    
    return response.data;
  } catch (error) {
    console.error('Ошибка получения уведомлений:', error);
    throw error;
  }
};

/**
 * Получение всех уведомлений пользователя
 * @param {number} page - Номер страницы для пагинации
 * @param {number} limit - Количество уведомлений на странице
 * @returns {Promise<Object>} - Объект с уведомлениями и информацией о пагинации
 */
export const getAllNotifications = async (page = 1, limit = 10) => {
  try {
    const response = await axios.get(`${API_URL}/notifications`, {
      headers: getAuthHeader(),
      params: { page, limit }
    });
    
    return response.data;
  } catch (error) {
    console.error('Ошибка получения уведомлений:', error);
    throw error;
  }
};

/**
 * Отметка уведомления как прочитанное
 * @param {string} notificationId - ID уведомления
 * @returns {Promise<Object>} - Обновленное уведомление
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const response = await axios.put(`${API_URL}/notifications/${notificationId}/read`, {}, {
      headers: getAuthHeader()
    });
    
    return response.data;
  } catch (error) {
    console.error(`Ошибка отметки уведомления ${notificationId} как прочитанное:`, error);
    throw error;
  }
};

/**
 * Отметка всех уведомлений как прочитанные
 * @returns {Promise<Object>} - Результат операции
 */
export const markAllNotificationsAsRead = async () => {
  try {
    const response = await axios.put(`${API_URL}/notifications/read-all`, {}, {
      headers: getAuthHeader()
    });
    
    return response.data;
  } catch (error) {
    console.error('Ошибка отметки всех уведомлений как прочитанные:', error);
    throw error;
  }
};

/**
 * Удаление уведомления
 * @param {string} notificationId - ID уведомления
 * @returns {Promise<Object>} - Результат операции
 */
export const deleteNotification = async (notificationId) => {
  try {
    const response = await axios.delete(`${API_URL}/notifications/${notificationId}`, {
      headers: getAuthHeader()
    });
    
    return response.data;
  } catch (error) {
    console.error(`Ошибка удаления уведомления ${notificationId}:`, error);
    throw error;
  }
};

export default {
  getUnreadNotifications,
  getAllNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
}; 