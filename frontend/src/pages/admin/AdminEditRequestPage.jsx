import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { toast } from 'react-toastify';
import { SUBJECTS } from '../../services/constants';
import { ArrowUturnLeftIcon, ServerIcon, XMarkIcon, PaperClipIcon } from '@heroicons/react/24/outline';
import FileUploader from '../../components/shared/FileUploader';

const MAX_TITLE_LENGTH = 100;
const MIN_TITLE_LENGTH = 5;
const MAX_DESCRIPTION_LENGTH = 2000;
const MIN_DESCRIPTION_LENGTH = 20;
const MAX_FILES = 10;

const AdminEditRequestPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { callApi, loading } = useApi();

    const [formData, setFormData] = useState({ title: '', description: '', subject: '', grade: '' });
    const [editReason, setEditReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    
    const [newFiles, setNewFiles] = useState([]);
    const [existingAttachments, setExistingAttachments] = useState([]);
    const [attachmentsToDelete, setAttachmentsToDelete] = useState([]);

    useEffect(() => {
        const fetchRequest = async () => {
            try {
                const { data } = await callApi(`/admin/requests/${id}`, 'GET');
                setFormData({
                    title: data.title,
                    description: data.description,
                    subject: data.subject,
                    grade: data.grade.toString(),
                });
                setExistingAttachments(data.attachments || []);
            } catch (err) {
                toast.error('Не удалось загрузить данные заявки');
                navigate(`/admin/requests/${id}`);
            }
        };
        fetchRequest();
    }, [id, navigate, callApi]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.title.trim() || formData.title.length < MIN_TITLE_LENGTH) {
            newErrors.title = `Заголовок должен содержать минимум ${MIN_TITLE_LENGTH} символов`;
        }
        if (!formData.description.trim() || formData.description.length < MIN_DESCRIPTION_LENGTH) {
            newErrors.description = `Описание должно содержать минимум ${MIN_DESCRIPTION_LENGTH} символов`;
        }
        if (!formData.subject) newErrors.subject = 'Выберите предмет';
        if (!formData.grade) newErrors.grade = 'Укажите класс';
        if (!editReason.trim()) newErrors.reason = 'Укажите причину редактирования';

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
        
        requestData.append('reason', editReason);
        if (attachmentsToDelete.length > 0) {
            requestData.append('deletedAttachments', JSON.stringify(attachmentsToDelete));
        }
        newFiles.forEach(file => {
            requestData.append('attachments', file);
        });

        try {
            await callApi(`/admin/requests/${id}`, 'PUT', requestData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Заявка успешно обновлена!');
            navigate(`/admin/requests/${id}`);
        } catch (err) {
            const errorMsg = err.response?.data?.errors?.[0]?.msg || err.response?.data?.msg || 'Не удалось обновить заявку';
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };
  
    const handleRemoveExistingAttachment = (filename) => {
        setAttachmentsToDelete(prev => [...prev, filename]);
        setExistingAttachments(prev => prev.filter(att => att.filename !== filename));
    };

    const titleRemainingChars = MAX_TITLE_LENGTH - (formData.title?.length || 0);
    const descriptionRemainingChars = MAX_DESCRIPTION_LENGTH - (formData.description?.length || 0);

    if (loading && !formData.title) {
        return (
            <div className="flex justify-center items-center py-24">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }
    
    return (
        <div className="bg-gray-50 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <button onClick={() => navigate(`/admin/requests/${id}`)} className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-indigo-600">
                    <ArrowUturnLeftIcon className="h-4 w-4" />
                    Назад к заявке
                </button>
                <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
                    <div className="px-6 py-5 border-b border-gray-200">
                        <h1 className="text-xl font-bold text-gray-900">Админ: Редактирование заявки</h1>
                        <p className="text-sm text-gray-500 mt-1">ID: <span className="font-mono">{id}</span></p>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="divide-y divide-gray-200">
                        <div className="px-6 py-5 space-y-6">
                            {/* Заголовок */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">Заголовок</label>
                                    <span className={`text-sm ${titleRemainingChars < 0 ? 'text-red-500' : 'text-gray-500'}`}>{formData.title?.length || 0}/{MAX_TITLE_LENGTH}</span>
                                </div>
                                <input type="text" id="title" name="title" value={formData.title} onChange={handleChange} maxLength={MAX_TITLE_LENGTH} className={`w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${errors.title ? 'border-red-500' : ''}`} />
                                {errors.title && <p className="mt-2 text-sm text-red-600">{errors.title}</p>}
                            </div>

                            {/* Описание */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">Подробное описание</label>
                                    <span className={`text-sm ${descriptionRemainingChars < 0 ? 'text-red-500' : 'text-gray-500'}`}>{formData.description?.length || 0}/{MAX_DESCRIPTION_LENGTH}</span>
                                </div>
                                <textarea id="description" name="description" value={formData.description} onChange={handleChange} rows="8" maxLength={MAX_DESCRIPTION_LENGTH} className={`w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${errors.description ? 'border-red-500' : ''}`}></textarea>
                                {errors.description && <p className="mt-2 text-sm text-red-600">{errors.description}</p>}
                            </div>

                            {/* Предмет и класс */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Предмет</label>
                                    <select id="subject" name="subject" value={formData.subject} onChange={handleChange} className={`w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${errors.subject ? 'border-red-500' : ''}`}>
                                        <option value="">Выберите предмет</option>
                                        {SUBJECTS.map(subject => <option key={subject} value={subject}>{subject}</option>)}
                                    </select>
                                    {errors.subject && <p className="mt-1 text-sm text-red-600">{errors.subject}</p>}
                                </div>
                                <div>
                                    <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-1">Класс</label>
                                    <select id="grade" name="grade" value={formData.grade} onChange={handleChange} className={`w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${errors.grade ? 'border-red-500' : ''}`}>
                                        <option value="">Выберите класс</option>
                                        {[...Array(11)].map((_, i) => <option key={i+1} value={i+1}>{i+1} класс</option>)}
                                    </select>
                                    {errors.grade && <p className="mt-1 text-sm text-red-600">{errors.grade}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Управление файлами */}
                        <div className="px-6 py-5">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <PaperClipIcon className="h-6 w-6 text-gray-500" />
                                Управление вложениями
                            </h3>
                            {existingAttachments.length > 0 && (
                                <div className="mb-4">
                                    <h4 className="text-sm font-medium text-gray-600 mb-2">Текущие файлы:</h4>
                                    <ul className="space-y-2">
                                        {existingAttachments.map((file) => (
                                            <li key={file.filename} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg text-sm">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <ServerIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                                    <span className="text-gray-700 truncate" title={file.originalName}>{file.originalName}</span>
                                                </div>
                                                <button type="button" onClick={() => handleRemoveExistingAttachment(file.filename)} className="p-1 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600 flex-shrink-0">
                                                    <XMarkIcon className="h-4 w-4" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            <label className="block text-sm font-medium text-gray-700 mb-2">{existingAttachments.length > 0 ? 'Добавить новые файлы' : 'Прикрепить файлы'}</label>
                            <FileUploader files={newFiles} setFiles={setNewFiles} maxFiles={MAX_FILES - existingAttachments.length} />
                        </div>
                        
                        {/* Причина редактирования */}
                        <div className="px-6 py-5 bg-yellow-50/50">
                           <label htmlFor="reason" className="block text-base font-semibold text-gray-800 mb-2">Причина редактирования</label>
                           <input
                             type="text"
                             id="reason"
                             name="reason"
                             value={editReason}
                             onChange={(e) => setEditReason(e.target.value)}
                             className={`w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 ${errors.reason ? 'border-red-500' : ''}`}
                             placeholder="Например: Исправление опечаток, удаление некорректной информации"
                           />
                           {errors.reason && <p className="mt-2 text-sm text-red-600">{errors.reason}</p>}
                           <p className="mt-2 text-xs text-gray-500">Это поле обязательно. Введенная причина будет видна автору заявки.</p>
                        </div>

                        {/* Кнопки */}
                        <div className="flex justify-end gap-4 px-6 py-4">
                            <button type="button" onClick={() => navigate(`/admin/requests/${id}`)} className="px-6 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 border">
                                Отмена
                            </button>
                            <button type="submit" disabled={isSubmitting} className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">
                                {isSubmitting ? 'Сохранение...' : 'Сохранить изменения'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AdminEditRequestPage; 