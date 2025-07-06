import React, { createContext, useContext, useEffect, useState } from 'react';
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
  const { token, setIsBanned, setBanReason } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    console.log('[SocketContext] useEffect triggered by token change:', token ? 'token exists' : 'token is null');

    if (token) {
      const fetchUnreadCount = async () => {
        try {
          const response = await notificationService.getUnreadCount();
          setUnreadCount(response.data.count);
        } catch (error) {
          console.error('Failed to fetch unread notifications count', error);
        }
      };
      fetchUnreadCount();
      
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
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Global Socket Disconnected:', reason);
      });
      
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
  }, [token]);

  useEffect(() => {
    if (socket) {
      const pingInterval = setInterval(() => {
        socket.emit('user_ping');
      }, 30000);

      socket.emit('user_navigate');

      const handleNewNotification = (notification) => {
        setUnreadCount(prevCount => prevCount + 1);
        toast.info(
          <ToastBody title={notification.title} message={notification.message} link={notification.link} />, 
          {
            closeButton: true,
            autoClose: 8000,
          }
        );
      };
      
      const handleUserBanned = (data) => {
        console.log('Получено событие о бане через сокет!', data);
        setBanReason(data.reason || 'Причина не указана');
        setIsBanned(true);
      };
      
      socket.on('new_notification', handleNewNotification);
      socket.on('user_banned', handleUserBanned);

      return () => {
        clearInterval(pingInterval);
        socket.off('new_notification', handleNewNotification);
        socket.off('user_banned', handleUserBanned);
      };
    }
  }, [socket, location, setBanReason, setIsBanned]);

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark notifications as read', error);
    }
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