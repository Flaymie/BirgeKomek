import React, { useState, useRef } from 'react';
import { toast } from 'react-toastify';
import { Camera } from 'lucide-react';
import DefaultAvatarIcon from '../shared/DefaultAvatarIcon';
import { api } from '../../services/api';

const AvatarUpload = ({ currentAvatar, onAvatarChange, size = 'md', editable = true }) => {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      // Создаем FormData для отправки файла
      const formData = new FormData();
      formData.append('avatar', file);
      
      // Отправляем запрос напрямую через api
      const response = await api.post('/users/me/avatar', formData);
      
      onAvatarChange(response.data.avatarUrl);
      toast.success('Аватар успешно обновлен!');
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Не удалось загрузить аватар.');
      console.error('Ошибка при загрузке аватара:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarClick = () => {
    if (editable && !loading) {
      fileInputRef.current.click();
    }
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
    <div
      className={`relative rounded-full cursor-pointer group ${sizeClasses[size]} border-2 border-gray-300 flex items-center justify-center`}
      onClick={handleAvatarClick}
      title={editable ? 'Нажмите, чтобы изменить аватар' : ''}
    >
      {currentAvatar ? (
        <img
          src={currentAvatar}
          alt="Avatar"
          className="rounded-full w-full h-full object-cover"
        />
      ) : (
        <div className="rounded-full w-full h-full bg-gray-100 flex items-center justify-center">
          <DefaultAvatarIcon className={`text-gray-400 ${iconSizeClasses[size]}`} />
        </div>
      )}

      {editable && (
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-full flex items-center justify-center transition-opacity duration-300">
          {!loading && (
            <Camera className={`w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${iconSizeClasses[size]}`} />
          )}
        </div>
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
  );
};

export default AvatarUpload; 