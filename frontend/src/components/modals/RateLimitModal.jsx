import React from 'react';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import Modal from './Modal';

const RateLimitModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative bg-white rounded-2xl shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Заголовок */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="bg-red-100 text-red-600 p-2.5 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Слишком много запросов</h3>
              <p className="text-sm text-gray-500">Превышен лимит действий</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 p-2 rounded-full"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Контент */}
        <div className="p-5">
          <p className="text-gray-700">
            Вы совершили слишком много действий за короткое время. Пожалуйста, подождите несколько минут и попробуйте снова.
          </p>
        </div>

        {/* Кнопка */}
        <div className="flex justify-end p-5 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          >
            Понятно
          </button>
        </div>
      </motion.div>
    </Modal>
  );
};

export default RateLimitModal; 
