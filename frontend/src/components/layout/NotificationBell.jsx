import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BellIcon } from '@heroicons/react/24/outline';
import { notificationsService } from '../../services/api';
import { toast } from 'react-toastify';

const NotificationItem = ({ notification, closeDropdown }) => {
  const navigate = useNavigate();
  
  const handleClick = (e) => {
    e.preventDefault();
    if (notification.link) {
      navigate(notification.link);
      closeDropdown();
    }
  };

  const title = notification.type === 'moderator_warning' 
    ? `Сообщение от модерации: ${notification.title}` 
    : notification.title;

  const message = notification.message;

  return (
    <a href={notification.link} onClick={handleClick} className="block p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
      <p className={`text-sm font-medium text-gray-800`}>{title}</p>
      {message && <p className={`text-sm text-gray-600`}>{message}</p>}
      <p className="text-xs text-gray-400 mt-1">
        {new Date(notification.createdAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </p>
    </a>
  );
};

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleBellClick = async () => {
    if (isMobile) {
      navigate('/notifications');
      return;
    }

    setIsOpen(!isOpen);
    
    if (!isOpen) {
      setLoading(true);
      try {
        const response = await notificationsService.getNotifications({ limit: 5, page: 1 });
        setNotifications(response.data.notifications || []);
        // Помечаем все как прочитанное при открытии дропдауна, без счетчика
        await notificationsService.markAllAsRead();
      } catch (err) {
        toast.error('Не удалось загрузить уведомления');
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleBellClick}
        className="relative p-2 rounded-full text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <BellIcon className="h-6 w-6" aria-hidden="true" />
      </button>

      {isOpen && !isMobile && (
        <div className="origin-top-right absolute right-0 mt-3 w-80 max-w-sm rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
          <div className="p-3 font-semibold text-gray-800 border-b border-gray-200">
            Уведомления
          </div>
          <div className="max-h-72 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-gray-500">Загрузка...</div>
          ) : notifications.length > 0 ? (
            notifications.map(n => <NotificationItem key={n._id} notification={n} closeDropdown={() => setIsOpen(false)} />)
          ) : (
            <div className="p-4 text-center text-sm text-gray-500">Новых уведомлений нет.</div>
          )}
          </div>
          <Link
            to="/notifications"
            onClick={() => setIsOpen(false)}
            className="block p-3 text-center text-sm font-medium text-indigo-600 hover:bg-gray-50 rounded-b-lg border-t border-gray-100"
          >
            Все уведомления
          </Link>
        </div>
      )}
    </div>
  );
};

export default NotificationBell; 