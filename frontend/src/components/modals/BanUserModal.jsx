import React, { useState, useEffect } from 'react';
import { Ban } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const BanUserModal = ({ isOpen, onClose, onConfirm, username }) => {
  const { currentUser } = useAuth();
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState(24);
  const [timeUnit, setTimeUnit] = useState('hours');
  const [isPermanent, setIsPermanent] = useState(false);
  const [error, setError] = useState('');

  const isModeratorOnly = currentUser?.roles?.moderator && !currentUser?.roles?.admin;
  const isAdmin = currentUser?.roles?.admin;

  const timeUnits = [
    { value: 'hours', label: 'Час(ов)', multiplier: 1 },
    { value: 'days', label: 'Дней', multiplier: 24 },
    { value: 'months', label: 'Месяц(ев)', multiplier: 720 },
  ];

  const getMaxValueForUnit = () => {
    const unit = timeUnits.find(u => u.value === timeUnit);
    const maxHours = isModeratorOnly ? 72 : 87600; // 72 часа для модера, 10 лет для админа
    return Math.floor(maxHours / unit.multiplier);
  };
  
  const getDurationInHours = () => {
    const unit = timeUnits.find(u => u.value === timeUnit);
    return duration * unit.multiplier;
  };

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setDuration(24);
      setTimeUnit('hours');
      setIsPermanent(false);
      setError('');
    }
  }, [isOpen]);
  
  useEffect(() => {
    const maxValue = getMaxValueForUnit();
    if (duration > maxValue) {
      setDuration(maxValue);
    }
  }, [timeUnit, duration, isModeratorOnly]);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!reason.trim()) {
      setError('Причина бана обязательна');
      return;
    }
    if (reason.trim().length < 5) {
      setError('Причина должна содержать минимум 5 символов');
      return;
    }
    if (!isPermanent && (duration < 1 || isNaN(duration))) {
      setError('Длительность должна быть положительным числом');
      return;
    }
    
    const durationInHours = getDurationInHours();
    if (isModeratorOnly && durationInHours > 72) {
      setError('Модераторы могут банить максимум на 72 часа');
      return;
    }
    
    let finalDuration;
    if (isPermanent) {
      finalDuration = 'permanent';
    } else {
      const unitChar = timeUnit === 'months' ? 'M' : timeUnit.charAt(0);
      finalDuration = `${duration}${unitChar}`;
    }
    onConfirm(reason.trim(), finalDuration);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <h2 className="text-xl font-bold mb-4">Заблокировать <span className="text-red-600">{username}</span></h2>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
              Причина <span className="text-red-500">*</span>
            </label>
            <textarea
              id="reason"
              rows="3"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Пример: нарушение правил, п. 3.4"
              maxLength={200}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Длительность</label>
            {!isPermanent && (
              <div className="flex gap-2">
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Math.max(1, Math.min(Number(e.target.value), getMaxValueForUnit())))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  min="1"
                  max={getMaxValueForUnit()}
                />
                <select
                  value={timeUnit}
                  onChange={(e) => setTimeUnit(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                  {timeUnits.map((unit) => (
                    <option key={unit.value} value={unit.value}>{unit.label}</option>
                  ))}
                </select>
              </div>
            )}
             {!isPermanent && (
              <p className="text-xs text-gray-500 mt-2">
                {isModeratorOnly ? 'Модераторы могут банить максимум на 3 дня (72 часа).' : ''}
              </p>
            )}
          </div>
          
          {isAdmin && (
            <div className="flex items-center p-3 rounded-md bg-red-50 border border-red-200">
              <input
                type="checkbox"
                id="permanent"
                checked={isPermanent}
                onChange={(e) => setIsPermanent(e.target.checked)}
                className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <label htmlFor="permanent" className="ml-2 block text-sm font-medium text-red-800">
                Заблокировать навсегда
              </label>
            </div>
          )}
          
          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
            >
              <Ban className="w-4 h-4 mr-2" />
              Заблокировать
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BanUserModal;