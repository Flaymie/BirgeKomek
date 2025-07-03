import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Camera, Upload, X } from 'lucide-react';
import DefaultAvatarIcon from '../shared/DefaultAvatarIcon';
import { api, serverURL } from '../../services/api';

const AvatarUpload = ({ currentAvatar, onAvatarChange, size = 'md', editable = true, className = '', isRegistration = false }) => {
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  // Устанавливаем начальное изображение аватара
  useEffect(() => {
    if (currentAvatar) {
      // Если путь относительный, добавляем базовый URL
      if (currentAvatar && currentAvatar.startsWith('/')) {
        setPreviewUrl(`${serverURL}${currentAvatar}`);
      } else {
        setPreviewUrl(currentAvatar);
      }
    }
  }, [currentAvatar]);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Проверка типа файла
    if (!file.type.match('image.*')) {
      toast.error('Пожалуйста, выберите изображение');
      return;
    }

    // Проверка размера файла (макс. 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Размер файла не должен превышать 5MB');
      return;
    }

    // Создаем предпросмотр
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target.result);
    reader.readAsDataURL(file);

    // Если это страница регистрации, не отправляем запрос на сервер
    if (isRegistration) {
      // Просто обновляем локальное состояние и передаем файл родителю
      onAvatarChange(file);
      return;
    }

    setLoading(true);
    try {
      // Создаем FormData для отправки файла
      const formData = new FormData();
      formData.append('avatar', file);
      
      // Отправляем запрос напрямую через api
      const response = await api.post('/users/me/avatar', formData);
      
      // Обновляем аватар в родительском компоненте
      onAvatarChange(response.data.avatarUrl);
      toast.success('Аватар успешно обновлен!');
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Не удалось загрузить аватар');
      console.error('Ошибка при загрузке аватара:', error);
      // Если произошла ошибка, возвращаем предыдущий аватар
      if (currentAvatar) {
        setPreviewUrl(currentAvatar.startsWith('/') ? `${serverURL}${currentAvatar}` : currentAvatar);
      } else {
        setPreviewUrl(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarClick = () => {
    if (editable && !loading) {
      fileInputRef.current.click();
    }
  };

  const handleRemoveAvatar = (e) => {
    e.stopPropagation(); // Предотвращаем всплытие события
    setPreviewUrl(null);
    onAvatarChange('');
  };

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-40 h-40',
  };

  const iconSizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className={`relative rounded-full cursor-pointer group ${sizeClasses[size]} border-2 border-gray-300 flex items-center justify-center overflow-hidden ${className} ${loading ? 'animate-pulse' : ''}`}
        onClick={handleAvatarClick}
        title={editable ? 'Нажмите, чтобы изменить аватар' : ''}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Avatar"
            className="rounded-full w-full h-full object-cover"
          />
        ) : (
          <div className="rounded-full w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <DefaultAvatarIcon className={`text-gray-400 ${iconSizeClasses[size]}`} />
          </div>
        )}

        {editable && !loading && (
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-full flex items-center justify-center transition-all duration-300">
            <Upload className={`text-white opacity-0 group-hover:opacity-100 transition-all duration-300 ${iconSizeClasses[size]}`} />
          </div>
        )}
        
        {editable && previewUrl && (
          <button
            type="button"
            onClick={handleRemoveAvatar}
            className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          >
            <X className="h-3 w-3 text-white" />
          </button>
        )}
        
        {loading && (
          <div className="absolute inset-0 bg-black bg-opacity-60 rounded-full flex items-center justify-center">
            <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/png, image/jpeg, image/gif"
          disabled={loading}
        />
      </div>
      {editable && (
        <p className="text-xs text-gray-500 mt-2">
          Нажмите для загрузки аватара
        </p>
      )}
    </div>
  );
};

export default AvatarUpload; 