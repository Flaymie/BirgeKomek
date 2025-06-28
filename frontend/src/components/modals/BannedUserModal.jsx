import React, { useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import './BannedUserModal.css';

const BannedUserModal = ({ isOpen, onClose, banDetails }) => {
  const { logout } = useAuth();
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleLogout = () => {
    logout();
    onClose(); 
  };
  
  const banReason = banDetails.reason || 'Причина не указана.';
  const banExpiry = banDetails.expiresAt 
    ? new Date(banDetails.expiresAt).toLocaleString('ru-RU')
    : 'навсегда';

  return (
    <div
      ref={modalRef}
      className="banned-modal-overlay"
    >
      <div className="banned-modal-content">
        <h2 className="banned-modal-title">⛔️ Доступ ограничен ⛔️</h2>
        <p className="banned-modal-text">
          Ваш аккаунт был заблокирован.
        </p>
        <div className="banned-modal-reason">
          <p><strong>Причина:</strong> {banReason}</p>
          <p><strong>Срок блокировки:</strong> {banExpiry}</p>
        </div>
        <p className="banned-modal-contact">
          Если вы считаете, что это ошибка, свяжитесь с поддержкой.
        </p>
        <button 
          onClick={handleLogout} 
          className="banned-modal-button"
        >
          Выйти из аккаунта
        </button>
      </div>
    </div>
  );
};

export default BannedUserModal; 