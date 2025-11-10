import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { requestsService } from '../../services/api';
import { toast } from 'react-toastify';
import { SUBJECTS } from '../../services/constants';
import { ServerIcon, XMarkIcon, PaperClipIcon } from '@heroicons/react/24/outline';
import FileUploader from '../shared/FileUploader';

const MAX_TITLE_LENGTH = 100;
const MIN_TITLE_LENGTH = 5;
const MAX_DESCRIPTION_LENGTH = 2000;
const MIN_DESCRIPTION_LENGTH = 20;
const MAX_FILES = 10;

const EditRequestPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    grade: '',
  });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const editReason = location.state?.editReason || '';

  const [newFiles, setNewFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [attachmentsToDelete, setAttachmentsToDelete] = useState([]);

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const res = await requestsService.getRequestForEdit(id);
      setFormData({
          title: res.data.title,
          description: res.data.description,
          subject: res.data.subject,
          grade: res.data.grade,
        });
        setExistingAttachments(res.data.attachments || []);
    } catch (err) {
        toast.error('Не удалось загрузить данные заявки');
        navigate(`/request/${id}`);
    } finally {
        setLoading(false);
    }
    };
    fetchRequest();
  }, [id, navigate]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
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
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    const requestData = new FormData();
    Object.keys(formData).forEach(key => {
      requestData.append(key, formData[key]);
    });

    // Добавляем инфу о файлах
    if (attachmentsToDelete.length > 0) {
      requestData.append('deletedAttachments', JSON.stringify(attachmentsToDelete));
    }
    newFiles.forEach(file => {
      requestData.append('attachments', file);
    });

    if (editReason) {
      requestData.append('editReason', editReason);
      }
      
    try {
      await requestsService.updateRequest(id, requestData);
      toast.success('Заявка успешно обновлена!');
      navigate(`/request/${id}`);
    } catch (err) {
      // ПРАВИЛЬНАЯ ОБРАБОТКА ОШИБОК ВАЛИДАЦИИ
      const errorMsg = err.response?.data?.errors?.[0]?.msg || 'Не удалось обновить заявку. Проверьте данные.';
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleRemoveExistingAttachment = (filename) => {
    setAttachmentsToDelete(prev => [...prev, filename]);
    setExistingAttachments(prev => prev.filter(att => att.filename !== filename));
  };
  
  // Вычисляем количество оставшихся символов
  const titleRemainingChars = MAX_TITLE_LENGTH - (formData.title?.length || 0);
  const descriptionRemainingChars = MAX_DESCRIPTION_LENGTH - (formData.description?.length || 0);
  
  // Определяем стиль счетчика символов
  const titleCharCounterClass = titleRemainingChars < 0 ? 'text-red-500' : 'text-gray-500';
  const descriptionCharCounterClass = descriptionRemainingChars < 0 ? 'text-red-500' : 'text-gray-500';
  
  // Вычисляем общее количество файлов (используется в FileUploader)
  // const totalFiles = (existingAttachments?.length || 0) + newFiles.length;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-50 min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-900">Редактирование запроса</h1>
        </div>
        
        <div className="px-6 py-4">
          <form onSubmit={handleSubmit}>
            {/* Заголовок запроса */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">Заголовок</label>
                <span className={`text-sm font-medium ${titleCharCounterClass}`}>{formData.title?.length || 0}/{MAX_TITLE_LENGTH}</span>
              </div>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                maxLength={MAX_TITLE_LENGTH}
                className={`w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${errors.title ? 'border-red-500' : ''}`}
                placeholder="Например: Помощь с домашним заданием по алгебре"
              />
              {errors.title && <p className="mt-2 text-sm text-red-600">{errors.title}</p>}
            </div>
            
            {/* Описание */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Подробное описание</label>
                <span className={`text-sm font-medium ${descriptionCharCounterClass}`}>{formData.description?.length || 0}/{MAX_DESCRIPTION_LENGTH}</span>
              </div>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="6"
                maxLength={MAX_DESCRIPTION_LENGTH}
                className={`w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${errors.description ? 'border-red-500' : ''}`}
                placeholder="Опишите вашу проблему как можно подробнее..."
              ></textarea>
              {errors.description && <p className="mt-2 text-sm text-red-600">{errors.description}</p>}
            </div>
            
            {/* Предмет и класс */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                  Предмет*
                </label>
                <select
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-sm border ${errors.subject ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                >
                  <option value="">Выберите предмет</option>
                  {SUBJECTS.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
                {errors.subject && (
                  <p className="mt-1 text-xs text-red-600">{errors.subject}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-2">
                  Класс*
                </label>
                <select
                  id="grade"
                  name="grade"
                  value={formData.grade}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-sm border ${errors.grade ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                >
                  <option value="">Выберите класс</option>
                  {[...Array(11)].map((_, i) => (
                    <option key={i+1} value={i+1}>{i+1} класс</option>
                  ))}
                </select>
                {errors.grade && (
                  <p className="mt-1 text-xs text-red-600">{errors.grade}</p>
                )}
              </div>
            </div>
            
            {/* Блок с файлами */}
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <PaperClipIcon className="h-6 w-6 text-gray-500" />
                Управление вложениями
              </h3>
              {existingAttachments.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Текущие файлы:</h4>
                  <ul className="space-y-2">
                    {existingAttachments.map((file) => (
                      <li key={file.filename} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                        <div className="flex items-center gap-3 min-w-0">
                          <ServerIcon className="h-5 w-5 text-gray-400" />
                          <span className="text-sm text-gray-700 truncate" title={file.originalName}>{file.originalName}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveExistingAttachment(file.filename)}
                          className="p-1 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {existingAttachments.length > 0 ? 'Добавить новые файлы' : 'Прикрепить файлы'}
              </label>
              <FileUploader
                files={newFiles}
                setFiles={setNewFiles}
                maxFiles={MAX_FILES - existingAttachments.length}
              />
            </div>
            
            {/* Кнопки действий */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => navigate(`/request/${id}`)}
                className="px-6 py-2 text-sm font-medium text-gray-700 rounded-xl hover:bg-gray-100 transition"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {isSubmitting ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditRequestPage; 