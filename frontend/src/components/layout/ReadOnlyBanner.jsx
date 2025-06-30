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
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 sticky top-0 z-50" role="alert">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <FaExclamationTriangle className="h-6 w-6 mr-3" />
          <div>
            <p className="font-bold">🚨 Вы не сможете отправлять сообщения или откликаться, пока не привяжете Telegram.</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/profile')}
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded inline-flex items-center transition-colors"
        >
          <FaTelegramPlane className="mr-2" />
          <span>Привязать Telegram</span>
        </button>
      </div>
    </div>
  );
};

export default ReadOnlyBanner; 