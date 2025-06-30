import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaExclamationTriangle, FaTelegramPlane } from 'react-icons/fa';
import { XMarkIcon } from '@heroicons/react/24/solid';

const ReadOnlyBanner = () => {
  const { isReadOnly, user, loading } = useAuth();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (loading || !user) return;

    if (isReadOnly) {
      const dismissed = localStorage.getItem('readOnlyBannerDismissed') === 'true';
      if (!dismissed) {
        setIsVisible(true);
      }
    } else {
      // Если пользователь больше не в режиме "только чтение" (т.е. привязал телеграм),
      // сбрасываем состояние, чтобы баннер мог появиться в будущем.
      localStorage.removeItem('readOnlyBannerDismissed');
      setIsVisible(false);
    }
  }, [isReadOnly, loading, user]);

  const handleDismiss = (e) => {
    e.preventDefault();
    setIsVisible(false);
    localStorage.setItem('readOnlyBannerDismissed', 'true');
  };
  
  if (!isVisible) {
    return null;
  }

  return (
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md flex items-center justify-between" role="alert">
        <div className="flex items-center">
            <FaExclamationTriangle className="h-6 w-6 mr-3 flex-shrink-0" />
            <p className="font-bold">🚨 Вы не сможете отправлять сообщения или откликаться, пока не привяжете Telegram.</p>
        </div>
        <div className="flex items-center ml-4 flex-shrink-0">
            <button
              onClick={() => navigate('/profile')}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-md inline-flex items-center transition-colors text-sm"
            >
              <FaTelegramPlane className="mr-2 h-4 w-4" />
              <span>Привязать</span>
            </button>
            <button
                onClick={handleDismiss}
                className="ml-3 text-red-500 hover:text-red-800 p-1 rounded-full hover:bg-red-200 transition-colors"
                aria-label="Скрыть баннер"
            >
                <XMarkIcon className="h-5 w-5" />
            </button>
        </div>
    </div>
  );
};

export default ReadOnlyBanner; 