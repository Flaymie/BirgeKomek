import React, { useState, useRef, useEffect } from 'react';
import { responsesService } from '../../services/api';
import { toast } from 'react-toastify';
import { useReadOnlyCheck } from '../../hooks/useReadOnlyCheck';
import { XMarkIcon, PaperAirplaneIcon, HandRaisedIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import Modal from './Modal';

const ResponseModal = ({ isOpen, onClose, requestId }) => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { checkAndShowModal, ReadOnlyModalComponent } = useReadOnlyCheck();
  const modalRef = useRef(null);
  const charLimit = 1000;

  useEffect(() => {
    if (isOpen) {
        setMessage('');
        setError(null);
        setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (await checkAndShowModal()) return;
    if (!message.trim()) {
      toast.error('Сообщение не может быть пустым');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await responsesService.createResponse({
        request: requestId,
        message,
      });
      toast.success('Ваш отклик успешно отправлен! Перезагружаем...');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      const errorMessage = err.response?.data?.msg || 'Произошла ошибка при отправке отклика';
      setError(errorMessage);
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          ref={modalRef}
          className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Заголовок */}
          <div className="flex items-center justify-between p-5 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="bg-indigo-100 text-indigo-600 p-2.5 rounded-lg">
                <HandRaisedIcon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Предложить помощь</h3>
                <p className="text-sm text-gray-500">Отправьте отклик автору заявки</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-600 p-2 rounded-full"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Контент */}
          <div className="overflow-y-auto p-5 space-y-4">
            {/* Информационный блок */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-gray-700">
              💡 <strong>Совет:</strong> Расскажите, почему именно вы сможете помочь. Ваш отклик будет виден только автору заявки.
            </div>

            {/* Ошибка */}
            {error && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-md">
                <p>{error}</p>
              </div>
            )}

            {/* Форма */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                    Ваше сообщение
                  </label>
                  <span className="text-sm text-gray-500">
                    {message.length}/{charLimit}
                  </span>
                </div>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-2 text-base border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows="6"
                  placeholder="Например: 'Привет! Я отлично разбираюсь в этой теме и уже помогал многим ученикам. Буду рад помочь и тебе!'"
                  maxLength={charLimit}
                />
              </div>

              {/* Кнопки действий */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button 
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  disabled={loading || !message.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Отправка...
                    </>
                  ) : (
                    <>
                      <PaperAirplaneIcon className="w-4 h-4" />
                      Отправить отклик
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </Modal>
      <ReadOnlyModalComponent />
    </>
  );
};

export default ResponseModal;
