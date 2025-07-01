import React, { useEffect, useRef } from 'react';
import Modal from './Modal';

const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, title, body }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div ref={modalRef} className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <h3 className="text-xl font-bold mb-4">{title || 'Подтверждение'}</h3>
        <p className="mb-6">{body || 'Вы уверены? Это действие нельзя отменить.'}</p>
        <div className="flex justify-end gap-3">
          <button 
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            onClick={onClose}
          >
            Отмена
          </button>
          <button 
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            onClick={onConfirm}
          >
            Подтвердить
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDeleteModal; 