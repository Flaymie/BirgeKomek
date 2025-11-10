import React, { useState, useRef, useEffect } from 'react';

const AdminDeleteModal = ({ isOpen, onClose, onConfirm, requestTitle }) => {
  const [reason, setReason] = useState('');
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason);
      setReason('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[100]">
      <div ref={modalRef} className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-red-600">Подтверждение удаления</h2>
        <p className="mb-4">Вы собираетесь удалить заявку: <span className="font-semibold">{requestTitle}</span>.</p>
        <p className="mb-2">Это действие необратимо. Пожалуйста, укажите причину удаления. Автор получит уведомление.</p>
        <textarea
          className="w-full p-2 border rounded-md"
          rows="4"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Например: 'Заявка нарушает правила' или 'Дубликат существующей заявки'"
        />
        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="px-4 py-2 mr-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400">
            Отмена
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-300"
            disabled={!reason.trim()}
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDeleteModal; 
