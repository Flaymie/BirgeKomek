import React, { useState, useRef, useEffect } from 'react';
import useLockBodyScroll from '../../hooks/useLockBodyScroll';

const AdminEditModal = ({ isOpen, onClose, onConfirm, requestTitle }) => {
  useLockBodyScroll(isOpen);
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
        <h2 className="text-xl font-bold mb-4">Редактирование заявки</h2>
        <p className="mb-4">Вы собираетесь отредактировать заявку: <span className="font-semibold">{requestTitle}</span>.</p>
        <p className="mb-2">Пожалуйста, укажите причину редактирования. Эта причина будет отправлена автору в уведомлении.</p>
        <textarea
          className="w-full p-2 border rounded-md"
          rows="4"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Например: 'Уточнение деталей' или 'Корректировка заголовка'"
        />
        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="px-4 py-2 mr-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400">
            Отмена
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
            disabled={!reason.trim()}
          >
            Подтвердить и сохранить
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminEditModal; 
