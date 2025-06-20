import React, { useState, useRef } from 'react';
import { UserCircleIcon, PencilSquareIcon } from '@heroicons/react/24/solid';

const AvatarInput = ({ defaultAvatarUrl, onFileChange }) => {
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Создаем URL для предпросмотра
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
      
      // Передаем сам файл наверх
      if (onFileChange) {
        onFileChange(file);
      }
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current.click();
  };

  const currentAvatarSrc = preview || defaultAvatarUrl;

  return (
    <div className="relative w-32 h-32 cursor-pointer group" onClick={handleAvatarClick}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/png, image/jpeg, image/gif, image/webp"
      />
      
      {currentAvatarSrc ? (
        <img
          src={currentAvatarSrc}
          alt="Avatar"
          className="object-cover w-full h-full rounded-full"
        />
      ) : (
        <UserCircleIcon className="w-full h-full text-gray-300" />
      )}

      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
        <PencilSquareIcon className="w-10 h-10 text-white" />
      </div>
    </div>
  );
};

export default AvatarInput; 