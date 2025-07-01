import React, { useState, useRef, useEffect } from 'react';
import { responsesService } from '../../services/api';
import { toast } from 'react-toastify';
import { useReadOnlyCheck } from '../../hooks/useReadOnlyCheck';

const ResponseModal = ({ isOpen, onClose, requestId }) => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { checkAndShowModal, ReadOnlyModalComponent } = useReadOnlyCheck();
  const modalRef = useRef(null);
  const charLimit = 1000;

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isOpen]);

  // Если модальное окно не открыто, не рендерим его
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
      // Жёсткий костыль с перезагрузкой
      setTimeout(() => {
        window.location.reload();
      }, 1500); // Задержка, чтобы пользователь успел увидеть сообщение
    } catch (err) {
      setError(err.response?.data?.msg || 'Произошла ошибка');
      toast.error(err.response?.data?.msg || 'Не удалось отправить отклик');
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div ref={modalRef} className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Предложить помощь</h3>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {error && (
            <div className="text-red-500 mb-4">{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              rows="4"
              placeholder="Напишите ваше сообщение..."
              maxLength={charLimit}
            ></textarea>
            <p className="text-right text-sm text-gray-500 mt-1">
              {message.length} / {charLimit}
            </p>
            <div className="mt-4 flex justify-end">
              <button 
                  type="submit" 
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400"
              >
                {loading ? 'Отправка...' : 'Отправить отклик'}
              </button>
            </div>
          </form>
        </div>
      </div>
      <ReadOnlyModalComponent />
    </>
  );
};

export default ResponseModal; 