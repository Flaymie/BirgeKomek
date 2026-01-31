import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { XMarkIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { api } from '../../services/api';
import AvatarUpload from '../layout/AvatarUpload';
import { SafeMotionDiv } from '../shared/SafeMotion';
import Modal from './Modal';

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

    const handleSubmit = async () => {
        if (isLoading) return;

        if (!reason.trim()) {
            toast.error('Необходимо указать причину редактирования.');
            return;
        }

        const finalUserData = { ...userData };
        if (user?.roles.helper) {
            finalUserData.subjects = subjects.split(',').map(s => s.trim()).filter(Boolean);
        }

        try {
            setIsLoading(true);
            await onConfirm(finalUserData, reason);
        } catch (err) {
            console.error('Error in AdminEditProfileModal:', err);
            setIsLoading(false);
        }
    };

    if (!isOpen || !user) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <SafeMotionDiv
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Заголовок */}
                <div className="flex items-center justify-between p-5 border-b border-gray-200">
                    <div className="flex items-center gap-4">
                        <div className="bg-indigo-100 text-indigo-600 p-2.5 rounded-lg">
                            <UserCircleIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Редактирование профиля</h3>
                            <p className="text-sm text-gray-500">@{user.username}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* Контент */}
                <div className="overflow-y-auto p-5 space-y-4">
                    <div className="flex justify-center mb-4">
                        <AvatarUpload currentAvatar={userData.avatar} onUpload={handleAvatarUpload} isLoading={isLoading} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Никнейм</label>
                            <input
                                type="text"
                                name="username"
                                value={userData.username}
                                onChange={handleChange}
                                className="w-full px-4 py-2 text-base border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                            <input
                                type="text"
                                name="phone"
                                value={userData.phone}
                                onChange={handleChange}
                                className="w-full px-4 py-2 text-base border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Город</label>
                            <input
                                type="text"
                                name="location"
                                value={userData.location}
                                onChange={handleChange}
                                className="w-full px-4 py-2 text-base border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Класс</label>
                            <input
                                type="text"
                                name="grade"
                                value={userData.grade}
                                onChange={handleChange}
                                className="w-full px-4 py-2 text-base border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        {user.roles.helper && (
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Предметы (через запятую)</label>
                                <input
                                    type="text"
                                    name="subjects"
                                    value={subjects}
                                    onChange={(e) => setSubjects(e.target.value)}
                                    className="w-full px-4 py-2 text-base border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        )}

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">О себе (Bio)</label>
                            <textarea
                                name="bio"
                                value={userData.bio}
                                onChange={handleChange}
                                rows="3"
                                className="w-full px-4 py-2 text-base border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Причина редактирования *</label>
                            <textarea
                                name="reason"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows="2"
                                className="w-full px-4 py-2 text-base border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Обязательно для заполнения"
                            />
                        </div>
                    </div>
                </div>

                {/* Кнопки */}
                <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
                    >
                        Отмена
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isLoading || !reason.trim()}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Сохранить и запросить код
                    </button>
                </div>
            </SafeMotionDiv>
        </Modal>
    );
};

export default AdminEditProfileModal;
