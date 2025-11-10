import React, { useState, useEffect, useRef } from 'react';
import { requestsService } from '../../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { SUBJECTS } from '../../services/constants';
import { motion } from 'framer-motion';
import { XMarkIcon, PaperAirplaneIcon, DocumentPlusIcon, DocumentCheckIcon, ArchiveBoxIcon, TrashIcon, ServerIcon } from '@heroicons/react/24/outline';
import Modal from './Modal';
import { useReadOnlyCheck } from '../../hooks/useReadOnlyCheck';
import FileUploader from '../shared/FileUploader';

const MAX_TITLE_LENGTH = 100;
const MIN_TITLE_LENGTH = 5;
const MAX_DESCRIPTION_LENGTH = 2000;
const MIN_DESCRIPTION_LENGTH = 20;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILES = 10;

const CreateRequestModal = ({ isOpen, onClose, onSuccess, requestToEdit }) => {
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newFiles, setNewFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [attachmentsToDelete, setAttachmentsToDelete] = useState([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    grade: currentUser?.grade || '',
  });
  
  const [errors, setErrors] = useState({});
  const modalRef = useRef(null);
  const { checkAndShowModal, ReadOnlyModalComponent } = useReadOnlyCheck();
  const isEditing = Boolean(requestToEdit);
  
  useEffect(() => {
    if (isOpen) {
      if (isEditing) {
        setFormData({
          title: requestToEdit.title || '',
          description: requestToEdit.description || '',
          subject: requestToEdit.subject || '',
          grade: requestToEdit.grade || '',
        });
        setExistingAttachments(requestToEdit.attachments || []);
      } else {
        setFormData({
          title: '',
          description: '',
          subject: '',
          grade: currentUser?.grade || '',
        });
        setExistingAttachments([]);
      }
      setErrors({});
      setNewFiles([]);
      setAttachmentsToDelete([]);
    }
  }, [isOpen, currentUser, requestToEdit, isEditing]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'title' && value.length > MAX_TITLE_LENGTH) return;
    if (name === 'description' && value.length > MAX_DESCRIPTION_LENGTH) return;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };
  
  const validateForm = (isDraft = false) => {
    const newErrors = {};
    if (!formData.title.trim() || formData.title.length < MIN_TITLE_LENGTH) {
      newErrors.title = `Заголовок должен содержать минимум ${MIN_TITLE_LENGTH} символов`;
    }
    if (!isDraft) {
      if (!formData.description.trim() || formData.description.length < MIN_DESCRIPTION_LENGTH) {
        newErrors.description = `Описание должно содержать минимум ${MIN_DESCRIPTION_LENGTH} символов`;
      }
      if (!formData.subject) newErrors.subject = 'Выберите предмет';
      if (!formData.grade) newErrors.grade = 'Укажите класс';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAction = async (actionType) => {
    if (checkAndShowModal()) return;

    const isDraft = actionType === 'saveDraft';
    if (!validateForm(isDraft)) return;
    
    setIsSubmitting(true);
    setErrors({});
    
    const requestData = new FormData();
    Object.keys(formData).forEach(key => {
        requestData.append(key, formData[key]);
    });

    try {
      if (isEditing) {
        if (attachmentsToDelete.length > 0) {
          requestData.append('deletedAttachments', JSON.stringify(attachmentsToDelete));
        }
        newFiles.forEach(file => {
          requestData.append('attachments', file);
        });

        await requestsService.updateRequest(requestToEdit._id, requestData);

        if (actionType === 'publish') {
            const response = await requestsService.publishDraft(requestToEdit._id);
            toast.success('Черновик успешно опубликован!');
            if (onSuccess) onSuccess(response?.data);
        } else {
            toast.success('Черновик успешно сохранен!');
            if (onSuccess) onSuccess();
        }
      } else {
        newFiles.forEach(file => {
          requestData.append('attachments', file);
        });
        const response = await requestsService.createRequest(requestData, isDraft);
        toast.success(isDraft ? 'Черновик успешно сохранен!' : 'Запрос успешно создан!');
        if (onSuccess) onSuccess(response?.data);
      }

      onClose();
    } catch (error) {
      console.error('Ошибка при операции с запросом:', error);
      const errorMessage = error.response?.data?.errors?.[0]?.msg || error.response?.data?.msg || 'Произошла ошибка';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!requestToEdit) return;
    if (window.confirm('Вы уверены, что хотите удалить этот черновик? Это действие необратимо.')) {
      setIsSubmitting(true);
      try {
        await requestsService.deleteRequest(requestToEdit._id);
        toast.success('Черновик удален.');
        if (onSuccess) onSuccess();
        onClose();
      } catch (err) {
        toast.error(err.response?.data?.msg || 'Не удалось удалить черновик');
      } finally {
        setIsSubmitting(false);
      }
    }
  };
  
  const handleRemoveExistingAttachment = (filename) => {
    setAttachmentsToDelete(prev => [...prev, filename]);
    setExistingAttachments(prev => prev.filter(att => att.filename !== filename));
  };

  const titleRemainingChars = MAX_TITLE_LENGTH - formData.title.length;
  const descriptionRemainingChars = MAX_DESCRIPTION_LENGTH - formData.description.length;
  const titleCharCounterClass = titleRemainingChars < 0 ? 'text-red-500' : 'text-gray-500';
  const descriptionCharCounterClass = descriptionRemainingChars < 0 ? 'text-red-500' : 'text-gray-500';
  
  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative bg-white rounded-2xl shadow-xl max-w-xl w-full max-h-[90vh] flex flex-col"
          onClick={e => e.stopPropagation()}
          ref={modalRef}
        >
          <div className="flex items-center justify-between p-5 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="bg-indigo-100 text-indigo-600 p-2.5 rounded-lg">
                {isEditing ? <DocumentCheckIcon className="h-6 w-6" /> : <DocumentPlusIcon className="h-6 w-6" />}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{isEditing ? 'Редактирование черновика' : 'Новый запрос о помощи'}</h3>
                <p className="text-sm text-gray-500">{isEditing ? 'Измените данные и опубликуйте' : 'Заполните детали, и мы найдем вам помощника'}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          
          <div className="overflow-y-auto p-5 space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">Заголовок</label>
                  <span className={`text-sm font-medium ${titleCharCounterClass}`}>{formData.title.length}/{MAX_TITLE_LENGTH}</span>
                </div>
                <input type="text" id="title" name="title" value={formData.title} onChange={handleChange} className={`w-full px-4 py-2 text-base border ${errors.title ? 'border-red-500' : 'border-gray-300'} rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500`} placeholder="Например: Помощь с домашним заданием по алгебре" />
                {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">Подробное описание</label>
                  <span className={`text-sm font-medium ${descriptionCharCounterClass}`}>{formData.description.length}/{MAX_DESCRIPTION_LENGTH}</span>
                </div>
                <textarea id="description" name="description" value={formData.description} onChange={handleChange} rows="4" className={`w-full px-4 py-2 text-base border ${errors.description ? 'border-red-500' : 'border-gray-300'} rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500`} placeholder="Опишите вашу проблему как можно подробнее..." />
                {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Предмет</label>
                  <select id="subject" name="subject" value={formData.subject} onChange={handleChange} className={`w-full px-4 py-2 text-base border ${errors.subject ? 'border-red-500' : 'border-gray-300'} rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500`}>
                    <option value="" disabled>Выберите предмет</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {errors.subject && <p className="mt-1 text-sm text-red-600">{errors.subject}</p>}
                </div>
                
                <div>
                  <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-1">Класс</label>
                  <select id="grade" name="grade" value={formData.grade} onChange={handleChange} className={`w-full px-4 py-2 text-base border ${errors.grade ? 'border-red-500' : 'border-gray-300'} rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500`}>
                    <option value="" disabled>Выберите класс</option>
                    {[...Array(11)].map((_, i) => <option key={i+1} value={i+1}>{i+1} класс</option>)}
                  </select>
                  {errors.grade && <p className="mt-1 text-sm text-red-600">{errors.grade}</p>}
                </div>
              </div>

              <div>
                {isEditing && existingAttachments.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-800 mb-2">Текущие вложения:</h4>
                    <ul className="space-y-2">
                      {existingAttachments.map((file) => (
                        <li key={file.filename} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                           <div className="flex items-center gap-3 min-w-0">
                            <ServerIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                            <span className="text-sm text-gray-700 truncate" title={file.originalName}>
                              {file.originalName}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveExistingAttachment(file.filename)}
                            className="p-1 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isEditing ? 'Добавить новые вложения' : 'Вложения'} (до {MAX_FILES} файлов, макс. {MAX_FILE_SIZE_MB}МБ каждый)
                </label>
                <FileUploader files={newFiles} setFiles={setNewFiles} maxFiles={MAX_FILES - existingAttachments.length} />
              </div>
          </div>


<div className="flex justify-between items-center p-5 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
  
  <div className="flex items-center gap-3">
    {isEditing && (
      <>
      <button
          type="button"
          onClick={() => handleAction('saveDraft')}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 border border-transparent rounded-xl hover:bg-indigo-200 disabled:opacity-50 transition flex items-center gap-2"
        >
          <ArchiveBoxIcon className="h-5 w-5" />
          Сохранить
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 border border-transparent rounded-xl hover:bg-red-200 disabled:opacity-50 transition flex items-center gap-2"
        >
          <TrashIcon className="h-5 w-5" />
          Удалить
        </button>
      </>
    )}
  </div>

  <div className="flex items-center gap-3">
    {!isEditing && (
      <button
        type="button"
        onClick={() => handleAction('saveDraft')}
        disabled={isSubmitting}
        className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 border border-transparent rounded-xl hover:bg-indigo-200 disabled:opacity-50 transition flex items-center gap-2"
      >
        <ArchiveBoxIcon className="h-5 w-5" />
        В черновик
      </button>
    )}

    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 rounded-xl hover:bg-gray-100 transition">
      Отмена
    </button>

    <button
      type="button"
      onClick={() => handleAction('publish')}
      disabled={isSubmitting}
      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition flex items-center gap-2"
    >
      {isSubmitting ? 'Публикация...' : (isEditing ? 'Опубликовать' : 'Создать запрос')}
      {!isSubmitting && <PaperAirplaneIcon className="h-5 w-5" />}
    </button>
  </div>
</div>
        </motion.div>
      </Modal>
      <ReadOnlyModalComponent />
    </>
  );
};

export default CreateRequestModal;
