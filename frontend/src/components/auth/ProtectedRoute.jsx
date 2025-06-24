import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading, isBanned } = useAuth();
  const location = useLocation();
  
  // Если идет загрузка данных пользователя, показываем загрузчик
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  // Если пользователь забанен, не позволяем доступ к защищенным маршрутам
  // Модальное окно бана покажется через App.jsx
  if (isBanned) {
    return null;
  }
  
  // Если пользователь не авторизован, перенаправляем на страницу входа
  if (!currentUser) {
    return <Navigate to="/login" state={{ message: 'Пожалуйста, войдите в систему для доступа к этой странице', from: location.pathname }} replace />;
  }
  
  // Если пользователь авторизован, показываем защищенный контент
  return children;
};

export default ProtectedRoute; 