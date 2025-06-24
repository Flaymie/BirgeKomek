import React from 'react';
import Modal from 'react-modal';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel={title || 'Подтверждение удаления'}
      className="modal-content"
      overlayClassName="modal-overlay"
      appElement={document.getElementById('root')}
    >
      <div className="p-6">
        <h3 className="text-xl font-bold mb-4">{title || 'Подтверждение'}</h3>
        <p className="mb-6 text-gray-600">{message || 'Вы уверены?'}</p>
        <div className="flex justify-end gap-3">
          <button 
            className="btn-secondary"
            onClick={onClose}
          >
            Отмена
          </button>
          <button 
            className="btn-danger"
            onClick={onConfirm}
          >
            Удалить
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteConfirmationModal; 