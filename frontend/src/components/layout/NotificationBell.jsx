import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getUnreadNotifications, markAllNotificationsAsRead } from '../../services/notificationService';
import { toast } from 'react-toastify';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const data = await getUnreadNotifications();
      
      // Отсортируем по дате (новые сверху)
      const sorted = data.sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      
      setNotifications(sorted);
      setUnreadCount(sorted.length);
    } catch (error) {
      // Если API уведомлений еще не реализован (404), просто логируем ошибку без показа пользователю
      if (error.response && error.response.status === 404) {
        console.log('API уведомлений недоступен');
      } else {
        console.error('Не удалось получить уведомления', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Загружаем уведомления при монтировании компонента
  useEffect(() => {
    fetchNotifications();
    
    // Интервал обновления каждые 60 секунд
    const interval = setInterval(() => {
      fetchNotifications();
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Закрываем дропдаун при клике вне его области
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const handleToggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };
  
  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setUnreadCount(0);
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({
          ...notification,
          read: true
        }))
      );
      toast.success('Все уведомления отмечены как прочитанные');
    } catch (error) {
      console.error('Ошибка при отметке уведомлений', error);
      toast.error('Не удалось отметить уведомления как прочитанные');
    }
  };
  
  // Функция для форматирования времени
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) {
      return `${diffMins} мин. назад`;
    } else if (diffHours < 24) {
      return `${diffHours} ч. назад`;
    } else if (diffDays < 7) {
      return `${diffDays} д. назад`;
    } else {
      return date.toLocaleDateString();
    }
  };
  
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'message':
        return (
          <svg className="w-4 h-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
          </svg>
        );
      case 'request':
        return (
          <svg className="w-4 h-4 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
        );
      case 'system':
      default:
        return (
          <svg className="w-4 h-4 text-indigo-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
          </svg>
        );
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button 
        onClick={handleToggleDropdown}
        className="relative p-1 text-gray-700 hover:text-indigo-600 transition-colors duration-300 rounded-full focus:outline-none"
      >
        <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        {/* Счетчик непрочитанных */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      
      {/* Выпадающее меню с уведомлениями */}
      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-50">
          <div className="p-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-medium text-gray-800">Уведомления</h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllAsRead}
                className="text-xs text-indigo-600 hover:text-indigo-800 focus:outline-none"
              >
                Отметить всё как прочитанное
              </button>
            )}
          </div>
          
          <div className="max-h-60 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center items-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : notifications.length > 0 ? (
              <div>
                {notifications.map((notification) => (
                  <Link 
                    to={notification.link || '/notifications'} 
                    key={notification._id} 
                    className={`block px-4 py-2 hover:bg-gray-50 transition-colors duration-150 ${notification.read ? 'bg-white' : 'bg-blue-50'}`}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="ml-3 flex-1">
                        <p className={`text-sm ${notification.read ? 'text-gray-800' : 'font-medium text-gray-900'}`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-4 px-4 text-center text-gray-500 text-sm">
                Нет новых уведомлений
              </div>
            )}
          </div>
          
          <div className="p-2 bg-gray-50 border-t border-gray-200 text-center">
            <Link 
              to="/notifications" 
              className="text-sm text-indigo-600 hover:text-indigo-800"
              onClick={() => setIsDropdownOpen(false)}
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