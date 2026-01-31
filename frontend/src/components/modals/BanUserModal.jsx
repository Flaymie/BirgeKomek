import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Ban, Clock, AlertTriangle, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Modal from './Modal';
import { SafeMotionDiv } from '../shared/SafeMotion';

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
  const timeUnits = React.useMemo(() => [
    { value: 'hours', label: 'Часов', multiplier: 1 },
    { value: 'days', label: 'Дней', multiplier: 24 },
    { value: 'months', label: 'Месяцев', multiplier: 720 }
  ], []);

  // Получить максимальное значение для текущей единицы времени
  const getMaxValueForUnit = useCallback(() => {
    const unit = timeUnits.find(u => u.value === timeUnit);
    const maxHours = isModeratorOnly ? 72 : 87600;
    return Math.floor(maxHours / unit.multiplier);
  }, [timeUnit, isModeratorOnly, timeUnits]);

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
  }, [timeUnit, duration, isModeratorOnly, getMaxValueForUnit]);

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
      const unitChar = timeUnit.charAt(0);
      const finalUnitChar = unitChar === 'm' ? 'M' : unitChar;
      finalDuration = `${duration}${finalUnitChar}`;
    }

    onConfirm(reason.trim(), finalDuration);
    setError('');
  };


  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <SafeMotionDiv
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Градиентный заголовок */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-red-500 via-red-600 to-red-700 rounded-t-2xl overflow-hidden">
          {/* Декоративные элементы */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12"></div>

          <div className="relative flex items-center gap-3">
            <div className="w-12 h-12 bg-white bg-opacity-20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
              <Ban className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Блокировка пользователя</h3>
              <p className="text-red-100 text-sm mt-0.5">@{username}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Предупреждение о роли */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">
                {isAdmin ? 'Администратор' : 'Модератор'}
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                {isModeratorOnly
                  ? 'Вы можете банить пользователей максимум на 72 часа'
                  : 'У вас есть полный доступ к управлению банами'}
              </p>
            </div>
          </div>

          {/* Ошибка */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3 animate-shake">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Причина */}
          <div>
            <label htmlFor="reason" className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center">
                <span className="text-indigo-600 text-xs">📝</span>
              </span>
              Причина блокировки <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border-2 border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all duration-200 resize-none text-sm p-3"
                rows="3"
                placeholder="Например: Нарушение правил сообщества, спам, оскорбления..."
                maxLength={200}
              />
              <div className="absolute bottom-2 right-2 text-xs text-gray-400 bg-white px-2 py-1 rounded-md">
                {reason.length}/200
              </div>
            </div>
          </div>

          {/* Длительность */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-purple-600" />
              </span>
              Длительность блокировки
            </label>

            {/* Кастомная длительность */}
            {!isPermanent && (
              <div className="flex gap-2">
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Math.max(1, Math.min(Number(e.target.value), getMaxValueForUnit())))}
                  className="flex-1 rounded-xl border-2 border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm px-4 py-2.5 font-medium"
                  min="1"
                  max={getMaxValueForUnit()}
                  placeholder="Введите число"
                />
                <select
                  value={timeUnit}
                  onChange={(e) => setTimeUnit(e.target.value)}
                  className="w-28 rounded-xl border-2 border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm bg-white px-3 py-2.5 font-medium"
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
              <div className="mt-4 relative overflow-hidden">
                <div className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer ${isPermanent
                  ? 'bg-gradient-to-r from-red-50 to-pink-50 border-red-300'
                  : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setIsPermanent(!isPermanent)}
                >
                  <input
                    type="checkbox"
                    id="permanent"
                    checked={isPermanent}
                    onChange={(e) => setIsPermanent(e.target.checked)}
                    className="h-5 w-5 text-red-600 border-gray-300 rounded-lg focus:ring-red-500 cursor-pointer"
                  />
                  <label htmlFor="permanent" className="flex-1 cursor-pointer">
                    <p className="text-sm font-semibold text-gray-900">Перманентная блокировка</p>
                    <p className="text-xs text-gray-600 mt-0.5">Пользователь не сможет вернуться</p>
                  </label>
                  {isPermanent && (
                    <Ban className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Кнопки действий */}
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-b-2xl flex justify-end gap-3 border-t border-gray-200">
          <button
            type="button"
            className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all duration-200 shadow-sm"
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            type="button"
            className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 border-2 border-red-600 rounded-xl hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-200 flex items-center gap-2 shadow-lg shadow-red-200 hover:shadow-xl hover:shadow-red-300"
            onClick={handleSubmit}
          >
            <Ban className="w-4 h-4" />
            Заблокировать
          </button>
        </div>
      </SafeMotionDiv>
    </Modal>
  );
};

export default BanUserModal;
