import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import Modal from './Modal';
import { api } from '../../services/api';

const MIN_TITLE_LENGTH = 5;
const MAX_TITLE_LENGTH = 100;
const MIN_MESSAGE_LENGTH = 10;
const MAX_MESSAGE_LENGTH = 2000;

const templates = [
  {
    name: 'Выберите шаблон...',
    title: '',
    message: '',
  },
  {
    name: 'Запрещенный аватар',
    title: 'Предупреждение: Некорректный аватар',
    message: 'Ваш аватар нарушает правила сервиса (например, содержит запрещенный контент, NSFW, оскорбления). Пожалуйста, смените его в течение 24 часов, иначе ваш аккаунт может быть заблокирован.',
  },
  {
    name: 'Нарушение в профиле',
    title: 'Предупреждение: Нарушение в профиле',
    message: 'Информация в вашем профиле (имя пользователя, "о себе") нарушает правила сервиса. Пожалуйста, отредактируйте профиль в соответствии с правилами.',
  },
  {
    name: 'Некорректная заявка',
    title: 'Предупреждение: Некорректная заявка',
    message: 'Ваша заявка нарушает правила публикации. Пожалуйста, отредактируйте ее. Повторные нарушения могут привести к ограничениям.',
  },
];

const SendNotificationModal = ({ isOpen, onClose, recipient, onNotificationSent }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setMessage('');
      setError('');
      setLoading(false);
    }
  }, [isOpen]);

  const handleTemplateChange = (e) => {
    const selectedTemplate = templates.find(t => t.name === e.target.value);
    if (selectedTemplate) {
      setTitle(selectedTemplate.title);
      setMessage(selectedTemplate.message);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/admin/notify-user', {
        recipientId: recipient._id,
        title,
        message,
      });
      onNotificationSent(response.data.notification);
      onClose();
    } catch (err) {
      setError(err.response?.data?.errors?.[0]?.msg || err.response?.data?.msg || 'Произошла ошибка при отправке уведомления.');
    } finally {
      setLoading(false);
    }
  };

  if (!recipient) return null;
  
  const isTitleValid = title.trim().length >= MIN_TITLE_LENGTH && title.trim().length <= MAX_TITLE_LENGTH;
  const isMessageValid = message.trim().length >= MIN_MESSAGE_LENGTH && message.trim().length <= MAX_MESSAGE_LENGTH;
  const canSubmit = isTitleValid && isMessageValid && !loading;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 text-blue-600 p-2.5 rounded-lg">
              <PaperAirplaneIcon className="h-6 w-6 rotate-45" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Отправить уведомление</h3>
              <p className="text-sm text-gray-500">для пользователя <span className="font-semibold">{recipient.username}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-4">
          <div>
            <label htmlFor="template-select" className="block text-sm font-medium text-gray-700 mb-1">Шаблоны</label>
            <select
              id="template-select"
              onChange={handleTemplateChange}
              className="w-full px-4 py-2 text-base border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            >
              {templates.map(template => (
                <option key={template.name} value={template.name}>{template.name}</option>
              ))}
            </select>
          </div>
          <div className="border-t border-gray-200"></div>
          {error && (
            <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-sm text-red-700">
                {error}
            </div>
          )}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">Заголовок</label>
              <span className={`text-sm font-medium ${title.length > MAX_TITLE_LENGTH ? 'text-red-500' : 'text-gray-500'}`}>{title.length}/{MAX_TITLE_LENGTH}</span>
            </div>
            <input 
                type="text" 
                id="title" 
                name="title" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full px-4 py-2 text-base border ${!isTitleValid && title.length > 0 ? 'border-red-500' : 'border-gray-300'} rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`} 
                placeholder={`От ${MIN_TITLE_LENGTH} до ${MAX_TITLE_LENGTH} символов`}
                disabled={loading}
                maxLength={MAX_TITLE_LENGTH}
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="message" className="block text-sm font-medium text-gray-700">Сообщение</label>
              <span className={`text-sm font-medium ${message.length > MAX_MESSAGE_LENGTH ? 'text-red-500' : 'text-gray-500'}`}>{message.length}/{MAX_MESSAGE_LENGTH}</span>
            </div>
            <textarea 
                id="message" 
                name="message" 
                value={message} 
                onChange={(e) => setMessage(e.target.value)} 
                rows="5" 
                className={`w-full px-4 py-2 text-base border ${!isMessageValid && message.length > 0 ? 'border-red-500' : 'border-gray-300'} rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`} 
                placeholder={`От ${MIN_MESSAGE_LENGTH} до ${MAX_MESSAGE_LENGTH} символов`}
                disabled={loading}
                maxLength={MAX_MESSAGE_LENGTH}
            />
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex justify-end items-center p-5 border-t border-gray-200 bg-gray-50 rounded-b-2xl gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 rounded-xl hover:bg-gray-100 transition disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            {loading ? 'Отправка...' : 'Отправить'}
            {!loading && <PaperAirplaneIcon className="h-5 w-5" />}
          </button>
        </div>
      </motion.div>
    </Modal>
  );
};

export default SendNotificationModal;