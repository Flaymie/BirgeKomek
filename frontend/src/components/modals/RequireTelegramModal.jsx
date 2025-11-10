import React, { useRef, useEffect } from 'react';
import { FaTelegramPlane } from 'react-icons/fa';

const RequireTelegramModal = ({ isOpen, onLinkTelegram }) => {
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
    <div
      className="fixed inset-0 bg-black bg-opacity-80 flex items-start justify-center z-[100] pt-20 md:pt-24 overflow-y-auto"
    >
      <div ref={modalRef} className="bg-white rounded-lg shadow-xl p-8 w-full max-w-lg mx-4">
        <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <FaTelegramPlane className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Требуется привязка Telegram</h2>
            <p className="text-gray-600 mb-6">
                Для обеспечения безопасности вашего аккаунта с расширенными правами (администратор/модератор) необходимо привязать свой Telegram.
            </p>
            <p className="text-sm text-gray-500 mb-6">
                Это необходимо для получения важных уведомлений и двухфакторной аутентификации в будущем.
            </p>
            <button
                onClick={onLinkTelegram}
                className="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition-all duration-300 flex items-center justify-center text-base"
            >
                <FaTelegramPlane className="w-5 h-5 mr-2" />
                Привязать Telegram
            </button>
        </div>
      </div>
    </div>
  );
};

export default RequireTelegramModal; 
