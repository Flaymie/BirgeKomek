import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaExclamationTriangle, FaTelegramPlane } from 'react-icons/fa';

const ReadOnlyBanner = () => {
  const { isReadOnly, user, loading } = useAuth();
  const navigate = useNavigate();

  // Не показывать баннер, пока грузятся данные о юзере или если он не залогинен
  if (loading || !user) {
    return null;
  }

  // Не показывать, если всё привязано
  if (!isReadOnly) {
    return null;
  }

  return (
    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 sticky top-0 z-50" role="alert">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <FaExclamationTriangle className="h-6 w-6 mr-3" />
          <div>
            <p className="font-bold">Режим "только для чтения"</p>
            <p className="text-sm">Ваш аккаунт не привязан к Telegram. Функционал ограничен.</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/profile')}
          className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded inline-flex items-center transition-colors"
        >
          <FaTelegramPlane className="mr-2" />
          <span>Привязать</span>
        </button>
      </div>
    </div>
  );
};

export default ReadOnlyBanner; 