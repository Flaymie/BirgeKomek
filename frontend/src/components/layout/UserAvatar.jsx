import React from 'react';
import { useAuth } from '../../context/AuthContext';

const UserAvatar = ({ size = 'md', onClick }) => {
  const { currentUser, generateAvatarColor } = useAuth();
  
  if (!currentUser) return null;
  
  // Получаем первую букву имени пользователя
  const firstLetter = currentUser.username.charAt(0).toUpperCase();
  
  // Генерируем цвет фона на основе имени пользователя
  const backgroundColor = generateAvatarColor(currentUser.username);
  
  // Определяем размеры аватара
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl'
  };
  
  return (
    <div 
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-semibold text-gray-800 cursor-pointer`}
      style={{ backgroundColor }}
      onClick={onClick}
      title={currentUser.username}
    >
      {firstLetter}
    </div>
  );
};

export default UserAvatar; 