import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsService } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { toast } from 'react-toastify';

// Компонент для отображения сообщения о загрузке
const Loader = () => (
  <div className="flex justify-center items-center py-20">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
  </div>
);

// Компонент для отображения пустого состояния
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-16 px-4">
    <svg className="w-20 h-20 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
    </svg>
    <h3 className="text-lg font-medium text-gray-900 mb-1">Нет уведомлений</h3>
    <p className="text-gray-500 text-center max-w-md">
      У вас пока нет уведомлений. Когда они появятся, вы увидите их здесь.
    </p>
  </div>
);

// Упрощенный компонент одного уведомления
const NotificationItem = ({ notification }) => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'message':
        return (
          <div className="flex-shrink-0 rounded-full bg-blue-100 p-2">
            <svg className="w-5 h-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'request':
        return (
          <div className="flex-shrink-0 rounded-full bg-green-100 p-2">
            <svg className="w-5 h-5 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="flex-shrink-0 rounded-full bg-indigo-100 p-2">
            <svg className="w-5 h-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
          </div>
        );
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', { 
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  };

  return (
    <div 
      onClick={handleClick}
      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-150 border-l-4 ${!notification.isRead ? 'border-indigo-500' : 'border-transparent'}`}
    >
      <div className="flex items-start">
        {getIcon()}
        <div className="ml-4 flex-1">
          <p className="text-sm text-gray-800 font-semibold">
            {notification.type === 'moderator_warning' ? `Сообщение от модерации: ${notification.title}` : notification.title}
          </p>
          {notification.message && (
              <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">{formatDate(notification.createdAt)}</p>
        </div>
      </div>
    </div>
  );
};

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  useEffect(() => {
    const fetchAndMarkNotifications = async () => {
      setLoading(true);
      try {
        // Сначала получаем уведомления
        const response = await notificationsService.getNotifications();
        setNotifications(response.data.notifications || []);
        
        // Затем помечаем их как прочитанные (на бэкенде)
        await notificationsService.markAllAsRead();
        
      } catch (err) {
        toast.error('Ошибка при загрузке уведомлений.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAndMarkNotifications();
  }, []);

  // --- СЛУШАЕМ СОКЕТ ---
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (newNotification) => {
      setNotifications(prev => [newNotification, ...prev]);
    };

    socket.on('new_notification', handleNewNotification);

    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [socket]);

  return (
    <div className="container mx-auto px-4 py-12 mt-16 max-w-3xl">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Уведомления</h1>
        </div>
        
        <div className="divide-y divide-gray-100">
          {loading ? (
            <Loader />
          ) : notifications.length > 0 ? (
            notifications.map(notification => (
              <NotificationItem 
                key={notification._id}
                notification={notification}
              />
            ))
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage; 