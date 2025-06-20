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
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      const token = localStorage.getItem('token');
      if (!token) return;

      const newSocket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'] // Для стабильности
      });

      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('Global Socket Connected:', newSocket.id);
        
        // Запускаем пинги, чтобы сервер знал, что мы онлайн
        const pingInterval = setInterval(() => {
          if (newSocket.connected) {
            newSocket.emit('user_ping');
          }
        }, 30000); // каждые 30 секунд

        newSocket.on('disconnect', () => {
          console.log('Global Socket Disconnected');
          clearInterval(pingInterval);
        });
      });

      // Очистка при разлогине или смене пользователя
      return () => {
        newSocket.disconnect();
        setSocket(null);
      };
    } else if (socket) {
      // Если пользователь разлогинился, отключаем сокет
      socket.disconnect();
      setSocket(null);
    }
  }, [currentUser]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}; 