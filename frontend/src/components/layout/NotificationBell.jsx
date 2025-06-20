import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BellIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import { notificationsService } from '../../services/api';
import { toast } from 'react-toastify';

const NotificationItem = ({ notification, closeDropdown }) => {
  const navigate = useNavigate();
  const handleClick = () => {
    if (notification.link) {
      navigate(notification.link);
      closeDropdown();
    }
  };
  return (
    <div onClick={handleClick} className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
      <p className="text-sm text-gray-800">{notification.message}</p>
      <p className="text-xs text-gray-400 mt-1">
        {new Date(notification.createdAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  );
};

const NotificationBell = () => {
  const { currentUser, unreadNotifications, markNotificationsAsRead } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const handleBellClick = async () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    
    if (newIsOpen) {
      setLoading(true);
      try {
        const response = await notificationsService.getNotifications({ limit: 4 });
        setNotifications(response.data.notifications || []);
        // Если были непрочитанные, помечаем их как прочитанные
        if (unreadNotifications > 0) {
          await notificationsService.markAllAsRead();
          markNotificationsAsRead(); // Обновляем состояние в контексте
        }
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

  if (!currentUser) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleBellClick}
        className="relative p-2 rounded-full text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <BellIcon className="h-6 w-6" aria-hidden="true" />
        {unreadNotifications > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            <span>{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>
          </span>
        )}
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-3 w-80 max-w-sm rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
          <div className="p-3 font-semibold text-gray-800 border-b border-gray-200">
            Последние уведомления
          </div>
          {loading ? (
            <div className="p-4 text-center text-sm text-gray-500">Загрузка...</div>
          ) : notifications.length > 0 ? (
            notifications.map(n => <NotificationItem key={n._id} notification={n} closeDropdown={() => setIsOpen(false)} />)
          ) : (
            <div className="p-4 text-center text-sm text-gray-500">Новых уведомлений нет.</div>
          )}
          <Link
            to="/notifications"
            onClick={() => setIsOpen(false)}
            className="block p-3 text-center text-sm font-medium text-indigo-600 hover:bg-gray-50 rounded-b-lg"
          >
            Все уведомления
          </Link>
        </div>
      )}
    </div>
  );
};

export default NotificationBell; 