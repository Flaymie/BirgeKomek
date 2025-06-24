import React, { useState } from 'react';
import Modal from 'react-modal';

const AdminDeleteRequestModal = ({ isOpen, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (!reason.trim()) {
      setError('Причина удаления обязательна.');
      return;
    }
    onConfirm(reason);
  };

  const handleClose = () => {
    setReason('');
    setError('');
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleClose}
      contentLabel="Причина удаления заявки"
      className="modal-content"
      overlayClassName="modal-overlay"
    >
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900">Удаление заявки</h2>
        <p className="mb-4 text-gray-600">
          Пожалуйста, укажите причину удаления заявки. Пользователь получит уведомление.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Например: 'Дубликат', 'Нарушение правил'..."
          className={`w-full p-2 border rounded-md ${error ? 'border-red-500' : 'border-gray-300'}`}
          rows="3"
        />
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        <div className="flex justify-end gap-4 mt-6">
          <button onClick={handleClose} className="btn-secondary">
            Отмена
          </button>
          <button onClick={handleConfirm} className="btn-danger">
            Удалить
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AdminDeleteRequestModal;
