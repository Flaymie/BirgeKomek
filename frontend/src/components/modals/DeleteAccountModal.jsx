import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DeleteAccountModal = ({ isOpen, onClose, onConfirm, username }) => {
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

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
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
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={onConfirm}
              disabled={!isConfirmed}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors"
            >
              Я понимаю, удалить аккаунт
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DeleteAccountModal; 