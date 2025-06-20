import React, { useState } from 'react';
import { responsesService } from '../services/api';
import { toast } from 'react-toastify';

const ResponseModal = ({ isOpen, onClose, requestId }) => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Если модальное окно не открыто, не рендерим его
  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim()) {
      toast.error('Пожалуйста, введите текст отклика');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Отправляем отклик с данными:', { requestId, message });
      
      await responsesService.createResponse({
        requestId,
        message
      });
      
      toast.success('Ваш отклик успешно отправлен!');
      setMessage('');
      onClose();
    } catch (err) {
      console.error('Ошибка при отправке отклика:', err);
      
      // Выводим подробную информацию об ошибке для отладки
      if (err.response) {
        console.error('Данные ответа:', err.response.data);
        console.error('Статус ответа:', err.response.status);
        console.error('Заголовки ответа:', err.response.headers);
      }
      
      // Получаем более детальную информацию об ошибке
      let errorMessage = 'Произошла ошибка при отправке отклика';
      
      if (err.response) {
        // Если сервер вернул ответ с ошибкой
        if (err.response.data && err.response.data.msg) {
          errorMessage = err.response.data.msg;
        } else if (err.response.data && err.response.data.errors) {
          errorMessage = err.response.data.errors.map(e => e.msg).join(', ');
        } else {
          errorMessage = `Ошибка ${err.response.status}: ${err.response.statusText}`;
        }
        
        // Если ошибка связана с авторизацией
        if (err.response.status === 401) {
          errorMessage = 'Необходимо авторизоваться для отправки отклика';
        }
      } else if (err.request) {
        // Если запрос был сделан, но ответ не получен
        errorMessage = 'Сервер не отвечает, проверьте соединение';
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Предложить помощь</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-3 mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
              Опишите, как вы можете помочь
            </label>
            <textarea
              id="message"
              name="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Напишите, как вы планируете помочь решить задачу..."
            />
            <p className="mt-1 text-xs text-gray-500">
              Будьте конкретны и укажите ваш опыт в этой теме. Хороший отклик повышает шансы быть выбранным.
            </p>
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  <span>Отправка...</span>
                </div>
              ) : (
                'Отправить'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResponseModal; 