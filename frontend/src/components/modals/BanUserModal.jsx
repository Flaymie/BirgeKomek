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
        className="bg-white rounded-lg shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
              <Ban className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Блокировка пользователя</h3>
              <p className="text-sm text-gray-500">@{username}</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Role badge */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
              <Shield className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {isAdmin ? 'Администратор' : 'Модератор'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isModeratorOnly
                    ? 'Вы можете банить максимум на 72 часа'
                    : 'Полный доступ к управлению банами'}
                </p>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Reason */}
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1.5">
                Причина блокировки <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none text-sm p-3"
                  rows="3"
                  placeholder="Нарушение правил, спам, оскорбления..."
                  maxLength={200}
                />
                <span className="absolute bottom-2 right-2 text-xs text-gray-400">
                  {reason.length}/200
                </span>
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Длительность
              </label>

              {!isPermanent && (
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(Math.max(1, Math.min(Number(e.target.value), getMaxValueForUnit())))}
                    className="flex-1 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm px-3 py-2"
                    min="1"
                    max={getMaxValueForUnit()}
                  />
                  <select
                    value={timeUnit}
                    onChange={(e) => setTimeUnit(e.target.value)}
                    className="w-28 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm bg-white px-3 py-2"
                  >
                    {timeUnits.map((unit) => (
                      <option key={unit.value} value={unit.value}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {isAdmin && (
                <div
                  className={`mt-3 flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isPermanent
                    ? 'bg-red-50 border-red-200'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  onClick={() => setIsPermanent(!isPermanent)}
                >
                  <input
                    type="checkbox"
                    id="permanent"
                    checked={isPermanent}
                    onChange={(e) => setIsPermanent(e.target.checked)}
                    className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer"
                  />
                  <label htmlFor="permanent" className="flex-1 cursor-pointer">
                    <p className="text-sm font-medium text-gray-800">Перманентная блокировка</p>
                    <p className="text-xs text-gray-500 mt-0.5">Пользователь не сможет вернуться</p>
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-lg border-t border-gray-100">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 flex items-center gap-2"
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
