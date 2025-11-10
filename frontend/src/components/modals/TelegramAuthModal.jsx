import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { authService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Loader from '../shared/Loader';
import { FaTelegramPlane } from 'react-icons/fa';

const TelegramAuthModal = ({ isOpen, onClose, authAction = 'login' }) => {
  const { loginWithToken } = useAuth();
  const [loginUrl, setLoginUrl] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginToken, setLoginToken] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    let intervalId;

    if (!isOpen) {
      setLoginUrl('');
      setError('');
      setIsLoading(false);
      setLoginToken('');
      setIsCompleted(false);
      if (intervalId) clearInterval(intervalId);
      return;
    }

    const startLoginProcess = async () => {
      setIsLoading(true);
      setError('');
      try {
        const { data } = await authService.generateTelegramToken();
        const token = data.loginToken;
        setLoginToken(token);

        const botUsername = process.env.REACT_APP_TELEGRAM_BOT_USERNAME || 'birgekomek_bot';
        const url = `https://t.me/${botUsername}?start=${authAction}_${token}`;
        setLoginUrl(url);
        setIsLoading(false);

        intervalId = setInterval(async () => {
          if (!document.hidden) { // Проверяем, активна ли вкладка
            try {
              const { data: statusData } = await authService.checkTelegramToken(token);
              
              if (statusData.status === 'completed') {
                clearInterval(intervalId);
                toast.success('Авторизация прошла успешно!');
                loginWithToken(statusData.token, statusData.user);
                setIsCompleted(true);
                setTimeout(onClose, 500); // Закрываем с небольшой задержкой для UX
              } else if (statusData.status === 'invalid' || statusData.status === 'error') {
                clearInterval(intervalId);
                setError('Не удалось войти. Попробуйте еще раз.');
                toast.error('Срок действия QR-кода истек.');
              }
            } catch (err) {
              // Не выводим ошибку в консоль, если это просто ошибка сети при опросе
              // console.error('Polling error:', err);
            }
          }
        }, 3000);

      } catch (err) {
        console.error('Failed to start Telegram login process', err);
        setError('Не удалось начать процесс входа. Проверьте консоль.');
        toast.error('Ошибка при генерации QR-кода.');
        setIsLoading(false);
      }
    };

    startLoginProcess();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };

  }, [isOpen, authAction, loginWithToken, onClose]);

  useEffect(() => {
    if (isOpen) {
      if (modalRef.current) {
        modalRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-60 flex items-start justify-center z-[100] pt-20 md:pt-24 overflow-y-auto p-4"
          onClick={onClose}
          ref={modalRef}
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 md:p-8 text-center relative"
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
                Отсканируйте QR-код или нажмите на кнопку ниже.
              </p>
            </div>
            
            <div className="my-6 h-64 flex items-center justify-center">
              {isLoading && (
                <div className="flex flex-col items-center text-gray-500">
                  <Loader />
                  <span className="mt-2">Генерируем QR-код...</span>
                </div>
              )}
              {error && <p className="text-red-500 font-semibold">{error}</p>}
              {!isLoading && loginUrl && !isCompleted && (
                <div className="flex flex-col items-center gap-y-4 w-full">
                    <div className="p-2 bg-white rounded-lg border border-gray-200">
                         <QRCodeSVG 
                           value={loginUrl} 
                           size={180}
                           bgColor={"#ffffff"}
                           fgColor={"#000000"}
                           level={"L"}
                           includeMargin={true}
                         />
                    </div>
                    <a 
                        href={loginUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition-all duration-300 flex items-center justify-center text-base"
                    >
                        <FaTelegramPlane className="w-5 h-5 mr-2" />
                        Открыть Telegram
                    </a>
                </div>
              )}
               {isCompleted && (
                <div className="flex flex-col items-center text-green-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p className="mt-2 font-semibold">Успешно! Входим...</p>
                </div>
              )}
            </div>
            
            <p className="text-xs text-gray-500 px-4">
              Сессия для входа активна в течение 3 минут.
            </p>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TelegramAuthModal;
