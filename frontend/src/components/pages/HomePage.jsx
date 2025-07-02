import React from 'react';
import { useAuth } from '../../context/AuthContext';
import UserDashboard from './UserDashboard';
import GuestHomepage from './GuestHomepage';

const HomePage = () => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    // Показываем простой лоадер, пока определяется статус пользователя
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg font-semibold text-gray-700">Загрузка платформы...</div>
      </div>
    );
  }

  return currentUser ? <UserDashboard /> : <GuestHomepage />;
};

export default HomePage; 