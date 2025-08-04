import React, { useState, useRef, useEffect } from 'react';
import { responsesService } from '../../services/api';
import { toast } from 'react-toastify';
import { useReadOnlyCheck } from '../../hooks/useReadOnlyCheck';
import { XMarkIcon } from '@heroicons/react/24/solid';

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
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
        <div ref={modalRef} className="bg-white rounded-xl p-6 md:p-8 w-full max-w-md mx-4 shadow-2xl transform transition-all relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
            </button>
            <h3 className="text-2xl font-bold mb-4 text-gray-800">Предложить помощь</h3>
            <p className="text-gray-600 mb-6">Напишите автору заявки, почему именно вы сможете ему помочь. Ваш отклик будет виден только ему.</p>

          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mb-4 rounded-md">
                <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              rows="5"
              placeholder="Например: 'Привет! Я хорошо разбираюсь в этой теме и готов помочь...' "
              maxLength={charLimit}
            />
            <p className="text-right text-sm text-gray-500 mt-2">
              {message.length} / {charLimit}
            </p>
            <div className="mt-6 flex justify-end gap-4 border-t pt-5">
              <button 
                  type="button"
                  onClick={onClose}
                  className="btn btn-secondary"
              >
                Отмена
              </button>
              <button 
                  type="submit" 
                  disabled={loading}
                  className="btn btn-primary"
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