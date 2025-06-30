import React, { useState, useEffect, useRef } from 'react';
import { Ban } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const BanUserModal = ({ isOpen, onClose, onConfirm, username }) => {
  const { currentUser } = useAuth();
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState(24);
  const [timeUnit, setTimeUnit] = useState('hours'); // hours, days, months
  const [isPermanent, setIsPermanent] = useState(false);
  const [error, setError] = useState('');
  const modalRef = useRef(null);
  
  const isModeratorOnly = currentUser?.roles?.moderator && !currentUser?.roles?.admin;
  const isAdmin = currentUser?.roles?.admin;
  
  // Единицы времени
  const timeUnits = [
    { value: 'hours', label: 'Часов', multiplier: 1 },
    { value: 'days', label: 'Дней', multiplier: 24 },
    { value: 'months', label: 'Месяцев', multiplier: 720 } // 30 дней * 24 часа
  ];
  
  // Получить максимальное значение для текущей единицы времени
  const getMaxValueForUnit = () => {
    const unit = timeUnits.find(u => u.value === timeUnit);
    const maxHours = isModeratorOnly ? 72 : 87600;
    return Math.floor(maxHours / unit.multiplier);
  };
  
  // Преобразовать в часы
  const getDurationInHours = () => {
    const unit = timeUnits.find(u => u.value === timeUnit);
    return duration * unit.multiplier;
  };
  
  // Сброс состояния при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      setReason('');
      setDuration(24);
      setTimeUnit('hours');
      setIsPermanent(false);
      setError('');
      if (modalRef.current) {
        modalRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [isOpen]);
  
  // Валидация при смене единицы времени
  useEffect(() => {
    const maxValue = getMaxValueForUnit();
    if (duration > maxValue) {
      setDuration(maxValue);
    }
  }, [timeUnit, duration, isModeratorOnly]);
  
  const handleSubmit = () => {
    if (!reason.trim()) {
      setError('Причина бана обязательна');
      return;
    }
    
    if (reason.trim().length < 5) {
      setError('Причина должна содержать минимум 5 символов');
      return;
    }
    
    if (!isPermanent && duration < 1) {
      setError('Длительность должна быть больше 0');
      return;
    }
    
    const durationInHours = getDurationInHours();
    if (isModeratorOnly && durationInHours > 72) {
      setError('Модераторы могут банить максимум на 72 часа');
      return;
    }
    
    const finalDuration = isPermanent ? null : durationInHours;
    onConfirm(reason.trim(), finalDuration);
    setError('');
  };
  
  const handlePresetClick = (presetValue) => {
    setDuration(presetValue);
    setIsPermanent(false);
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      ref={modalRef}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-auto my-8 transform transition-all duration-300 scale-100" onClick={(e) => e.stopPropagation()}>
        {/* Заголовок */}
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
              <Ban className="w-3 h-3 text-red-600" />
            </span>
            Бан пользователя <span className="text-blue-600">{username}</span>
          </h3>
        </div>
        
        <div className="px-5 py-4 space-y-4">
          {/* Ошибка */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          
          {/* Причина */}
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
              Причина <span className="text-red-500">*</span>
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all duration-200 resize-none text-sm"
              rows="2"
              placeholder="Укажите причину блокировки..."
              maxLength={200}
            />
            <p className="text-xs text-gray-500 mt-1">{reason.length}/200</p>
          </div>
          
          {/* Длительность */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Длительность</label>
            
            {!isPermanent && (
              <div className="flex gap-2 mb-3">
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Math.max(1, Math.min(Number(e.target.value), getMaxValueForUnit())))}
                  className="flex-1 rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-sm"
                  min="1"
                  max={getMaxValueForUnit()}
                  placeholder="Введите число"
                />
                <select
                  value={timeUnit}
                  onChange={(e) => setTimeUnit(e.target.value)}
                  className="w-24 rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-sm bg-white"
                >
                  {timeUnits.map((unit) => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {/* Перманентная блокировка (только для админов) */}
            {isAdmin && (
              <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-200">
                <input
                  type="checkbox"
                  id="permanent"
                  checked={isPermanent}
                  onChange={(e) => setIsPermanent(e.target.checked)}
                  className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <label htmlFor="permanent" className="text-sm font-medium text-red-800">
                  Перманентная блокировка
                </label>
              </div>
            )}
            
            {!isPermanent && (
              <p className="text-xs text-gray-500 mt-2">
                {isModeratorOnly ? 'Максимум: 72 часа (3 дня)' : 'Ваша роль: Администратор'}
              </p>
            )}
          </div>
        </div>
        
        {/* Кнопки действий */}
        <div className="px-5 py-3 bg-gray-50 rounded-b-2xl flex justify-end gap-2">
          <button
            type="button"
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all duration-200"
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            type="button"
            className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-200 flex items-center gap-1"
            onClick={handleSubmit}
          >
            <Ban className="w-3 h-3" />
            Заблокировать
          </button>
        </div>
      </div>
    </div>
  );
};

export default BanUserModal;