import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getUnreadNotifications, markAllNotificationsAsRead } from '../../services/notificationService';
import { chatsService } from '../../services/api';
import { toast } from 'react-toastify';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchUnreadNotifications = async () => {
    try {
      setLoading(true);
      const response = await getUnreadNotifications();
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.notifications.length);
      setLoading(false);
    } catch (err) {
      console.error('Ошибка при получении уведомлений:', err);
      setLoading(false);
    }
  };
  
  const fetchUnreadMessagesCount = async () => {
    try {
      const response = await chatsService.getUnreadCount();
      setUnreadMessagesCount(response.data.unreadCount);
    } catch (err) {
      console.error('Ошибка при получении количества непрочитанных сообщений:', err);
    }
  };
  
  useEffect(() => {
    fetchUnreadNotifications();
    fetchUnreadMessagesCount();
    
    const interval = setInterval(() => {
      fetchUnreadNotifications();
      fetchUnreadMessagesCount();
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({
          ...notification,
          isRead: true
        }))
      );
      setUnreadCount(0);
      toast.success('Все уведомления отмечены как прочитанные');
    } catch (err) {
      console.error('Ошибка при отметке уведомлений как прочитанных:', err);
      toast.error('Не удалось отметить уведомления как прочитанные');
    }
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.abs(now - date) / 36e5;
    
    if (diffInHours < 24) {
      return new Intl.DateTimeFormat('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } else if (diffInHours < 48) {
      return 'Вчера';
    } else {
      return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: '2-digit'
      }).format(date);
    }
  };
  
  const totalUnreadCount = unreadCount + unreadMessagesCount;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1 rounded-full text-gray-600 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <span className="sr-only">Просмотреть уведомления</span>
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        {totalUnreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-5 w-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center transform -translate-y-1/2 translate-x-1/2">
            {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none z-50">
          <div className="py-2 px-4 flex justify-between items-center bg-gray-50 rounded-t-md">
            <h3 className="text-sm font-medium text-gray-900">Уведомления</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-indigo-600 hover:text-indigo-800"
              >
                Отметить все как прочитанные
              </button>
            )}
          </div>
          
          {unreadMessagesCount > 0 && (
            <div className="py-2 px-4 bg-blue-50">
              <Link
                to="/chats"
                className="flex items-center py-2 hover:bg-blue-100 rounded-md px-2 -mx-2"
                onClick={() => setIsOpen(false)}
              >
                <div className="flex-shrink-0 mr-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    У вас {unreadMessagesCount} {unreadMessagesCount === 1 ? 'непрочитанное сообщение' : 
                    unreadMessagesCount < 5 ? 'непрочитанных сообщения' : 'непрочитанных сообщений'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Нажмите, чтобы перейти к чатам
                  </p>
                </div>
              </Link>
            </div>
          )}
          
          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="py-4 text-center">
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500"></div>
                <p className="text-sm text-gray-500 mt-1">Загрузка уведомлений...</p>
              </div>
            ) : notifications.length > 0 ? (
              notifications.map(notification => (
                <Link
                  key={notification._id}
                  to={notification.link || '#'}
                  className={`block px-4 py-3 hover:bg-gray-50 ${!notification.isRead ? 'bg-indigo-50' : ''}`}
                  onClick={() => setIsOpen(false)}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3">
                      <div className={`h-8 w-8 rounded-full ${!notification.isRead ? 'bg-indigo-100' : 'bg-gray-100'} flex items-center justify-center`}>
                        {notification.type.includes('message') ? (
                          <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                        ) : notification.type.includes('review') ? (
                          <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        ) : notification.type.includes('request') ? (
                          <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${!notification.isRead ? 'text-indigo-900' : 'text-gray-900'}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="py-6 text-center">
                <svg className="mx-auto h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-sm text-gray-500 mt-2">Нет новых уведомлений</p>
              </div>
            )}
          </div>
          
          <div className="py-2 px-4 bg-gray-50 rounded-b-md">
            <Link
              to="/notifications"
              className="block text-center text-sm text-indigo-600 hover:text-indigo-800"
              onClick={() => setIsOpen(false)}
            >
              Просмотреть все уведомления
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell; 