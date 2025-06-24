import React from 'react';

const BannedUserModal = ({ isOpen, reason, onConfirm, moderator = null, banEndDate = null }) => {
  if (!isOpen) return null;

  // Форматирование даты окончания бана, если она предоставлена
  const formattedEndDate = banEndDate ? new Date(banEndDate).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : null;

  return (
    <div 
      className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center z-[9999]"
      aria-labelledby="banned-modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full text-center transform transition-all animate-fadeIn scale-100">
        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
          <svg className="h-10 w-10 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>

        <h2 id="banned-modal-title" className="text-3xl font-extrabold text-gray-900">
          Ваш аккаунт заблокирован
        </h2>

        <div className="mt-4 text-gray-600">
          <p className="text-lg">Доступ к платформе ограничен.</p>
          
          <div className="mt-6 bg-red-50 p-4 rounded-lg border border-red-200">
            {reason && (
              <div className="mb-3">
                <p className="font-semibold text-red-800">Причина блокировки:</p>
                <p className="text-md text-red-700 mt-1">{reason}</p>
              </div>
            )}
            
            {moderator && (
              <div className="mb-3">
                <p className="font-semibold text-red-800">Заблокировал:</p>
                <p className="text-md text-red-700 mt-1">{moderator}</p>
              </div>
            )}
            
            {formattedEndDate && (
              <div>
                <p className="font-semibold text-red-800">Срок блокировки до:</p>
                <p className="text-md text-red-700 mt-1">{formattedEndDate}</p>
              </div>
            )}
            
            {!formattedEndDate && (
              <div className="mt-2">
                <p className="text-sm text-red-700 italic">Блокировка постоянная</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={onConfirm}
            type="button"
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-6 py-3 bg-red-600 text-lg font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-300"
          >
            Выйти из аккаунта
          </button>
        </div>
      </div>
    </div>
  );
};

export default BannedUserModal; 