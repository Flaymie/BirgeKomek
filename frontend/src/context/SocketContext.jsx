import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { serverURL } from '../services/api';

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

const SOCKET_URL = serverURL;

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { token, setIsBanned, setBanReason } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    console.log('[SocketContext] useEffect triggered by token change:', token ? 'token exists' : 'token is null');

    if (token) {
      console.log('[SocketContext] Token found. Attempting to create socket with URL:', SOCKET_URL);

      const newSocket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket']
      });

      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('Global Socket Connected:', newSocket.id);
      });

      newSocket.on('connect_error', (err) => {
        console.error('Global Socket Connection Error:', err.message);
        // Можно добавить доп. логику, например, попытку переподключения или выход
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
      console.log('[SocketContext] Token is missing. Disconnecting if socket exists.');
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    }
    // Зависимость ТОЛЬКО от токена
  }, [token]);

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