import React, { useState, useEffect } from 'react';
import { SafeMotionDiv } from '../shared/SafeMotion';
import { ShieldCheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Modal from './Modal';
import { authService } from '../../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

const IPVerificationModal = ({ isOpen, onClose, onSuccess, currentIP }) => {
  const { updateUser } = useAuth();
  const storeKey = `ip_ver_attempts_${currentIP || 'unknown'}`;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(3);
  const [remainingResends, setRemainingResends] = useState(3);
  const [resendCooldown, setResendCooldown] = useState(0);

  // При открытии модалки восстанавливаем попытки из sessionStorage для текущего IP
  useEffect(() => {
    if (isOpen) {
      const stored = sessionStorage.getItem(storeKey);
      if (stored !== null) {
        const parsed = parseInt(stored, 10);
        if (!Number.isNaN(parsed)) setRemainingAttempts(parsed);
      }
    }
  }, [isOpen, storeKey]);

  // Сохраняем remainingAttempts в sessionStorage при изменении
  useEffect(() => {
    sessionStorage.setItem(storeKey, remainingAttempts.toString());
  }, [remainingAttempts, storeKey]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendCooldown]);

  const requestCode = async () => {
    try {
      const response = await authService.verifyIP();
      setRemainingResends(response.data.remainingResends);
      if (typeof response.data.nextWaitTime === 'number' && response.data.nextWaitTime > 0) {
        setResendCooldown(response.data.nextWaitTime);
      }
      toast.success('Код подтверждения отправлен повторно в Telegram');
    } catch (error) {
      console.error('Ошибка отправки кода:', error);
      const errorData = error.response?.data;

      if (error.response?.status === 429) {
        setResendCooldown(errorData.waitTime || 60);
        toast.error(errorData.msg || 'Слишком частые запросы');
      } else {
        toast.error(errorData?.msg || 'Ошибка отправки кода');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (code.length !== 6) {
      toast.error('Код должен содержать 6 цифр');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.confirmIP(code);

      // Обрабатываем данные пользователя (как при обычном логине)
      updateUser(response.data.user);

      toast.success('Вход выполнен успешно!');
      setCode('');
      setRemainingAttempts(3);
      sessionStorage.removeItem(storeKey); // Очищаем при успехе
      onClose();
      onSuccess();
    } catch (error) {

      const errorData = error.response?.data;

      if (error.response?.status === 403) {
        // IP заблокирован
        toast.error('Ваш IP заблокирован на 24 часа из-за превышения количества попыток');
        setRemainingAttempts(0);
        sessionStorage.removeItem(storeKey);
        setTimeout(() => onClose(), 2000);
      } else {
        // Неверный код
        const newAttempts = errorData?.remainingAttempts ?? remainingAttempts - 1;
        setRemainingAttempts(newAttempts);
        toast.error(errorData?.msg || 'Неверный код');
        setCode('');

        if (newAttempts === 0) {
          setTimeout(() => onClose(), 2000);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setCode('');
    await requestCode();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <SafeMotionDiv
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
            <ShieldCheckIcon className="h-8 w-8 text-yellow-600" aria-hidden="true" />
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Подтверждение нового IP
          </h2>

          <p className="text-gray-600 mb-4">
            Обнаружен вход с нового IP адреса: <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{currentIP}</span>
          </p>

          <p className="text-gray-600 mb-6">
            Для продолжения работы введите код, отправленный вам в Telegram.
          </p>

          {remainingAttempts < 3 && (
            <div className={`mb-4 p-3 rounded-lg w-full ${remainingAttempts === 1 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
              <p className="font-semibold">
                ⚠️ Осталось попыток: {remainingAttempts}
              </p>
              <p className="text-sm mt-1">
                {remainingAttempts === 1
                  ? 'Последняя попытка! При неверном вводе ваш IP будет заблокирован.'
                  : 'После 3 неудачных попыток ваш IP будет заблокирован из-за подозрения во взломе.'}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="6-значный код"
              maxLength="6"
              className="w-full px-4 py-3 text-center text-2xl tracking-[.5em] font-mono bg-gray-100 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition mb-4"
              autoFocus
              disabled={loading}
            />

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-6 py-3 bg-yellow-600 text-base font-medium text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Проверка...' : 'Подтвердить'}
              </button>

              <button
                type="button"
                onClick={handleResendCode}
                disabled={loading || resendCooldown > 0 || remainingResends === 0}
                className="w-full inline-flex justify-center rounded-xl border border-gray-300 shadow-sm px-6 py-3 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition"
              >
                {resendCooldown > 0
                  ? `Подождите ${resendCooldown} сек`
                  : remainingResends === 0
                    ? 'Лимит исчерпан'
                    : `Отправить повторно (${remainingResends})`}
              </button>
            </div>
          </form>

          <div className="mt-4 text-sm text-gray-500">
            <p>Не получили код? Проверьте Telegram или свяжитесь с поддержкой.</p>
            {remainingResends < 3 && (
              <p className="mt-2 text-yellow-600 font-medium">
                Осталось попыток отправки: {remainingResends}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 rounded-full transition"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </SafeMotionDiv>
    </Modal>
  );
};

export default IPVerificationModal;
