import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { motion, AnimatePresence } from 'framer-motion';

const DeleteAccountModal = ({ isOpen, onClose, onConfirm, username, isLoading }) => {
  const [confirmationText, setConfirmationText] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    if (username) {
      setIsConfirmed(confirmationText.trim().toLowerCase() === username.toLowerCase());
    } else {
      setIsConfirmed(false);
    }
  }, [confirmationText, username]);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm();
    }
  }

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-black bg-opacity-75 flex items-start justify-center z-[100] pt-20 md:pt-24 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl font-bold text-red-600 mb-4">Удаление аккаунта</h2>
          <p className="text-gray-600 mb-4">
            Это действие <span className="font-bold">необратимо</span>. Все ваши заявки,
            отзывы и другая информация будут безвозвратно удалены.
          </p>
          <p className="text-gray-600 mb-4">
            Для подтверждения, пожалуйста, введите ваш никнейм: <code className="font-mono bg-red-100 text-red-800 px-2 py-1 rounded-md text-sm">{username}</code>
          </p>

          <input
            type="text"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="Введите ваш никнейм"
          />

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isConfirmed || isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {isLoading && (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
              )}
              {isLoading ? 'Запрос...' : 'Я понимаю, удалить аккаунт'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DeleteAccountModal; 
