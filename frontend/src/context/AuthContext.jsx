import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { authService, usersService } from '../services/api';
import { setAuthToken, clearAuthToken, getAuthToken } from '../services/tokenStorage';

export const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    
    // --- НОВЫЕ СОСТОЯНИЯ ДЛЯ МОДАЛКИ БАНА ---
    const [banDetails, setBanDetails] = useState(null);
    const [isBannedModalOpen, setIsBannedModalOpen] = useState(false);

    const loadUser = useCallback(async () => {
        const token = getAuthToken();
        if (token) {
            setAuthToken(token);
            try {
                const response = await usersService.getMe();
                setCurrentUser(response.data);
                setIsAuthenticated(true);
                // Проверка на бан при загрузке
                if (response.data.banDetails && response.data.banDetails.isBanned) {
                    showBanModal(response.data.banDetails);
                }
            } catch (error) {
                console.error("Ошибка при загрузке пользователя:", error);
                if (error.response && error.response.data.isBanned) {
                    showBanModal(error.response.data.banDetails);
                } else {
                    clearAuthToken();
                    setCurrentUser(null);
                    setIsAuthenticated(false);
                }
            }
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    // --- НОВАЯ ФУНКЦИЯ ДЛЯ ОТОБРАЖЕНИЯ МОДАЛКИ БАНА ---
    const showBanModal = (details) => {
        setBanDetails(details);
        setIsBannedModalOpen(true);
    };

    const login = async (credentials) => {
        // ... (существующий код)
    };

    const register = async (userData) => {
        // ... (существующий код)
    };

    const logout = () => {
        clearAuthToken();
        setCurrentUser(null);
        setIsAuthenticated(false);
        // --- ЗАКРЫВАЕМ МОДАЛКУ ПРИ ВЫХОДЕ ---
        setIsBannedModalOpen(false); 
        setBanDetails(null);
    };
    
    const updateProfile = async (profileData) => {
        // ... (существующий код)
    };
    
    const _updateCurrentUserState = (updatedUserData) => {
        setCurrentUser(prevUser => ({
            ...prevUser,
            ...updatedUserData,
        }));
    };

    const value = {
        currentUser,
        loading,
        isAuthenticated,
        login,
        register,
        logout,
        updateProfile,
        _updateCurrentUserState,
        // --- ПРОБРАСЫВАЕМ НОВЫЕ ЗНАЧЕНИЯ ---
        isBannedModalOpen,
        banDetails,
        showBanModal,
        closeBanModal: () => setIsBannedModalOpen(false),
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}; 