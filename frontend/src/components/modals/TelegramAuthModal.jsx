import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode.react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api'; // Импортируем наш инстанс axios

const TelegramAuthModal = ({ isOpen, onClose, authAction = 'login' }) => {
  const { loginWithToken } = useAuth();
  const [loginUrl, setLoginUrl] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setLoginUrl('');
      setError('');
      setIsLoading(false);
      return;
    }

    const startLoginProcess = async () => {
      setIsLoading(true);
      setError('');
      try {
        // 1. Получаем временный токен
        const { data } = await api.post('/auth/telegram/generate-token');
        const { loginToken } = data;

        // 2. Формируем ссылку для бота
        const botUsername = process.env.REACT_APP_TELEGRAM_BOT_USERNAME || 'birgekomek_bot';
        const url = `https://t.me/${botUsername}?start=${authAction}_${loginToken}`;
        setLoginUrl(url);
        setIsLoading(false);

        // 3. Запускаем "опрос" бэкенда
        const intervalId = setInterval(async () => {
          try {
            const { data: statusData } = await api.get(`/auth/telegram/check-token/${loginToken}`);
            
            if (statusData.status === 'completed') {
              clearInterval(intervalId);
              loginWithToken(statusData.token, statusData.user);
              onClose();
            } else if (statusData.status === 'invalid' || statusData.status === 'error') {
              clearInterval(intervalId);
              setError('Не удалось войти. Попробуйте еще раз.');
            }
          } catch (err) {
            clearInterval(intervalId);
            setError('Проблема с соединением. Попробуйте снова.');
          }
        }, 3000); // Опрос каждые 3 секунды

        // Очистка при закрытии модалки
        return () => clearInterval(intervalId);

      } catch (err) {
        console.error('Failed to start Telegram login process', err);
        setError('Не удалось начать процесс входа. Проверьте консоль.');
        setIsLoading(false);
      }
    };

    startLoginProcess();

  }, [isOpen, authAction, loginWithToken, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 md:p-8 text-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Закрыть"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="mb-4">
              <h3 className="text-xl md:text-2xl font-bold text-gray-900">Вход через Telegram</h3>
              <p className="text-gray-600 mt-2 text-sm">
                Откройте Telegram, чтобы продолжить.
              </p>
            </div>
            
            <div className="my-6 h-56 flex items-center justify-center">
              {isLoading && (
                <div className="flex flex-col items-center text-gray-500">
                  <svg className="animate-spin h-8 w-8 text-indigo-600 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Генерируем ссылку...
                </div>
              )}
              {error && <p className="text-red-500">{error}</p>}
              {!isLoading && loginUrl && (
                <div className="flex flex-col items-center gap-y-4">
                    <div className="p-2 bg-white rounded-lg border border-gray-200">
                         <QRCode value={loginUrl} size={160} />
                    </div>
                    <a 
                        href={loginUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition-all duration-300 flex items-center justify-center"
                    >
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M22,3.125c-0.344,0-0.688,0.063-1.031,0.188L3.5,8.844c-1.063,0.375-1.063,1.813,0,2.25l4.375,1.375l1.375,4.375c0.438,1.063,1.875,1.063,2.25,0l5.531-17.438C16.969,3.313,16.688,3,16.25,3C16.188,3,16.125,3.063,16.063,3.063L16,3.125z M9.313,12.438l-4-1.25l12.188-7.656l-7.5,11.969L9.313,12.438z M12.938,14.688l-1.25-4l7.656-12.188l-11.969,7.5L12.938,14.688z"/></svg>
                        Открыть Telegram
                    </a>
                </div>
              )}
            </div>
            
            <p className="text-xs text-gray-500">
              Если кнопка не работает, отсканируйте QR-код. Сессия действует 3 минуты.
            </p>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TelegramAuthModal; 