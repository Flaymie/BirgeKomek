import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { requestsService } from '../../services/api';

const ChatPage = () => {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRequestDetails = async () => {
      setLoading(true);
      try {
        const response = await requestsService.getRequestById(id);
        setRequest(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Ошибка при получении данных запроса:', err);
        setError(err.response?.data?.msg || 'Произошла ошибка при загрузке данных запроса');
        setLoading(false);
      }
    };

    fetchRequestDetails();
  }, [id]);

  if (loading) {
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
            to="/requests"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Вернуться к списку запросов
          </Link>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Запрос не найден</h2>
          <Link 
            to="/requests"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Вернуться к списку запросов
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-md p-4 mb-6 text-center">
        <h1 className="text-xl font-bold mb-2">Чат для запроса: {request.title}</h1>
        <p>В данный момент функционал чата находится в разработке.</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
          <h2 className="text-xl font-semibold mb-2 md:mb-0">
            Детали запроса
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-3 rounded-md">
            <span className="text-sm text-gray-500 block">Предмет</span>
            <span className="font-medium">{request.subject}</span>
          </div>
          <div className="bg-gray-50 p-3 rounded-md">
            <span className="text-sm text-gray-500 block">Класс</span>
            <span className="font-medium">{request.grade}</span>
          </div>
          <div className="bg-gray-50 p-3 rounded-md">
            <span className="text-sm text-gray-500 block">Формат</span>
            <span className="font-medium">{request.format === 'chat' ? 'Чат' : 'Видеозвонок'}</span>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <div>
            <span className="text-sm text-gray-500 block">Ученик</span>
            <span className="font-medium">{request.author.username}</span>
          </div>
          {request.helper && (
            <div>
              <span className="text-sm text-gray-500 block">Помощник</span>
              <span className="font-medium">{request.helper.username}</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="text-center mt-6">
        <Link 
          to={`/request/${id}`}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Вернуться к деталям запроса
        </Link>
      </div>
    </div>
  );
};

export default ChatPage; 