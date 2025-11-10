import React, { useEffect, useState, useCallback } from 'react';
import Modal from './Modal';
import { serverURL } from '../../services/api';
import { ArrowDownCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { downloadFile } from '../../services/downloadService';

const AttachmentModal = ({ file, onClose }) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (file) {
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    }
  }, [file]);
  
  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (isZoomed) {
          setIsZoomed(false);
        } else {
          handleClose();
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isZoomed, handleClose]);

  useEffect(() => {
    setIsZoomed(false);
  }, [file]);

  if (!file) return null;

  const fileUrl = file.fileUrl.startsWith('http') ? file.fileUrl : `${serverURL}${file.fileUrl}`;

  return (
    <Modal isOpen={!!file} onClose={handleClose}>
      <div
        className={`w-screen h-screen flex items-center justify-center p-4 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      >
        <div className="relative">
          {/* Изображение с центровкой и ограничениями */}
          <img
            src={fileUrl}
            alt={file.fileName}
            className={`block rounded-lg shadow-2xl transition-opacity duration-200 ${
              isVisible ? 'opacity-100' : 'opacity-0'
            } max-w-[90vw] max-h-[85vh] object-contain`}
            onClick={(e) => e.stopPropagation()}
          />

          {/* Кнопки управления */}
          <div className="absolute -top-3 -right-3 flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                downloadFile(file);
              }}
              className="p-2 bg-white text-gray-800 rounded-full shadow hover:bg-gray-100 transition-colors"
              title="Скачать"
            >
              <ArrowDownCircleIcon className="h-6 w-6" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="p-2 bg-white text-gray-800 rounded-full shadow hover:bg-gray-100 transition-colors"
              title="Закрыть (Esc)"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AttachmentModal; 
