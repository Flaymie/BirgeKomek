import React, { useState, useEffect } from 'react';
import { requestsService } from '../../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

const CreateRequestModal = ({ isOpen, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    grade: currentUser?.grade || '',
    deadline: '',
    urgency: 'normal'
  });
  
  const [errors, setErrors] = useState({});
  
  // Сбрасываем форму при открытии/закрытии модального окна
  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: '',
        description: '',
        subject: '',
        grade: currentUser?.grade || '',
        deadline: '',
        urgency: 'normal'
      });
      setErrors({});
    }
  }, [isOpen, currentUser]);
  
  // Если модальное окно закрыто, не рендерим его содержимое
  if (!isOpen) return null;
  
  const handleChange = (e) => {
    const { name, value } = e.target;
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
      const response = await requestsService.createRequest(formData);
      
      toast.success('Запрос на помощь успешно создан!');
      onSuccess(response.data);
      onClose();
    } catch (error) {
      console.error('Ошибка при создании запроса:', error);
      const errorMessage = error.response?.data?.message || 'Произошла ошибка при создании запроса';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Предметы для выбора
  const subjects = [
    'Математика',
    'Физика',
    'Химия',
    'Биология',
    'История',
    'География',
    'Литература',
    'Русский язык',
    'Казахский язык',
    'Английский язык',
    'Информатика',
    'Другое'
  ];
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Затемнение фона */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
        onClick={onClose}
      ></div>
      
      {/* Модальное окно */}
      <div className="flex items-center justify-center min-h-screen py-10 px-4">
        <div 
          className="relative bg-white rounded-lg shadow-xl max-w-sm w-full mx-auto max-h-[80vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Заголовок */}
          <div className="px-3 py-2 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-base font-medium text-gray-900">Создание запроса</h3>
            <button 
              type="button"
              className="text-gray-400 hover:text-gray-500"
              onClick={onClose}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Форма с прокруткой */}
          <div className="overflow-y-auto px-3 py-2">
            <form>
              {/* Заголовок запроса */}
              <div className="mb-2">
                <label htmlFor="title" className="block text-xs font-medium text-gray-700 mb-1">
                  Заголовок запроса*
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className={`w-full px-2 py-1 text-sm border ${errors.title ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                  placeholder="Например: Помощь с решением уравнений"
                />
                {errors.title && (
                  <p className="mt-1 text-xs text-red-600">{errors.title}</p>
                )}
              </div>
              
              {/* Описание */}
              <div className="mb-2">
                <label htmlFor="description" className="block text-xs font-medium text-gray-700 mb-1">
                  Описание запроса*
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="2"
                  className={`w-full px-2 py-1 text-sm border ${errors.description ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                  placeholder="Опишите, с чем вам нужна помощь..."
                ></textarea>
                {errors.description && (
                  <p className="mt-1 text-xs text-red-600">{errors.description}</p>
                )}
              </div>
              
              {/* Предмет и класс */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                <div>
                  <label htmlFor="subject" className="block text-xs font-medium text-gray-700 mb-1">
                    Предмет*
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className={`w-full px-2 py-1 text-sm border ${errors.subject ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                  >
                    <option value="">Выберите предмет</option>
                    {subjects.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                  {errors.subject && (
                    <p className="mt-1 text-xs text-red-600">{errors.subject}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="grade" className="block text-xs font-medium text-gray-700 mb-1">
                    Класс*
                  </label>
                  <select
                    id="grade"
                    name="grade"
                    value={formData.grade}
                    onChange={handleChange}
                    className={`w-full px-2 py-1 text-sm border ${errors.grade ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
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
              
              {/* Срок и срочность */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                <div>
                  <label htmlFor="deadline" className="block text-xs font-medium text-gray-700 mb-1">
                    Срок выполнения
                  </label>
                  <input
                    type="date"
                    id="deadline"
                    name="deadline"
                    value={formData.deadline}
                    onChange={handleChange}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="urgency" className="block text-xs font-medium text-gray-700 mb-1">
                    Срочность
                  </label>
                  <select
                    id="urgency"
                    name="urgency"
                    value={formData.urgency}
                    onChange={handleChange}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="low">Низкая</option>
                    <option value="normal">Средняя</option>
                    <option value="high">Высокая</option>
                  </select>
                </div>
              </div>
            </form>
          </div>
          
          {/* Кнопки действий (фиксированные внизу) */}
          <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-2 py-1 text-xs border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              Отмена
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-2 py-1 text-xs border border-transparent rounded-md shadow-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Создание...
                </span>
              ) : 'Создать запрос'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateRequestModal; 