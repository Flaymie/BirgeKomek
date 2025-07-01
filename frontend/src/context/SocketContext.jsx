import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

const SOCKET_URL = process.env.REACT_APP_API_URL || 'http://localhost:5050';

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { currentUser, setIsBanned, setBanReason } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Сокет создается только один раз при появлении пользователя
    // и пересоздается только при смене ID пользователя.
    if (currentUser?._id) {
      const token = localStorage.getItem('token');
      if (!token) return;

      const newSocket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket']
      });

      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('Global Socket Connected:', newSocket.id);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Global Socket Disconnected:', reason);
      });
      
      // Очистка при разлогине или смене ID пользователя
      return () => {
        console.log('Cleaning up socket connection.');
        newSocket.disconnect();
      };
    } else {
      // Если пользователя нет, убедимся, что сокет отключен
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    }
    // Зависимость ТОЛЬКО от ID пользователя
  }, [currentUser?._id]);

  useEffect(() => {
    if (socket) {
      const handleNewNotification = (notification) => {
        setUnreadCount(prev => prev + 1);
      };
      
      // Обработчик бана пользователя
      const handleUserBanned = (data) => {
        console.log('Получено событие о бане через сокет!', data);
        setBanReason(data.reason || 'Причина не указана');
        setIsBanned(true);
      };
      
      socket.on('new_notification', handleNewNotification);
      socket.on('user_banned', handleUserBanned);

      return () => {
        socket.off('new_notification', handleNewNotification);
        socket.off('user_banned', handleUserBanned);
      };
    }
  }, [socket, setBanReason, setIsBanned, setUnreadCount]);

  const value = {
    socket,
    unreadCount,
    setUnreadCount
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}; 