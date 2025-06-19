import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAllNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from '../../services/notificationService';
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

// Компонент одного уведомления
const NotificationItem = ({ notification, onRead, onDelete }) => {
  const navigate = useNavigate();
  
  const handleClick = async () => {
    if (!notification.read) {
      await onRead(notification._id);
    }
    
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
  
  // Форматирование даты
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
    <div className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-150 ${notification.read ? 'bg-white' : 'bg-blue-50'}`}>
      <div className="flex items-start">
        {getIcon()}
        
        <div className="ml-4 flex-1" onClick={handleClick}>
          <div className="flex justify-between items-start">
            <p className={`text-sm ${notification.read ? 'text-gray-900' : 'font-medium text-gray-900'}`}>
              {notification.message}
            </p>
            <div className="flex items-center">
              {!notification.read && (
                <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
              )}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(notification._id);
                }}
                className="text-gray-400 hover:text-red-500 focus:outline-none"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {formatDate(notification.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
};

const NotificationsPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Если пользователь не авторизован, перенаправляем на страницу входа
  useEffect(() => {
    if (!currentUser) {
      navigate('/login', { state: { message: 'Пожалуйста, войдите в систему для просмотра уведомлений' } });
    }
  }, [currentUser, navigate]);
  
  // Загрузка уведомлений
  const loadNotifications = async (pageNum = 1, append = false) => {
    try {
      setLoading(true);
      const data = await getAllNotifications(pageNum, 10);
      
      if (data && data.notifications) {
        if (append) {
          setNotifications(prev => [...prev, ...data.notifications]);
        } else {
          setNotifications(data.notifications);
        }
        
        setHasMore(data.pagination && data.pagination.hasNextPage);
        setTotalCount(data.pagination?.total || 0);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Ошибка при загрузке уведомлений:', err);
      setError('Не удалось загрузить уведомления');
      toast.error('Ошибка при загрузке уведомлений');
    } finally {
      setLoading(false);
    }
  };
  
  // Загружаем уведомления при монтировании компонента
  useEffect(() => {
    if (currentUser) {
      loadNotifications();
    }
  }, [currentUser]);
  
  // Загрузка следующей страницы
  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadNotifications(nextPage, true);
  };
  
  // Отметка уведомления как прочитанное
  const handleMarkAsRead = async (id) => {
    try {
      await markNotificationAsRead(id);
      
      // Обновляем локальный список
      setNotifications(prevState => 
        prevState.map(notification => 
          notification._id === id
            ? { ...notification, read: true }
            : notification
        )
      );
      
      // Обновляем счетчик непрочитанных
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Ошибка при отметке уведомления как прочитанное:', error);
      toast.error('Не удалось отметить уведомление как прочитанное');
    }
  };
  
  // Отметка всех уведомлений как прочитанные
  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      
      // Обновляем локальный список
      setNotifications(prevState => 
        prevState.map(notification => ({ ...notification, read: true }))
      );
      
      // Обновляем счетчик непрочитанных
      setUnreadCount(0);
      
      toast.success('Все уведомления отмечены как прочитанные');
    } catch (error) {
      console.error('Ошибка при отметке всех уведомлений как прочитанные:', error);
      toast.error('Не удалось отметить все уведомления как прочитанные');
    }
  };
  
  // Удаление уведомления
  const handleDeleteNotification = async (id) => {
    try {
      await deleteNotification(id);
      
      // Обновляем локальный список
      const updatedNotifications = notifications.filter(notification => notification._id !== id);
      setNotifications(updatedNotifications);
      setTotalCount(prev => prev - 1);
      
      // Если удалили непрочитанное, обновляем счетчик
      const wasUnread = notifications.find(n => n._id === id)?.read === false;
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      toast.success('Уведомление удалено');
    } catch (error) {
      console.error('Ошибка при удалении уведомления:', error);
      toast.error('Не удалось удалить уведомление');
    }
  };
  
  // Если пользователь не авторизован, ничего не рендерим
  if (!currentUser) {
    return null;
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {/* Заголовок */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Уведомления</h1>
            <p className="text-sm text-gray-500 mt-1">
              Всего: {totalCount}, Непрочитанных: {unreadCount}
            </p>
          </div>
          
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="btn btn-outline btn-sm"
            >
              Отметить все как прочитанные
            </button>
          )}
        </div>
        
        {/* Список уведомлений */}
        <div className="divide-y divide-gray-200">
          {loading && page === 1 ? (
            <Loader />
          ) : notifications.length > 0 ? (
            <>
              {notifications.map(notification => (
                <NotificationItem 
                  key={notification._id}
                  notification={notification}
                  onRead={handleMarkAsRead}
                  onDelete={handleDeleteNotification}
                />
              ))}
              
              {/* Кнопка "Загрузить еще" */}
              {hasMore && (
                <div className="p-4 text-center">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="btn btn-outline btn-sm"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Загрузка...
                      </>
                    ) : (
                      'Загрузить еще'
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage; 