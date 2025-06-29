import React, { useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaTelegramPlane } from 'react-icons/fa';
import './TelegramRequiredModal.css';

const TelegramRequiredModal = ({ show, onClose }) => {
  const navigate = useNavigate();
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  };

  const handleLinkTelegram = () => {
    handleClose();
    setTimeout(() => navigate('/profile/settings'), 350);
  };

  return (
    <Modal 
      show={show} 
      onHide={handleClose} 
      centered
      className={`telegram-required-modal ${isClosing ? 'closing' : ''}`}
    >
      <Modal.Header closeButton>
        <Modal.Title>Требуется Telegram</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="text-center mb-4">
          <FaTelegramPlane className="telegram-logo mb-3" />
          <h5>Действие недоступно</h5>
          <p className="text-muted">
            Для выполнения этого действия необходимо привязать аккаунт Telegram к вашему профилю.
          </p>
          <p>
            Привязка Telegram позволяет:
          </p>
          <ul className="text-start">
            <li>Создавать запросы о помощи</li>
            <li>Отправлять сообщения в чате</li>
            <li>Откликаться на запросы других пользователей</li>
            <li>Получать уведомления о важных событиях</li>
          </ul>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Позже
        </Button>
        <Button variant="primary" onClick={handleLinkTelegram}>
          Привязать Telegram
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default TelegramRequiredModal; 