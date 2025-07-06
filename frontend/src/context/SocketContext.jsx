import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { serverURL } from '../services/api';
import { toast } from 'react-toastify';
import notificationService from '../services/notificationService';

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

const ToastBody = ({ title, message, link }) => (
  <a href={link} className="block w-full" onClick={() => toast.dismiss()}>
    <p className="font-bold text-gray-800">{title}</p>
    {message && <p className="text-sm text-gray-600">{message}</p>}
  </a>
);

const SOCKET_URL = serverURL;

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null); // Используем ref для хранения экземпляра сокета
  const { token, showBanModal } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Если есть токен и сокета еще нет, создаем его
    if (token && !socketRef.current) {
      const newSocket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('✅ Global Socket Connected:', newSocket.id);
        // Запрашиваем счетчик после успешного подключения
        newSocket.emit('get_unread_notifications_count', (count) => {
           setUnreadCount(count);
        });
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Global Socket Disconnected:', reason);
      });
      
      newSocket.on('connect_error', (err) => {
        console.error('Global Socket Connection Error:', err.message);
      });
      
      // Обработчик для принудительного обновления счетчика
      newSocket.on('update_unread_count', (count) => {
        setUnreadCount(count);
      });

    } else if (!token && socketRef.current) {
      // Если токена нет, а сокет есть - отключаемся
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
    }

    // Эта функция очистки будет вызвана только при размонтировании всего приложения
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [token]);


  useEffect(() => {
    if (socket) {
      const pingInterval = setInterval(() => {
        if(socket.connected) {
          socket.emit('user_ping');
        }
      }, 30000);

      // Отправляем событие при каждой смене страницы
      socket.emit('user_navigate', { path: location.pathname });

      const handleNewNotification = (notification) => {
        setUnreadCount(prevCount => prevCount + 1);
        toast.info(
          <ToastBody title={notification.title} message={notification.message} link={notification.link} />, 
          { closeButton: true, autoClose: 8000 }
        );
      };
      
      const handleUserBanned = (data) => {
        console.log('Получено событие о бане через сокет!', data);
        showBanModal(data);
      };
      
      socket.on('new_notification', handleNewNotification);
      socket.on('user_banned', handleUserBanned);

      return () => {
        clearInterval(pingInterval);
        socket.off('new_notification', handleNewNotification);
        socket.off('user_banned', handleUserBanned);
      };
    }
  }, [socket, location.pathname, showBanModal]);

  const markAllAsRead = async () => {
    if (!socket) return;
    socket.emit('mark_notifications_read', (response) => {
       if (response.success) {
           setUnreadCount(0);
       } else {
           console.error('Failed to mark notifications as read', response.error);
           toast.error("Не удалось отметить уведомления как прочитанные");
       }
    });
  };

  const value = {
    socket,
    unreadCount,
    markAllAsRead,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};