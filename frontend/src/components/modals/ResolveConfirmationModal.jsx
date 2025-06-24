import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/solid';

const ResolveConfirmationModal = ({ isOpen, onClose, onConfirm, onReject }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-auto"
          onClick={(e) => e.stopPropagation()}
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Подтверждение решения</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <p className="text-gray-600 mb-6">
              Ваш вопрос был решен? Если да, вы сможете оценить работу помощника. Если нет, заявка будет снова открыта для поиска нового специалиста, а текущий чат будет архивирован.
            </p>

            <div className="flex justify-end gap-4">
              <button
                onClick={onReject}
                className="px-6 py-2 rounded-md text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 transition-all"
              >
                Нет, нужен другой хелпер
              </button>
              <button
                onClick={onConfirm}
                className="px-6 py-2 rounded-md text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition-all"
              >
                Да, вопрос решен
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ResolveConfirmationModal; 