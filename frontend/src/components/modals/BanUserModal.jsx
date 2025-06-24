import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const BanUserModal = ({ isOpen, onClose, onConfirm, username }) => {
  const { currentUser } = useAuth();
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState(24); // в часах
  const [isPermanent, setIsPermanent] = useState(false);
  const [error, setError] = useState('');
  
  const isModeratorOnly = currentUser?.roles?.moderator && !currentUser?.roles?.admin;
  
  const handleSubmit = () => {
    if (!reason) {
      setError('Причина бана обязательна');
      return;
    }
    
    // Длительность бана: null для перманентного, иначе - значение в часах
    const finalDuration = isPermanent ? null : duration;
    onConfirm(reason, finalDuration);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
        <h3 className="text-xl font-bold mb-4">Заблокировать пользователя <span className="text-indigo-600">{username}</span></h3>
        
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        
        <div className="mb-4">
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">Причина</label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            rows="3"
            placeholder="Укажите причину блокировки..."
          ></textarea>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Срок блокировки</label>
          
          <div className="flex items-center mb-2">
            <input
              type="radio"
              id="temporary"
              name="banType"
              checked={!isPermanent}
              onChange={() => setIsPermanent(false)}
              className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
            />
            <label htmlFor="temporary" className="ml-2 block text-sm text-gray-900">Временная</label>
          </div>
          
          {!isPermanent && (
            <div className="ml-6 mb-2">
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                min="1"
                max={isModeratorOnly ? "72" : "87600"} // 72 часа для модераторов, 10 лет для админов
              />
              <p className="text-xs text-gray-500 mt-1">
                {isModeratorOnly ? 'Максимум 72 часа (3 дня).' : 'Срок в часах.'}
              </p>
            </div>
          )}
          
          {!isModeratorOnly && (
            <div className="flex items-center">
              <input
                type="radio"
                id="permanent"
                name="banType"
                checked={isPermanent}
                onChange={() => setIsPermanent(true)}
                className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
              />
              <label htmlFor="permanent" className="ml-2 block text-sm text-gray-900">Перманентная</label>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <button
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            onClick={handleSubmit}
          >
            Заблокировать
          </button>
        </div>
      </div>
    </div>
  );
};

export default BanUserModal; 