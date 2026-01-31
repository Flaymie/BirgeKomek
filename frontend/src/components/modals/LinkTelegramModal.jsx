import React, { useEffect, useRef } from 'react';
import { SafeAnimatePresence, SafeMotionDiv } from '../shared/SafeMotion';
import { QRCodeSVG } from 'qrcode.react';
import { FaTelegramPlane } from 'react-icons/fa';
import Loader from '../shared/Loader';

const LinkTelegramModal = ({ isOpen, onClose, linkUrl, isLoading }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isOpen]);


  if (!isOpen) return null;

  return (
    <SafeAnimatePresence>
      {isOpen && (
        <SafeMotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-60 flex items-start justify-center z-[100] pt-20 md:pt-24 overflow-y-auto p-4"
          onClick={onClose}
          ref={modalRef}
        >
          <SafeMotionDiv
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
              <h3 className="text-xl md:text-2xl font-bold text-gray-900">Привязка Telegram</h3>
              <p className="text-gray-600 mt-2 text-sm">
                Отсканируйте QR-код через Telegram или нажмите на кнопку ниже, чтобы получать уведомления.
              </p>
            </div>

            <div className="my-6 h-64 flex items-center justify-center">
              {isLoading && (
                <div className="flex flex-col items-center text-gray-500">
                  <Loader />
                  <span className="mt-2">Генерируем ссылку...</span>
                </div>
              )}
              {!isLoading && linkUrl && (
                <div className="flex flex-col items-center gap-y-4 w-full">
                  <div className="p-2 bg-white rounded-lg border border-gray-200">
                    <QRCodeSVG
                      value={linkUrl}
                      size={180}
                      bgColor={"#ffffff"}
                      fgColor={"#000000"}
                      level={"L"}
                      includeMargin={true}
                    />
                  </div>
                  <a
                    href={linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition-all duration-300 flex items-center justify-center text-base"
                  >
                    <FaTelegramPlane className="w-5 h-5 mr-2" />
                    Открыть Telegram
                  </a>
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500 px-4">
              Ссылка для привязки активна в течение 10 минут.
            </p>

          </SafeMotionDiv>
        </SafeMotionDiv>
      )}
    </SafeAnimatePresence>
  );
};

export default LinkTelegramModal; 
