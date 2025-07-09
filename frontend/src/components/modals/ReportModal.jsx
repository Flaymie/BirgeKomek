import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { XMarkIcon, FlagIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import Modal from './Modal';
import { reportsService } from '../../services/api';
import { toast } from 'react-toastify';
import FileUploader from '../shared/FileUploader';
import { useAuth } from '../../context/AuthContext';
import TelegramRequiredModal from './TelegramRequiredModal';

const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 2000;
const MAX_FILES = 5;

const ReportModal = ({ isOpen, onClose, targetId, targetType, targetName, onReportSent }) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!isOpen) {
      setReason('');
      setError('');
      setLoading(false);
      setAttachments([]);
      setShowTelegramModal(false);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!currentUser?.telegramId) {
      setShowTelegramModal(true);
      return;
    }
    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('targetId', targetId);
    formData.append('targetType', targetType);
    formData.append('reason', reason);
    attachments.forEach(file => {
        formData.append('attachments', file);
    });

    try {
      // Используем reportsService, а не голый api.post
      const response = await reportsService.createReport(formData);
      toast.success('Ваша жалоба успешно отправлена!');
      if (onReportSent) {
        onReportSent(response.data);
      }
      onClose();
    } catch (err) {
      const errorMessage = err.response?.data?.msg || 'Произошла ошибка при отправке жалобы.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isReasonValid = reason.trim().length >= MIN_REASON_LENGTH && reason.trim().length <= MAX_REASON_LENGTH;
  const canSubmit = isReasonValid && !loading;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-5 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="bg-red-100 text-red-600 p-2.5 rounded-lg">
                <FlagIcon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Подать жалобу</h3>
                <p className="text-sm text-gray-500">
                  на {targetType === 'User' ? 'пользователя' : 'заявку'} <span className="font-semibold">{targetName}</span>
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="overflow-y-auto p-5 space-y-4">
            {error && (
              <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-sm text-red-700">
                  {error}
              </div>
            )}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700">Причина жалобы</label>
                <span className={`text-sm font-medium ${reason.length > MAX_REASON_LENGTH ? 'text-red-500' : 'text-gray-500'}`}>{reason.length}/{MAX_REASON_LENGTH}</span>
              </div>
              <textarea 
                  id="reason" 
                  name="reason" 
                  value={reason} 
                  onChange={(e) => setReason(e.target.value)} 
                  rows="5" 
                  className={`w-full px-4 py-2 text-base border ${!isReasonValid && reason.length > 0 ? 'border-red-500' : 'border-gray-300'} rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500`} 
                  placeholder={`Опишите подробно, что именно нарушает правила (${MIN_REASON_LENGTH} - ${MAX_REASON_LENGTH} символов)`}
                  disabled={loading}
                  maxLength={MAX_REASON_LENGTH}
              />
            </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">
                  Прикрепить доказательства (до {MAX_FILES} изображений)
                </label>
                <FileUploader 
                  files={attachments} 
                  setFiles={setAttachments} 
                  maxFiles={MAX_FILES} 
                  accept={{ 
                    'image/jpeg': ['.jpeg', '.jpg'],
                    'image/png': ['.png'],
                    'image/gif': ['.gif'],
                    'image/webp': ['.webp']
                  }}
                  acceptLabel="Разрешены только изображения: .jpg, .png, .gif, .webp"
                />
             </div>
          </div>
          
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
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-red-300 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {loading ? 'Отправка...' : 'Отправить жалобу'}
              {!loading && <PaperAirplaneIcon className="h-5 w-5" />}
            </button>
          </div>
        </motion.div>
      </Modal>
      <TelegramRequiredModal isOpen={showTelegramModal} onClose={() => setShowTelegramModal(false)} />
    </>
  );
};

export default ReportModal; 