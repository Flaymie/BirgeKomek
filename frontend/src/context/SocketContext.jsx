import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { serverURL } from '../services/api';
import { toast } from 'react-toastify';

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
  const socketRef = useRef(null);
  const { token, showBanModal } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  // Эффект для управления жизненным циклом сокета
  useEffect(() => {
    if (token) {
      if (!socketRef.current) {
        const newSocket = io(SOCKET_URL, {
          auth: { token },
          transports: ['websocket'],
          reconnectionAttempts: 5,
        });
        socketRef.current = newSocket;
        
        // --- Глобальные слушатели, которые живут вместе с сокетом ---
        newSocket.on('connect', () => {
          setIsConnected(true);
          newSocket.emit('get_unread_notifications_count', (count) => {
            setUnreadCount(count || 0);
          });
        });

        newSocket.on('disconnect', () => {
          setIsConnected(false);
        });
        
        newSocket.on('update_unread_count', (count) => {
          setUnreadCount(count || 0);
        });

        newSocket.on('new_notification', (notification) => {
          setUnreadCount(prevCount => prevCount + 1);
          toast.info(
            <ToastBody title={notification.title} message={notification.message} link={notification.link} />, 
            { closeButton: true, autoClose: 8000 }
          );
        });

        newSocket.on('user_banned', (data) => {
          showBanModal(data);
        });

        // "Heartbeat" для поддержания статуса онлайн
        const pingInterval = setInterval(() => {
            if (newSocket.connected) {
                newSocket.emit('user_ping');
            }
        }, 90000); // Увеличим интервал до 90 сек для снижения нагрузки
        
        // Функция очистки при размонтировании всего провайдера
        return () => {
          clearInterval(pingInterval);
          newSocket.disconnect();
          socketRef.current = null;
        };
      }
    } else {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
    }
  }, [token, showBanModal]);

  // Эффект для отслеживания навигации пользователя
  useEffect(() => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('user_navigate', { path: location.pathname });
    }
  }, [location.pathname]);

  const markAllAsRead = () => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('mark_notifications_read', (response) => {
        if (response.success) {
          setUnreadCount(0);
        } else {
          console.error('Failed to mark notifications as read', response.error);
          toast.error("Не удалось отметить уведомления как прочитанные");
        }
      });
    }
  };

  const value = {
    socket: socketRef.current,
    isConnected,
    unreadCount,
    markAllAsRead,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};