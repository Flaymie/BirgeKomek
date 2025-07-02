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
    
    let finalDuration;
    if (isPermanent) {
      finalDuration = 'permanent';
    } else {
      const unitChar = timeUnit.charAt(0); // 'h' for hours, 'd' for days, 'm' for months
      // Для месяцев используем 'M', так как 'm' может быть для минут в будущем
      const finalUnitChar = unitChar === 'm' ? 'M' : unitChar;
      finalDuration = `${duration}${finalUnitChar}`;
    }
    
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-auto my-8 transform transition-all duration-300 scale-100 border border-gray-100">
        {/* Градиентный заголовок */}
        <div className="px-5 py-5 rounded-t-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 flex items-center gap-3 mb-2 shadow-sm">
          <span className="w-9 h-9 bg-white bg-opacity-20 rounded-full flex items-center justify-center shadow-md">
            <Ban className="w-5 h-5 text-white" />
          </span>
          <h3 className="text-lg font-extrabold text-white tracking-wide select-none">
            Бан пользователя <span className="text-yellow-200">{username}</span>
          </h3>
        </div>
        <div className="px-6 py-6 space-y-5">
          {/* Ошибка */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-center gap-2 animate-pulse">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          {/* Причина */}
          <div>
            <label htmlFor="reason" className="block text-sm font-semibold text-gray-700 mb-1">
              Причина <span className="text-red-500">*</span>
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-gray-300 shadow-sm focus:border-pink-400 focus:ring-2 focus:ring-pink-100 transition-all duration-200 resize-none text-base p-3"
              rows="2"
              placeholder="Укажите причину блокировки..."
              maxLength={200}
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{reason.length}/200</p>
          </div>
          {/* Длительность */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Длительность</label>
            {!isPermanent && (
              <div className="flex gap-2 mb-3">
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Math.max(1, Math.min(Number(e.target.value), getMaxValueForUnit()))) }
                  className="flex-1 rounded-xl border border-gray-300 shadow-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-100 text-base p-2"
                  min="1"
                  max={getMaxValueForUnit()}
                  placeholder="Введите число"
                />
                <select
                  value={timeUnit}
                  onChange={(e) => setTimeUnit(e.target.value)}
                  className="w-28 rounded-xl border border-gray-300 shadow-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-100 text-base bg-white p-2"
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
              <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-red-100 to-red-50 rounded-xl border border-red-200 mt-2 animate-pulse">
                <input
                  type="checkbox"
                  id="permanent"
                  checked={isPermanent}
                  onChange={(e) => setIsPermanent(e.target.checked)}
                  className="h-5 w-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <label htmlFor="permanent" className="text-base font-semibold text-red-700 select-none">
                  Перманентная блокировка
                </label>
              </div>
            )}
            {!isPermanent && (
              <p className="text-xs text-gray-400 mt-2">
                {isModeratorOnly ? 'Максимум: 72 часа (3 дня)' : 'Ваша роль: Администратор'}
              </p>
            )}
          </div>
        </div>
        {/* Кнопки действий */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-2xl flex justify-end gap-3 border-t border-gray-100">
          <button
            type="button"
            className="px-5 py-2 text-base font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all duration-200 shadow-sm"
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            type="button"
            className="px-5 py-2 text-base font-bold text-white bg-gradient-to-r from-pink-500 to-purple-600 border-none rounded-lg hover:from-pink-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all duration-200 flex items-center gap-2 shadow-lg hover:scale-105"
            onClick={handleSubmit}
          >
            <Ban className="w-4 h-4" />
            Заблокировать
          </button>
        </div>
      </div>
    </div>
  );
};

export default BanUserModal;