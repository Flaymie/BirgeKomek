import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { baseURL } from '../../services/api';

const UserAvatar = ({ size = 'md', onClick, user }) => {
  const { currentUser, generateAvatarColor } = useAuth();
  
  // Используем переданного пользователя или текущего пользователя из контекста
  const userObj = user || currentUser;
  
  if (!userObj) return null;
  
  // Получаем первую букву имени пользователя
  const firstLetter = userObj.username.charAt(0).toUpperCase();
  
  // Генерируем цвет фона на основе имени пользователя
  const backgroundColor = generateAvatarColor(userObj.username);
  
  // Определяем размеры аватара
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl'
  };

  // Проверяем, есть ли аватар у пользователя
  const hasAvatar = userObj.avatar && userObj.avatar.trim() !== '';
  
  return (
    <>
      {hasAvatar ? (
        <img 
          src={`${baseURL}${userObj.avatar}`}
          alt={userObj.username}
          className={`${sizeClasses[size]} rounded-full object-cover cursor-pointer`}
          onClick={onClick}
          title={userObj.username}
        />
      ) : (
        <div 
          className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-semibold text-gray-800 cursor-pointer`}
          style={{ backgroundColor }}
          onClick={onClick}
          title={userObj.username}
        >
          {firstLetter}
        </div>
      )}
    </>
  );
};

export default UserAvatar; 