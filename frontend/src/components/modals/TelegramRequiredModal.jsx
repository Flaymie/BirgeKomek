import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { XMarkIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';
import Modal from './Modal';

const TelegramRequiredModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const goToProfile = () => {
    onClose();
    navigate('/profile');
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
          <ShieldExclamationIcon className="h-8 w-8 text-blue-600" aria-hidden="true" />
        </div>
        
        <h3 className="text-2xl font-bold text-gray-900">Требуется привязка Telegram</h3>
        
        <div className="mt-3 text-base text-gray-600">
          <p>Для доступа к этой функции необходимо привязать ваш Telegram-аккаунт. Это обеспечивает безопасность и позволяет отправлять важные уведомления.</p>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row-reverse gap-3">
          <button
            type="button"
            className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-6 py-3 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto"
            onClick={goToProfile}
          >
            Привязать в профиле
          </button>
          <button
            type="button"
            className="w-full inline-flex justify-center rounded-xl border border-gray-300 shadow-sm px-6 py-3 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto"
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 rounded-full">
            <XMarkIcon className="h-6 w-6" />
        </button>
      </motion.div>
    </Modal>
  );
};

export default TelegramRequiredModal; 