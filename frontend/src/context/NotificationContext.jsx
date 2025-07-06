import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext'; // <--- Используем наш useSocket

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();
    const { socket } = useSocket(); // <--- Получаем сокет из контекста

    const fetchUnreadCount = useCallback(async () => {
        if (!user) {
            setUnreadCount(0);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const { data } = await api.get('/notifications?limit=1');
            setUnreadCount(data.unreadCount || 0);
        } catch (error) {
            console.error('Не удалось загрузить количество уведомлений:', error);
            setUnreadCount(0);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchUnreadCount();
    }, [fetchUnreadCount]);

    useEffect(() => {
        if (!socket || !user) return;

        const handleNewNotificationForCounter = (notification) => {
            // Сервер должен слать событие только нужному юзеру, но проверим на всякий случай
            if (notification.user === user._id) {
                console.log('[NotificationContext] Получено новое уведомление, увеличиваем счетчик.');
                setUnreadCount(prevCount => prevCount + 1);
            }
        };
        
        // Регистрируем своего слушателя
        socket.on('new_notification', handleNewNotificationForCounter);

        return () => {
            // Убираем именно своего слушателя
            socket.off('new_notification', handleNewNotificationForCounter);
        };
    }, [socket, user]);

    const markAllAsRead = useCallback(async () => {
        if (unreadCount === 0) return;
        try {
            await api.put('/notifications/read-all');
            setUnreadCount(0);
        } catch (error) {
            console.error('Не удалось отметить уведомления как прочитанные:', error);
        }
    }, [unreadCount]);

    const value = {
        unreadCount,
        markAllAsRead,
        isLoading
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}; 