import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { requestsService } from '../../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { SUBJECTS, URGENCY_LEVELS } from '../../services/constants';

// Максимальное количество символов
const MAX_TITLE_LENGTH = 100;
const MIN_TITLE_LENGTH = 5;
const MAX_DESCRIPTION_LENGTH = 2000;
const MIN_DESCRIPTION_LENGTH = 20;

const EditRequestPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  // Получаем данные из state навигации
  const { editReason, fromAdmin } = location.state || {};

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    grade: '',
    urgency: URGENCY_LEVELS.NORMAL
  });
  
  const [errors, setErrors] = useState({});
  
  const fetchRequestData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await requestsService.getRequestById(id);
      const requestData = response.data;
      
      const formattedDescription = requestData.description
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
      
      setFormData({
        title: requestData.title || '',
        description: formattedDescription || '',
        subject: requestData.subject || '',
        grade: requestData.grade || '',
        urgency: requestData.urgency || URGENCY_LEVELS.NORMAL
      });
      
      setError(null);
    } catch (err) {
      console.error('Ошибка при получении данных для редактирования:', err);
      
      if (err.response) {
        switch (err.response.status) {
          case 401:
            navigate('/login', { state: { message: 'Сессия истекла, пожалуйста, авторизуйтесь снова' } });
            return;
          case 403:
            setError('У вас нет прав на редактирование этого запроса.');
            break;
          case 404:
            setError('Запрос, который вы пытаетесь отредактировать, не найден.');
            break;
          default:
            setError(err.response?.data?.msg || 'Произошла ошибка при загрузке данных.');
        }
      } else {
        setError('Не удалось подключиться к серверу. Попробуйте позже.');
      }
    } finally {
        setLoading(false);
    }
  }, [id, navigate]);
  
  useEffect(() => {
    // Если пользователь еще не загружен, не делаем запрос
    if (!currentUser) {
      return;
    }
    
    fetchRequestData();
  }, [currentUser, fetchRequestData]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    // Ограничиваем длину
    if (name === 'title' && value.length > MAX_TITLE_LENGTH) {
      return;
    }
    if (name === 'description' && value.length > MAX_DESCRIPTION_LENGTH) {
      return;
    }
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim() || formData.title.length < MIN_TITLE_LENGTH) {
      newErrors.title = `Заголовок должен содержать минимум ${MIN_TITLE_LENGTH} символов`;
    } else if (formData.title.length > MAX_TITLE_LENGTH) {
      newErrors.title = `Заголовок не должен превышать ${MAX_TITLE_LENGTH} символов`;
    }
    
    if (!formData.description.trim() || formData.description.length < MIN_DESCRIPTION_LENGTH) {
        newErrors.description = `Описание должно содержать минимум ${MIN_DESCRIPTION_LENGTH} символов`;
    }

    if (!formData.subject) {
      newErrors.subject = 'Выберите предмет';
    }
    if (!formData.grade) {
      newErrors.grade = 'Укажите класс';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Создаем копию данных формы для отправки
      const requestData = { ...formData };

      // Если редактирует админ, добавляем причину
      if (fromAdmin && editReason) {
        requestData.editReason = editReason;
      }
      
      await requestsService.updateRequest(id, requestData);
      
      toast.success('Запрос успешно обновлен!');
      // Перенаправляем на страницу с деталями запроса
      navigate(`/request/${id}`, { state: { from: '/my-requests' } });
    } catch (error) {
      console.error('Ошибка при обновлении запроса:', error);
      const errorMessage = error.response?.data?.message || 'Произошла ошибка при обновлении запроса';
      toast.error(errorMessage);
      setIsSubmitting(false);
    }
  };
  
  // Вычисляем количество оставшихся символов
  const titleRemainingChars = MAX_TITLE_LENGTH - (formData.title?.length || 0);
  const descriptionRemainingChars = MAX_DESCRIPTION_LENGTH - (formData.description?.length || 0);
  
  // Определяем стиль счетчика символов
  const titleCharCounterClass = titleRemainingChars < 0 ? 'text-red-500' : 'text-gray-500';
  const descriptionCharCounterClass = descriptionRemainingChars < 0 ? 'text-red-500' : 'text-gray-500';
  
  if (loading || !currentUser) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Ошибка доступа</h2>
          <p className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-6">
            {error}
          </p>
          <Link 
            to="/"
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors"
          >
            Вернуться на главную
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      {fromAdmin && editReason && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md p-4">
          <p><span className="font-semibold">Режим редактирования модератором.</span></p>
          <p>Причина: <strong>{editReason}</strong>. Эта причина будет отправлена автору.</p>
        </div>
      )}
      <div className="mb-6">
        <Link 
          to={`/request/${id}`}
          className="text-blue-600 hover:text-blue-800 flex items-center"
          state={{ from: '/my-requests' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Назад к запросу
        </Link>
      </div>
      
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-900">Редактирование запроса</h1>
        </div>
        
        <div className="px-6 py-4">
          <form onSubmit={handleSubmit}>
            {/* Заголовок запроса */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">Заголовок</label>
                <span className={`text-sm font-medium ${titleCharCounterClass}`}>{formData.title?.length || 0}/{MAX_TITLE_LENGTH}</span>
              </div>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                maxLength={MAX_TITLE_LENGTH}
                className={`w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${errors.title ? 'border-red-500' : ''}`}
                placeholder="Например: Помощь с домашним заданием по алгебре"
              />
              {errors.title && <p className="mt-2 text-sm text-red-600">{errors.title}</p>}
            </div>
            
            {/* Описание */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Подробное описание</label>
                <span className={`text-sm font-medium ${descriptionCharCounterClass}`}>{formData.description?.length || 0}/{MAX_DESCRIPTION_LENGTH}</span>
              </div>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="6"
                maxLength={MAX_DESCRIPTION_LENGTH}
                className={`w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${errors.description ? 'border-red-500' : ''}`}
                placeholder="Опишите вашу проблему как можно подробнее..."
              ></textarea>
              {errors.description && <p className="mt-2 text-sm text-red-600">{errors.description}</p>}
            </div>
            
            {/* Предмет и класс */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                  Предмет*
                </label>
                <select
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-sm border ${errors.subject ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                >
                  <option value="">Выберите предмет</option>
                  {SUBJECTS.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
                {errors.subject && (
                  <p className="mt-1 text-xs text-red-600">{errors.subject}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-2">
                  Класс*
                </label>
                <select
                  id="grade"
                  name="grade"
                  value={formData.grade}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-sm border ${errors.grade ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                >
                  <option value="">Выберите класс</option>
                  {[...Array(11)].map((_, i) => (
                    <option key={i+1} value={i+1}>{i+1} класс</option>
                  ))}
                </select>
                {errors.grade && (
                  <p className="mt-1 text-xs text-red-600">{errors.grade}</p>
                )}
              </div>
            </div>
            
            {/* Кнопки действий */}
            <div className="flex justify-end space-x-3">
              <Link
                to={`/request/${id}`}
                state={{ from: '/my-requests' }}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 border border-gray-300 rounded-md font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Отмена
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm border border-transparent rounded-md shadow-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Сохранение...
                  </span>
                ) : 'Сохранить изменения'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditRequestPage; 