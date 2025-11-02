import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheckIcon, XMarkIcon } from '@heroicons/react/24/solid';

const ModeratorActionConfirmModal = ({ isOpen, onClose, onConfirm, actionTitle, isLoading, error }) => {
  const [code, setCode] = useState('');
  const modalRef = useRef(null);
  const [remainingAttempts, setRemainingAttempts] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setCode('');
      setRemainingAttempts(null);
      modalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isOpen]);

  useEffect(() => {
    // Извлекаем remainingAttempts из ошибки, если есть
    if (error && typeof error === 'object' && error.remainingAttempts !== undefined) {
      setRemainingAttempts(error.remainingAttempts);
    }
  }, [error]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code.trim()) {
      onConfirm(code.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
        <motion.div
          ref={modalRef}
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative"
        >
          <div className="flex flex-col items-center text-center">
            <ShieldCheckIcon className="w-16 h-16 text-yellow-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Требуется подтверждение</h2>
            <p className="text-gray-600 mb-6">
              Для выполнения действия <span className="font-semibold">"{actionTitle}"</span>, пожалуйста, введите код, отправленный вам в Telegram.
            </p>
            {remainingAttempts !== null && remainingAttempts < 3 && (
              <div className={`mb-4 p-3 rounded-lg ${remainingAttempts === 1 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                <p className="font-semibold">
                  ⚠️ Осталось попыток: {remainingAttempts}
                </p>
                <p className="text-sm mt-1">
                  {remainingAttempts === 1 
                    ? 'Последняя попытка! При неверном вводе аккаунт будет заблокирован на 7 дней.'
                    : 'После 3 неудачных попыток аккаунт будет заблокирован из-за подозрения во взломе.'}
                </p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="w-full">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6-значный код"
                maxLength="6"
                className="w-full px-4 py-3 text-center text-2xl tracking-[.5em] font-mono bg-gray-100 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition"
                autoFocus
              />
              <div className="flex gap-4 mt-6 w-full">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={!code || code.length < 6 || isLoading}
                  className="w-full px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:bg-yellow-300 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading ? 'Проверка...' : 'Подтвердить'}
                </button>
              </div>
            </form>
          </div>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ModeratorActionConfirmModal; 