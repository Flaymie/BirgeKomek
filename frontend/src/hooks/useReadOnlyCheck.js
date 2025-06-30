import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import TelegramRequiredModal from '../components/modals/TelegramRequiredModal';

export const useReadOnlyCheck = () => {
  const { isReadOnly } = useAuth();
  const [showModal, setShowModal] = useState(false);

  const checkAndShowModal = () => {
    if (isReadOnly) {
      setShowModal(true);
      return true; // Возвращаем true, если пользователь "только для чтения"
    }
    return false; // Возвращаем false, если все в порядке
  };

  const ReadOnlyModal = () => (
    // Динамический импорт, чтобы не грузить модалку без надобности
    <React.Suspense fallback={<div/>}>
      {showModal && <TelegramRequiredModal isOpen={showModal} onClose={() => setShowModal(false)} />}
    </React.Suspense>
  );

  return { checkAndShowModal, ReadOnlyModalComponent: ReadOnlyModal };
}; 