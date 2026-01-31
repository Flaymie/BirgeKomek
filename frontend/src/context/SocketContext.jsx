import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { serverURL } from '../services/api';
import { toast } from 'react-toastify';
import { usersService } from '../services/api';

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
  const { token, showBanModal, closeBanModal, _updateCurrentUserState } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState(null);
  const currentRoomRef = useRef(null);
  const [onlineStats, setOnlineStats] = useState({ onlineUsers: 0, onlineHelpers: 0 });

  useEffect(() => {
    if (token) {
      if (!socketRef.current) {
        const newSocket = io(SOCKET_URL, {
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000,
        });
        socketRef.current = newSocket;


        newSocket.on('connect', () => {
          setIsConnected(true);
          newSocket.emit('get_unread_notifications_count', (count) => {
            setUnreadCount(count || 0);
          });

          // Восстанавливаем комнату при реконнекте
          if (currentRoomRef.current) {
            newSocket.emit('join_request', currentRoomRef.current);
          }
        });

        newSocket.on('reconnect', (attemptNumber) => {
          // Восстанавливаем комнату при реконнекте
          if (currentRoomRef.current) {
            newSocket.emit('join_request', currentRoomRef.current);
          }
        });

        newSocket.on('connect_error', (error) => {
          console.error('Socket connection error:', error.message);
          if (error.message === 'TOKEN_EXPIRED') {
            localStorage.removeItem('token');
            sessionStorage.setItem('auth_message', 'Ваша сессия истекла. Пожалуйста, войдите снова.');
            window.location.href = '/login';
          }
        });

        newSocket.on('reconnect_failed', () => {
          console.error('Failed to reconnect to server');
          toast.error('Потеряно соединение с сервером. Обновите страницу.');
        });

        newSocket.on('disconnect', (reason) => {
          setIsConnected(false);

          // Если сервер отключил, пытаемся переподключиться
          if (reason === 'io server disconnect') {
            newSocket.connect();
          }
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

        newSocket.on('online_stats_updated', (stats) => {
          if (stats && typeof stats === 'object') {
            setOnlineStats({
              onlineUsers: stats.onlineUsers || 0,
              onlineHelpers: stats.onlineHelpers || 0,
            });
          }
        });

        newSocket.on('user_banned', (data) => {
          showBanModal(data);
        });

        newSocket.on('profile_updated', async (updatedFields) => {
          try {
            const response = await usersService.getCurrentUser();
            _updateCurrentUserState(response.data);
            toast.success('Ваш профиль обновлен');
          } catch (error) {
            console.error('Ошибка при обновлении профиля:', error);
          }
        });

        newSocket.on('response_updated', (updatedResponse) => {
          // Это событие обновляет откликы глобально
          // Компоненты, которые слушают это событие, обновят свое состояние
        });

        newSocket.on('account_banned', (details) => {
          if (typeof showBanModal === 'function') {
            showBanModal(details);
          }
        });

        newSocket.on('account_unbanned', async () => {
          try {
            const response = await usersService.getCurrentUser();
            _updateCurrentUserState(response.data);
          } finally {
            if (typeof closeBanModal === 'function') closeBanModal();
          }
        });

        newSocket.on('redirect_to_chat', (data) => {
          // Сохраняем URL редиректа в состояние
          if (data && data.chatUrl) {
            setRedirectUrl(data.chatUrl);
          }
        });

        const pingInterval = setInterval(() => {
          if (newSocket.connected) {
            newSocket.emit('user_ping');
          }
        }, 90000);

        // Обработка Page Visibility API для мобильных устройств
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            // Страница стала видимой - проверяем соединение
            if (!newSocket.connected) {
              newSocket.connect();
            } else if (currentRoomRef.current) {
              // Переприсоединяемся к комнате на всякий случай
              newSocket.emit('join_request', currentRoomRef.current);
            }
          }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
          clearInterval(pingInterval);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
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
  }, [token, showBanModal, closeBanModal, _updateCurrentUserState]);

  useEffect(() => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('user_navigate', { path: location.pathname });
    }
  }, [location.pathname]);

  // Эффект для редиректа при получении события redirect_to_chat
  useEffect(() => {
    if (redirectUrl) {
      window.location.href = redirectUrl;
      setRedirectUrl(null);
    }
  }, [redirectUrl]);

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

  const joinRoom = (roomId) => {
    currentRoomRef.current = roomId;
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('join_request', roomId);
    }
  };

  const leaveRoom = () => {
    if (currentRoomRef.current && socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('leave_request', currentRoomRef.current);
    }
    currentRoomRef.current = null;
  };

  const markAsReadByEntity = (relatedEntityId) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('mark_notifications_read_by_entity', { relatedEntityId }, (response) => {
        if (response.success && response.unreadCount !== undefined) {
          setUnreadCount(response.unreadCount);
        }
      });
    }
  };

  const value = {
    socket: socketRef.current,
    isConnected,
    unreadCount,
    markAllAsRead,
    markAsReadByEntity,
    joinRoom,
    leaveRoom,
    onlineUsers: onlineStats.onlineUsers,
    onlineHelpers: onlineStats.onlineHelpers,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};