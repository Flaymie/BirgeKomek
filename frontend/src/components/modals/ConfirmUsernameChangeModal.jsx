import React, { useEffect, useRef } from 'react';
import Modal from './Modal';

const ConfirmUsernameChangeModal = ({ isOpen, onClose, onConfirm, newUsername }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isOpen]);
  
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-[100] pt-20 md:pt-24 overflow-y-auto">
      <div ref={modalRef} className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <h3 className="text-xl font-bold mb-4 text-gray-900">Подтвердите смену никнейма</h3>
        <p className="mb-4">
          Вы собираетесь сменить свой никнейм на <strong className="font-semibold text-indigo-600">{newUsername}</strong>.
        </p>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
            <p className="text-sm text-yellow-800">
                <strong>Внимание:</strong> Вы сможете снова изменить никнейм только через 30 дней.
            </p>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Подтвердить
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmUsernameChangeModal; 
