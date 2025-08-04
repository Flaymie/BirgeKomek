import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { api } from '../../services/api';
import AvatarUpload from '../layout/AvatarUpload';

const AdminEditProfileModal = ({ isOpen, onClose, user, onConfirm }) => {
    const [userData, setUserData] = useState({});
    const [reason, setReason] = useState('');
    const [subjects, setSubjects] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user && isOpen) {
            setUserData({
                username: user.username || '',
                phone: user.phone || '',
                location: user.location || '',
                grade: user.grade || '',
                bio: user.bio || '',
                avatar: user.avatar,
            });
            setSubjects(user.subjects?.join(', ') || '');
            setReason('');
        }
    }, [user, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setUserData(prev => ({ ...prev, [name]: value }));
    };

    const handleAvatarUpload = async (file) => {
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append('avatar', file);
            const { data } = await api.post('/upload/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setUserData(prev => ({ ...prev, avatar: data.filePath }));
            toast.success('Аватар успешно загружен!');
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Ошибка загрузки аватара.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = () => {
        if (!reason.trim()) {
            toast.error('Необходимо указать причину редактирования.');
            return;
        }
        
        const finalUserData = { ...userData };
        if (user?.roles.helper) {
            finalUserData.subjects = subjects.split(',').map(s => s.trim()).filter(Boolean);
        }

        onConfirm(finalUserData, reason);
    };

    if (!isOpen || !user) return null;

    const inputStyles = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 md:p-8 max-w-2xl w-full mx-4 shadow-2xl transform transition-all relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <XMarkIcon className="h-6 w-6" />
                </button>
                <h3 className="text-2xl font-bold mb-6 text-gray-800">{`Редактирование профиля: ${user.username}`}</h3>
                
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-4 -mr-4 custom-scrollbar">
                    <div className="flex justify-center mb-6">
                        <AvatarUpload currentAvatar={userData.avatar} onUpload={handleAvatarUpload} isLoading={isLoading} />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Никнейм</label>
                            <input type="text" name="username" value={userData.username} onChange={handleChange} className={inputStyles} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Телефон</label>
                            <input type="text" name="phone" value={userData.phone} onChange={handleChange} className={inputStyles} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Город</label>
                            <input type="text" name="location" value={userData.location} onChange={handleChange} className={inputStyles} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Класс</label>
                            <input type="text" name="grade" value={userData.grade} onChange={handleChange} className={inputStyles} />
                        </div>
                        
                        {user.roles.helper && (
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Предметы (через запятую)</label>
                                <input type="text" name="subjects" value={subjects} onChange={(e) => setSubjects(e.target.value)} className={inputStyles} />
                            </div>
                        )}

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">О себе (Bio)</label>
                            <textarea name="bio" value={userData.bio} onChange={handleChange} rows="4" className={inputStyles} />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Причина редактирования</label>
                            <textarea name="reason" value={reason} onChange={(e) => setReason(e.target.value)} rows="2" className={`${inputStyles} border-gray-300 focus:border-indigo-500 focus:ring-indigo-500`} placeholder="Обязательно для заполнения" />
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-4 border-t pt-5">
                    <button type="button" onClick={onClose} className="btn btn-secondary">Отмена</button>
                    <button type="button" onClick={handleSubmit} disabled={isLoading || !reason.trim()} className="btn btn-primary">Сохранить и запросить код</button>
                </div>
            </div>
        </div>
    );
};

export default AdminEditProfileModal;