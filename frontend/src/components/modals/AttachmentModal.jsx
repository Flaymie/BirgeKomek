import React, { useEffect, useState } from 'react';
import { serverURL } from '../../services/api';
import { ArrowDownCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { downloadFile } from '../../services/downloadService';

const AttachmentModal = ({ file, onClose }) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  // Эффект для плавного появления/исчезновения
  useEffect(() => {
    if (file) {
      // Даем микро-задержку, чтобы React успел отрендерить компонент с opacity-0
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    }
  }, [file]);
  
  // Обновленная функция закрытия с учетом анимации
  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Ждем завершения анимации (duration-300)
  };

  // Закрытие по клавише Escape, с учетом зума и анимации
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (isZoomed) {
          setIsZoomed(false); // Сначала убираем зум
        } else {
          handleClose(); // Потом закрываем с анимацией
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isZoomed]); // Зависимость только от isZoomed, т.к. handleClose уже инкапсулирована

  // Сбрасываем зум при смене файла
  useEffect(() => {
    setIsZoomed(false);
  }, [file]);

  if (!file) return null;

  const fileUrl = `${serverURL}${file.fileUrl}`;

  return (
    <div 
      className={`fixed inset-0 bg-black z-50 flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out ${isVisible ? 'bg-opacity-80' : 'bg-opacity-0'}`}
      onClick={handleClose} // Закрытие по клику на фон
    >
        {/* Изображение с новыми классами и анимацией */}
        <img 
          src={fileUrl} 
          alt={file.fileName}
          className={`block rounded-lg shadow-2xl transition-all duration-300 ease-in-out ${
            isZoomed 
              ? 'max-w-none max-h-none cursor-zoom-out' 
              : 'h-auto max-h-[95vh] w-auto max-w-[95vw] cursor-zoom-in'
          } ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
          onClick={(e) => {
            e.stopPropagation();
            setIsZoomed(!isZoomed);
          }}
        />
      
      {/* Кнопки управления с анимацией */}
      <div className={`fixed bottom-4 right-4 flex gap-3 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              downloadFile(file);
            }}
            className="p-2 bg-black/50 text-white rounded-full hover:bg-black/80 transition-colors" 
            title="Скачать"
          >
            <ArrowDownCircleIcon className="h-7 w-7" />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }} 
            className="p-2 bg-black/50 text-white rounded-full hover:bg-black/80 transition-colors" 
            title="Закрыть (Esc)"
          >
            <XMarkIcon className="h-7 w-7" />
          </button>
      </div>
    </div>
  );
};

export default AttachmentModal; 