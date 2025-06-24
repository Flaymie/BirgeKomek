import React, { useEffect, useState } from 'react';
import { serverURL } from '../../services/api';
import { ArrowDownCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { downloadFile } from '../../services/downloadService';

const AttachmentModal = ({ file, onClose }) => {
  const [isZoomed, setIsZoomed] = useState(false);

  // Закрытие по клавише Escape, с учетом зума
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (isZoomed) {
          setIsZoomed(false); // Сначала убираем зум
        } else {
          onClose(); // Потом закрываем
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose, isZoomed]);

  // Сбрасываем зум при смене файла
  useEffect(() => {
    setIsZoomed(false);
  }, [file]);

  if (!file) return null;

  const fileUrl = `${serverURL}${file.fileUrl}`;

  return (
    // Backdrop. Он ловит клики для закрытия. Теперь всегда скроллится, если нужно.
    <div 
      className="fixed inset-0 bg-black bg-opacity-80 z-50 overflow-auto" 
      onClick={onClose}
    >
      {/* Контейнер для центрирования и скролла */}
      <div className="min-h-full w-full flex items-center justify-center p-4">
        {/* Само изображение с логикой зума */}
        <img 
          src={fileUrl} 
          alt={file.fileName}
          className={`block rounded-lg shadow-2xl transition-all duration-200 ${isZoomed ? 'max-w-none max-h-none cursor-zoom-out' : 'max-w-[90vw] max-h-[95vh] md:max-w-[45vw] md:max-h-[50vh] object-contain cursor-zoom-in'}`}
          onClick={(e) => {
            e.stopPropagation();
            setIsZoomed(!isZoomed);
          }}
        />
      </div>
      
      {/* Кнопки управления. Позиционируются абсолютно относительно всего экрана. */}
      <div className="fixed bottom-4 right-4 flex gap-3">
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
              onClose();
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