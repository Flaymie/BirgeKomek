import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { createRequest } from '../../services/requestsService';

const CreateRequestPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    grade: currentUser?.grade || '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    // Сбрасываем ошибку при изменении поля
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null,
      });
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Заголовок не может быть пустым';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Заголовок не должен превышать 100 символов';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Описание не может быть пустым';
    } else if (formData.description.length > 2000) {
      newErrors.description = 'Описание не должно превышать 2000 символов';
    }
    
    if (!formData.subject) {
      newErrors.subject = 'Необходимо выбрать предмет';
    }
    
    if (!formData.grade) {
      newErrors.grade = 'Необходимо указать класс';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Пожалуйста, исправьте ошибки в форме');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await createRequest(formData);
      toast.success('Запрос успешно создан!');
      // Перенаправляем на страницу свежесозданного запроса
      navigate(`/request/${response.request._id}`);
    } catch (error) {
      console.error('Ошибка при создании запроса:', error);
      toast.error(error.response?.data?.message || 'Не удалось создать запрос');
      setIsLoading(false);
    }
  };

  const subjectOptions = [
    'Математика', 'Алгебра', 'Геометрия', 'Физика', 'Химия', 'Биология', 
    'Информатика', 'История', 'География', 'Русский язык', 'Литература',
    'Английский язык', 'Казахский язык', 'Другое'
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Создание нового запроса</h1>
        
        <form onSubmit={handleSubmit} noValidate>
          {/* Заголовок */}
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Заголовок
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={`form-input ${errors.title ? 'form-input-error' : ''}`}
              placeholder="Кратко опишите проблему, например, 'Помогите с задачей по физике'"
              required
            />
            {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title}</p>}
          </div>
          
          {/* Описание */}
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Подробное описание
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="6"
              className={`form-textarea ${errors.description ? 'form-input-error' : ''}`}
              placeholder="Опишите вашу проблему как можно подробнее. Приложите текст задачи, ваши попытки решения и укажите, что именно вызывает трудности."
              required
            ></textarea>
            {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description}</p>}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Предмет */}
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                Предмет
              </label>
              <select
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                className={`form-select ${errors.subject ? 'form-input-error' : ''}`}
                required
              >
                <option value="" disabled>Выберите предмет</option>
                {subjectOptions.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
              {errors.subject && <p className="text-sm text-red-600 mt-1">{errors.subject}</p>}
            </div>
            
            {/* Класс */}
            <div>
              <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-1">
                Класс
              </label>
              <select
                id="grade"
                name="grade"
                value={formData.grade}
                onChange={handleInputChange}
                className={`form-select ${errors.grade ? 'form-input-error' : ''}`}
                required
              >
                <option value="" disabled>Выберите ваш класс</option>
                {[...Array(11)].map((_, i) => (
                  <option key={i+1} value={i+1}>{i+1} класс</option>
                ))}
              </select>
              {errors.grade && <p className="text-sm text-red-600 mt-1">{errors.grade}</p>}
            </div>
          </div>
          
          {/* Кнопка отправки */}
          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Отправка...
                </>
              ) : (
                'Создать запрос'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRequestPage; 