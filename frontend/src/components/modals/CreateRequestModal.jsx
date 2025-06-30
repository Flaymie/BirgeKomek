import React, { useState, useEffect, useRef } from 'react';
import { requestsService } from '../../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { SUBJECTS } from '../../services/constants';
import { motion } from 'framer-motion';
import { XMarkIcon, PaperAirplaneIcon, DocumentPlusIcon } from '@heroicons/react/24/outline';
import Modal from './Modal';
import { useReadOnlyCheck } from '../../hooks/useReadOnlyCheck';

// Максимальное количество символов
const MAX_TITLE_LENGTH = 100;
const MIN_TITLE_LENGTH = 5;
const MAX_DESCRIPTION_LENGTH = 2000;
const MIN_DESCRIPTION_LENGTH = 20;

const CreateRequestModal = ({ isOpen, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    grade: currentUser?.grade || '',
  });
  
  const [errors, setErrors] = useState({});
  
  const modalRef = useRef(null);
  
  const { checkAndShowModal, ReadOnlyModalComponent } = useReadOnlyCheck();
  
  // Сбрасываем форму при открытии/закрытии модального окна
  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: '',
        description: '',
        subject: '',
        grade: currentUser?.grade || '',
      });
      setErrors({});
      if (modalRef.current) {
        modalRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [isOpen, currentUser]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Ограничиваем длину
    if (name === 'title' && value.length > MAX_TITLE_LENGTH) {
      return;
    }
    if (name === 'description' && value.length > MAX_DESCRIPTION_LENGTH) {
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Очищаем ошибку поля при изменении
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim() || formData.title.length < MIN_TITLE_LENGTH) {
      newErrors.title = `Заголовок должен содержать минимум ${MIN_TITLE_LENGTH} символов`;
    } else if (formData.title.length > MAX_TITLE_LENGTH) {
      newErrors.title = `Заголовок не должен превышать ${MAX_TITLE_LENGTH} символов`;
    }
    
    if (!formData.description.trim() || formData.description.length < MIN_DESCRIPTION_LENGTH) {
      newErrors.description = `Описание должно содержать минимум ${MIN_DESCRIPTION_LENGTH} символов`;
    } else if (formData.description.length > MAX_DESCRIPTION_LENGTH) {
      newErrors.description = `Описание не должно превышать ${MAX_DESCRIPTION_LENGTH} символов`;
    }
    
    if (!formData.subject) {
      newErrors.subject = 'Выберите предмет';
    }
    
    if (!formData.grade) {
      newErrors.grade = 'Укажите класс';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (checkAndShowModal()) return;
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setErrors({});

    try {
      const requestData = {
        title: formData.title,
        description: formData.description,
        subject: formData.subject,
        grade: formData.grade,
      };
      const response = await requestsService.createRequest(requestData);
      
      toast.success('Запрос успешно создан!');
      if (onSuccess) {
        onSuccess(response.data);
      }
      onClose();
    } catch (error) {
      console.error('Ошибка при создании запроса:', error);
      if (error.response && error.response.data) {
        console.error('ОТВЕТ СЕРВЕРА:', JSON.stringify(error.response.data, null, 2));
      }
      const errorMessage = error.response?.data?.errors?.[0]?.msg || error.response?.data?.msg || 'Произошла ошибка при создании запроса';
      toast.error(errorMessage);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Вычисляем количество оставшихся символов
  const titleRemainingChars = MAX_TITLE_LENGTH - formData.title.length;
  const descriptionRemainingChars = MAX_DESCRIPTION_LENGTH - formData.description.length;
  
  // Определяем стиль счетчика символов
  const titleCharCounterClass = titleRemainingChars < 0 ? 'text-red-500' : 'text-gray-500';
  const descriptionCharCounterClass = descriptionRemainingChars < 0 ? 'text-red-500' : 'text-gray-500';
  
  return (
    <>
      <Modal isOpen={isOpen} onClose={() => onClose()}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative bg-white rounded-2xl shadow-xl max-w-xl w-full max-h-[90vh] flex flex-col"
          onClick={e => e.stopPropagation()}
          ref={modalRef}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="bg-indigo-100 text-indigo-600 p-2.5 rounded-lg">
                <DocumentPlusIcon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Новый запрос о помощи</h3>
                <p className="text-sm text-gray-500">Заполните детали, и мы найдем вам помощника</p>
              </div>
            </div>
            <button onClick={() => onClose()} className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          
          {/* Form Body */}
          <div className="overflow-y-auto p-5 space-y-4">
            <form id="create-request-form" onSubmit={handleSubmit}>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">Заголовок</label>
                  <span className={`text-sm font-medium ${titleCharCounterClass}`}>{formData.title.length}/{MAX_TITLE_LENGTH}</span>
                </div>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  maxLength={MAX_TITLE_LENGTH}
                  className={`w-full px-4 py-2 text-base border ${errors.title ? 'border-red-500' : 'border-gray-300'} rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition`}
                  placeholder="Например: Помощь с домашним заданием по алгебре"
                />
                {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">Подробное описание</label>
                  <span className={`text-sm font-medium ${descriptionCharCounterClass}`}>{formData.description.length}/{MAX_DESCRIPTION_LENGTH}</span>
                </div>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="4"
                  maxLength={MAX_DESCRIPTION_LENGTH}
                  className={`w-full px-4 py-2 text-base border ${errors.description ? 'border-red-500' : 'border-gray-300'} rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition`}
                  placeholder="Опишите вашу проблему как можно подробнее..."
                />
                {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Предмет</label>
                  <select id="subject" name="subject" value={formData.subject} onChange={handleChange} className={`w-full px-4 py-2 text-base border ${errors.subject ? 'border-red-500' : 'border-gray-300'} rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition`}>
                    <option value="" disabled>Выберите предмет</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {errors.subject && <p className="mt-1 text-sm text-red-600">{errors.subject}</p>}
                </div>
                
                <div>
                  <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-1">Класс</label>
                  <select id="grade" name="grade" value={formData.grade} onChange={handleChange} className={`w-full px-4 py-2 text-base border ${errors.grade ? 'border-red-500' : 'border-gray-300'} rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition`}>
                    <option value="" disabled>Выберите класс</option>
                    {[...Array(11)].map((_, i) => <option key={i+1} value={i+1}>{i+1} класс</option>)}
                  </select>
                  {errors.grade && <p className="mt-1 text-sm text-red-600">{errors.grade}</p>}
                </div>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="flex justify-end items-center p-5 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
            <button type="button" onClick={() => onClose()} className="px-5 py-2 text-base font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition">
              Отмена
            </button>
            <button
              type="submit"
              form="create-request-form"
              disabled={isSubmitting}
              className="ml-3 px-5 py-2 text-base font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {isSubmitting ? 'Отправка...' : 'Создать запрос'}
              {!isSubmitting && <PaperAirplaneIcon className="h-5 w-5" />}
            </button>
          </div>
        </motion.div>
      </Modal>
      <ReadOnlyModalComponent />
    </>
  );
};

export default CreateRequestModal; 