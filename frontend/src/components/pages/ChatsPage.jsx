import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { chatsService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { formatAvatarUrl } from '../../services/avatarUtils';
import DefaultAvatarIcon from '../shared/DefaultAvatarIcon';
import StatusBadge from '../shared/StatusBadge';

const ChatAvatar = ({ user }) => {
  const avatarUrl = formatAvatarUrl(user);
  return avatarUrl ? (
    <img
      className="inline-block h-8 w-8 rounded-full ring-2 ring-white"
      src={avatarUrl}
      alt={user.username}
    />
  ) : (
    <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-200 flex items-center justify-center">
      <DefaultAvatarIcon className="h-5 w-5 text-gray-500" />
    </div>
  );
};

const ChatsPage = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Ждем окончания загрузки данных об аутентификации
    if (authLoading) return;

    // Если загрузка завершена и пользователя нет - редирект
    if (!currentUser) {
      navigate('/login', { state: { message: 'Для просмотра чатов необходимо авторизоваться' } });
      return;
    }

    const fetchChats = async () => {
      setLoading(true);
      try {
        const response = await chatsService.getUserChats();
        setChats(response.data.chats);
      } catch (err) {
        console.error('Ошибка при получении списка чатов:', err);
        if (err.response && err.response.status === 401) {
            navigate('/login', { state: { message: 'Сессия истекла, войдите снова' } });
        } else {
            setError('Не удалось загрузить список чатов. Пожалуйста, попробуйте позже.');
            toast.error('Ошибка при загрузке чатов');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, [currentUser, authLoading, navigate]);

  // Функция для форматирования даты
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-12 mt-16">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12 mt-16">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-6">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 mt-16">
      <h1 className="text-2xl font-bold mb-6">Мои чаты</h1>
      
      {chats.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">У вас пока нет чатов</h3>
          <p className="mt-1 text-sm text-gray-500">
            Чаты создаются автоматически, когда вы принимаете отклик на запрос или когда ваш отклик принимают.
          </p>
          <div className="mt-6">
            <Link
              to="/requests"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Перейти к запросам
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {chats.map((chat) => (
            <Link
              key={chat.requestId}
              to={`/requests/${chat.requestId}/chat`}
              className="block bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow p-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{chat.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {chat.subject} • {chat.grade} класс
                  </p>
                </div>
                <div className="flex items-center">
                  {chat.unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-1 mr-2 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                      {chat.unreadCount}
                    </span>
                  )}
                  <StatusBadge status={chat.status} />
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-4">
                <div className="flex items-center">
                  <div className="flex -space-x-2 overflow-hidden">
                    <ChatAvatar user={chat.author} />
                    {chat.helper && (
                      <ChatAvatar user={chat.helper} />
                    )}
                  </div>
                  <span className="ml-3 text-sm text-gray-500">
                    {currentUser._id === chat.author._id ? 
                      `Хелпер: ${chat.helper ? chat.helper.username : 'Не назначен'}` : 
                      `Ученик: ${chat.author.username}`}
                  </span>
                </div>
                
                <div className="flex items-center">
                  <div className="text-sm text-gray-500 mr-2">
                    {formatDate(chat.lastMessage.createdAt)}
                  </div>
                  <span className="inline-flex items-center text-sm text-indigo-600">
                    <svg className="mr-1.5 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path>
                    </svg>
                    {chat.lastMessage.hasAttachments ? 
                      'Вложение' : 
                      chat.lastMessage.content.length > 30 ? 
                        `${chat.lastMessage.content.substring(0, 30)}...` : 
                        chat.lastMessage.content || 'Открыть чат'}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatsPage;