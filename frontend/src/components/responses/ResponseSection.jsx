import React, { useState, useEffect } from 'react';
import { responsesService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

const ResponseBadge = ({ status }) => {
  const badgeStyles = {
    pending: 'bg-yellow-100 text-yellow-800',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800'
  };

  const badgeText = {
    pending: 'Ожидание',
    accepted: 'Принят',
    rejected: 'Отклонен'
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${badgeStyles[status]}`}>
      {badgeText[status]}
    </span>
  );
};

const ResponseSection = ({ requestId, requestAuthor, requestStatus }) => {
  const { currentUser } = useAuth();
  const [responses, setResponses] = useState([]);
  const [newResponseMessage, setNewResponseMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchResponses = async () => {
    try {
      const response = await responsesService.getResponsesByRequest(requestId);
      setResponses(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке откликов:', error);
      toast.error('Не удалось загрузить отклики');
    }
  };

  useEffect(() => {
    if (requestId) {
      fetchResponses();
    }
  }, [requestId]);

  const submitResponse = async () => {
    if (!newResponseMessage.trim()) {
      toast.error('Введите сообщение');
      return;
    }

    setIsLoading(true);
    try {
      await responsesService.createResponse(requestId, newResponseMessage);
      toast.success('Отклик отправлен!');
      setNewResponseMessage('');
      fetchResponses();
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Ошибка при отправке отклика');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResponseAction = async (responseId, status) => {
    try {
      await responsesService.updateResponseStatus(responseId, status);
      toast.success(`Отклик ${status === 'accepted' ? 'принят' : 'отклонен'}`);
      fetchResponses();
    } catch (error) {
      toast.error('Не удалось обновить статус отклика');
    }
  };

  // Проверяем, может ли текущий пользователь откликнуться или управлять откликами
  const canRespond = currentUser?.roles?.helper && requestStatus === 'open';
  const canManageResponses = currentUser?._id === requestAuthor;

  return (
    <div className="mt-8 bg-white rounded-lg shadow-soft border border-gray-100">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">
          {responses.length > 0 ? `Отклики (${responses.length})` : 'Отклики'}
        </h2>
      </div>

      {/* Форма для отправки отклика */}
      {canRespond && (
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex space-x-4">
            <textarea
              value={newResponseMessage}
              onChange={(e) => setNewResponseMessage(e.target.value)}
              placeholder="Опишите, как вы можете помочь..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows="3"
              maxLength={500}
            />
            <button
              onClick={submitResponse}
              disabled={isLoading || !newResponseMessage.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Отправка...' : 'Откликнуться'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Осталось символов: {500 - newResponseMessage.length}
          </p>
        </div>
      )}

      {/* Список откликов */}
      <div className="divide-y divide-gray-200">
        {responses.length === 0 ? (
          <div className="px-6 py-4 text-center text-gray-500">
            Пока нет откликов
          </div>
        ) : (
          responses.map(response => (
            <div key={response._id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  <img 
                    src={response.helper.avatar || '/default-avatar.png'} 
                    alt={response.helper.username} 
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-medium text-gray-900">
                      {response.helper.username}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {response.message}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <ResponseBadge status={response.status} />
                  {canManageResponses && response.status === 'pending' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleResponseAction(response._id, 'accepted')}
                        className="text-green-600 hover:text-green-800 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleResponseAction(response._id, 'rejected')}
                        className="text-red-600 hover:text-red-800 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const ResponseModal = ({ isOpen, onClose, requestId, onSubmit }) => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Если модалка не открыта, возвращаем null
  if (!isOpen) {
    console.error('МОДАЛКА НЕ ОТКРЫТА');
    return null;
  }

  console.error('МОДАЛКА ТОЧНО РЕНДЕРИТСЯ');

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error('Напиши, как поможешь, бля');
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit(message);
      setMessage('');
      onClose();
    } catch (error) {
      toast.error('Не вышло отправить отклик, чё-то пошло не так');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold mb-4">Предложить помощь</h2>
        <textarea 
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Расскажи, как именно поможешь..."
          className="w-full h-32 p-2 border rounded-md mb-4"
          maxLength={500}
        />
        <div className="flex justify-end space-x-2">
          <button 
            onClick={onClose} 
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md"
          >
            Отмена
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {isLoading ? 'Отправляем...' : 'Отправить'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResponseSection;