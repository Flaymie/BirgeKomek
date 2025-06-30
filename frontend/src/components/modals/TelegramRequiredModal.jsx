import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaTelegramPlane } from 'react-icons/fa';

const TelegramRequiredModal = ({ show, handleClose }) => {
  const navigate = useNavigate();

  const goToProfile = () => {
    handleClose();
    navigate('/profile');
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <FaTelegramPlane className="me-2" /> Необходимо привязать Telegram
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>Для выполнения этого действия ваш аккаунт должен быть привязан к Telegram.</p>
        <p>Это нужно для получения уведомлений и обеспечения безопасности.</p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Закрыть
        </Button>
        <Button variant="primary" onClick={goToProfile}>
          Привязать в профиле
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default TelegramRequiredModal; 