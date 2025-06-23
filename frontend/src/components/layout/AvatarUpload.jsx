import React, { useState, useRef } from 'react';
import { toast } from 'react-toastify';
import { CameraIcon, UserIcon } from '@heroicons/react/24/solid';
import { api } from '../../services/api';
import { formatAvatarUrl } from '../../services/avatarUtils';
import { useAuth } from '../../context/AuthContext';

const AvatarUpload = ({ currentAvatar, onAvatarChange, size = 'lg', editable = true, isRegistration = false }) => {
  const [avatar, setAvatar] = useState(currentAvatar || '');
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);
  const { updateAvatar } = useAuth();
  
  // Размеры аватара
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-40 h-40'
  };
  
  // Обработка клика по аватару
  const handleAvatarClick = () => {
    if (editable && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Загрузка выбранного файла на сервер (для авторизованных пользователей)
  const uploadAvatarToServer = async (file) => {
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await api.post('/upload/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const newAvatarUrl = response.data.avatarUrl || response.data.avatar;
      setAvatar(newAvatarUrl);
      
      if (updateAvatar) {
        updateAvatar(newAvatarUrl);
      }
      
      if (onAvatarChange) {
        onAvatarChange(newAvatarUrl);
      }
      
      toast.success('Аватар успешно загружен');
    } catch (err) {
      console.error('Ошибка загрузки аватара:', err);
      
      const errorMsg = err.response?.data?.msg || 'Ошибка загрузки аватара';
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Обработка файла локально (для регистрации без авторизации)
  const handleFileLocally = (file) => {
    setIsLoading(true);
    
    try {
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const base64data = reader.result;
        setAvatar(base64data);
        
        if (onAvatarChange) {
          onAvatarChange(base64data);
        }
        
        setIsLoading(false);
      };
      
      reader.onerror = () => {
        toast.error('Ошибка при чтении файла');
        setIsLoading(false);
      };
      
      reader.readAsDataURL(file);
      
    } catch (err) {
      toast.error('Ошибка обработки файла');
      setIsLoading(false);
    }
  };
  
  // Обработка изменения выбранного файла
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.match('image.*')) {
        toast.error('Пожалуйста, выберите изображение');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Размер файла должен быть не более 5 МБ');
        return;
      }
      
      if (isRegistration) {
        handleFileLocally(file);
      } else {
        uploadAvatarToServer(file);
      }
    }
  };
  
  // Получение URL аватара для отображения с использованием утилиты
  const getAvatarUrl = () => {
    if (!avatar) return null;
    
    if (avatar.startsWith('data:image')) {
      return avatar;
    }
    
    return formatAvatarUrl({ avatar });
  };
  
  return (
    <div 
      className={`relative ${sizeClasses[size]} rounded-full overflow-hidden mx-auto ${editable ? 'cursor-pointer' : ''}`}
      onMouseEnter={() => editable && setIsHovered(true)}
      onMouseLeave={() => editable && setIsHovered(false)}
      onClick={handleAvatarClick}
    >
      {/* Скрытый input для выбора файла */}
      {editable && (
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
          disabled={isLoading}
        />
      )}
      
      {/* Отображение аватара или заглушки */}
      {getAvatarUrl() ? (
        <img 
          src={getAvatarUrl()} 
          alt="Аватар пользователя" 
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
          <UserIcon className="h-1/2 w-1/2 text-gray-400" />
        </div>
      )}
      
      {/* Оверлей при наведении */}
      {editable && isHovered && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <CameraIcon className="h-1/3 w-1/3 text-white" />
        </div>
      )}
      
      {/* Индикатор загрузки */}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}
    </div>
  );
};

export default AvatarUpload; 