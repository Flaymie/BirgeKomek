import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usersService, authService, api } from '../services/api';
import { toast } from 'react-toastify';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    const initializeAuth = useCallback(async () => {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
            setToken(storedToken);
            api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
            try {
                const response = await usersService.getCurrentUser();
                setCurrentUser(response.data);
            } catch (error) {
                console.error("Не удалось получить пользователя по токену", error);
                localStorage.removeItem('token');
                setToken(null);
                setCurrentUser(null);
            }
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        initializeAuth();
    }, [initializeAuth]);

    const login = (newToken, userData) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setCurrentUser(userData);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    };
    
    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setCurrentUser(null);
        delete api.defaults.headers.common['Authorization'];
        // Можно добавить редирект на главную или страницу логина
        toast.info("Вы вышли из системы");
    };

    const updateUser = useCallback(async (userData, avatarFile = null) => {
        let finalUserData = { ...userData };

        // 1. Если есть новый файл аватара, загружаем его
        if (avatarFile) {
            try {
                const formData = new FormData();
                formData.append('avatar', avatarFile);
                const { avatar: newAvatarPath } = await usersService.uploadAvatar(formData);
                finalUserData.avatar = newAvatarPath; // Добавляем путь к аватару в данные для обновления
            } catch (error) {
                console.error("Ошибка загрузки аватара:", error);
                toast.error(error.response?.data?.msg || 'Не удалось загрузить аватар');
                throw error; // Прерываем выполнение, если аватар не загрузился
            }
        }

        // 2. Обновляем остальные данные профиля
        try {
            const response = await usersService.updateProfile(finalUserData);
            setCurrentUser(response.data); // Обновляем состояние пользователя данными с сервера
            toast.success("Профиль успешно обновлен!");
            return response.data;
        } catch (error) {
            console.error('Ошибка при обновлении профиля:', error);
            toast.error(error.response?.data?.msg || 'Ошибка при обновлении профиля');
            throw error; // Пробрасываем ошибку дальше для обработки в компоненте
        }
    }, []);


    const value = {
        currentUser,
        token,
        loading,
        login,
        logout,
        updateUser,
        isAuthenticated: !!token
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}; 