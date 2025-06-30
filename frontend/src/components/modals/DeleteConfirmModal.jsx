import React, { useState, useEffect, useRef } from 'react';

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, isLoading }) => {
  const [code, setCode] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setCode('');
      // Фокус на инпуте при открытии
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleConfirmClick = () => {
    if (code.length === 6 && !isLoading) {
      onConfirm(code);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length <= 6) {
      setCode(value);
    }
  };
  
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl transform transition-all">
        <h3 className="text-xl font-bold mb-4 text-gray-800">Подтвердите удаление</h3>
        <p className="mb-4 text-gray-600">
          Мы отправили 6-значный код в ваш Telegram. Введите его ниже, чтобы навсегда удалить свой аккаунт.
        </p>
        <div className="my-6">
            <label htmlFor="confirmationCode" className="block text-sm font-medium text-gray-700 mb-2">Код подтверждения</label>
            <input
                ref={inputRef}
                type="text"
                id="confirmationCode"
                value={code}
                onChange={handleInputChange}
                className="w-full px-4 py-3 text-center text-2xl tracking-[.5em] font-mono bg-gray-100 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                placeholder="------"
                maxLength="6"
                disabled={isLoading}
            />
        </div>
        <div className="flex justify-end gap-4 mt-6">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={handleConfirmClick}
            disabled={isLoading || code.length !== 6}
            className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-400 disabled:cursor-not-allowed flex items-center"
          >
            {isLoading && (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            )}
            {isLoading ? 'Удаление...' : 'Удалить навсегда'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;

