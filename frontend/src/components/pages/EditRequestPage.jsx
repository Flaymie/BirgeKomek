import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { requestsService } from '../../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { SUBJECTS, URGENCY_LEVELS } from '../../services/constants';

// Максимальное количество символов в описании
const MAX_DESCRIPTION_LENGTH = 2000;

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
      
      const isAuthor = currentUser && currentUser._id === requestData.author._id;
      const isAdminOrMod = currentUser && (currentUser.roles.admin || currentUser.roles.moderator);

      // Права на редактирование: либо автор, либо админ/модер, пришедший с модального окна
      if (!isAuthor && !(isAdminOrMod && fromAdmin)) {
        setError('У вас нет прав на редактирование этого запроса');
        setLoading(false);
        return;
      }
      
      // Преобразуем специальные символы обратно для отображения
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
      
      setLoading(false);
    } catch (err) {
      console.error('Ошибка при получении данных запроса:', err);
      
      // Если ошибка 401 (Unauthorized), перенаправляем на логин
      if (err.response && err.response.status === 401) {
        localStorage.removeItem('token'); // Удаляем невалидный токен
        navigate('/login', { state: { message: 'Сессия истекла, пожалуйста, авторизуйтесь снова' } });
        return;
      }
      
      // Если запрос не найден
      if (err.response && err.response.status === 404) {
        setError('Запрос не найден');
        setLoading(false);
        return;
      }
      
      setError(err.response?.data?.msg || 'Произошла ошибка при загрузке данных запроса');
      setLoading(false);
    }
  }, [id, navigate, currentUser, fromAdmin]);
  
  useEffect(() => {
    // Проверяем наличие токена при загрузке компонента
    const token = localStorage.getItem('token');
    if (!token) {
      // Если токена нет, перенаправляем на страницу логина
      navigate('/login', { state: { message: 'Для редактирования запроса необходимо авторизоваться' } });
      return;
    }
    
    // Если пользователь еще не загружен, не делаем запрос
    if (!currentUser) {
      return;
    }
    
    fetchRequestData();
  }, [id, navigate, currentUser, fetchRequestData]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Ограничиваем длину описания
    if (name === 'description' && value.length > MAX_DESCRIPTION_LENGTH) {
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Очищаем ошибку поля при изменении
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Введите заголовок запроса';
    } else if (formData.title.length < 5) {
      newErrors.title = 'Заголовок должен содержать минимум 5 символов';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Введите описание запроса';
    } else if (formData.description.length < 20) {
      newErrors.description = 'Описание должно содержать минимум 20 символов';
    } else if (formData.description.length > MAX_DESCRIPTION_LENGTH) {
      newErrors.description = `Описание не должно превышать ${MAX_DESCRIPTION_LENGTH} символов`;
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
  
  // Вычисляем количество оставшихся символов в описании
  const remainingChars = MAX_DESCRIPTION_LENGTH - formData.description.length;
  // Определяем стиль счетчика символов (меняем на предупреждающий цвет, когда остается мало)
  const charCounterClass = remainingChars <= 100 ? 'text-orange-500' : 'text-gray-500';
  
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
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-6">
          {error}
        </div>
        <div className="text-center mt-4">
          <Link 
            to="/my-requests"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Вернуться к моим запросам
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
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Заголовок запроса*
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={`w-full px-3 py-2 text-sm border ${errors.title ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                placeholder="Например: Помощь с решением уравнений"
              />
              {errors.title && (
                <p className="mt-1 text-xs text-red-600">{errors.title}</p>
              )}
            </div>
            
            {/* Описание */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Описание запроса*
                </label>
                {remainingChars <= 100 && (
                  <span className={`text-xs ${charCounterClass}`}>
                    {formData.description.length}/{MAX_DESCRIPTION_LENGTH}
                  </span>
                )}
              </div>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="6"
                maxLength={MAX_DESCRIPTION_LENGTH}
                className={`w-full px-3 py-2 text-sm border ${errors.description ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                placeholder="Опишите, с чем вам нужна помощь..."
              ></textarea>
              {errors.description && (
                <p className="mt-1 text-xs text-red-600">{errors.description}</p>
              )}
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