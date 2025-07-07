import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { FiTrash2 } from 'react-icons/fi';

const DeleteUserWithCodeModal = ({ isOpen, onClose, onConfirm, username, loading }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setCode('');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);
  
  const handleInputChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length <= 6) {
      setCode(value);
      setError('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Код должен состоять из 6 цифр.');
      return;
    }
    onConfirm(code);
  };
  
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <h2 className="text-xl font-bold mb-2">Удаление <span className="text-red-600">{username}</span></h2>
          <p className="text-sm text-gray-600 mb-4">
            Вам в Telegram был отправлен 6-значный код подтверждения. Введите его для завершения удаления.
          </p>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4" role="alert">
              <span>{error}</span>
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="confirmationCode" className="block text-sm font-medium text-gray-700 mb-1">
              Код подтверждения
            </label>
            <input
              ref={inputRef}
              type="tel"
              id="confirmationCode"
              value={code}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-center text-2xl tracking-[.5em]"
              placeholder="••••••"
              maxLength="6"
              autoComplete="one-time-code"
            />
          </div>
          
          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center disabled:bg-red-300 disabled:cursor-not-allowed"
            >
              <FiTrash2 className="w-4 h-4 mr-2" />
              {loading ? 'Удаление...' : 'Удалить'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default DeleteUserWithCodeModal; 