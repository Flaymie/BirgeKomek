import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { FaTrashAlt } from 'react-icons/fa';

const DeleteUserModal = ({ isOpen, onClose, onConfirm, username }) => {
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setReason('');
            setError('');
        }
    }, [isOpen]);

    const handleSubmit = () => {
        if (!reason.trim()) {
            setError('Причина удаления обязательна.');
            return;
        }
        if (reason.trim().length < 10) {
            setError('Причина должна быть не менее 10 символов.');
            return;
        }
        onConfirm(reason);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-[100] pt-20 md:pt-24 overflow-y-auto p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-auto">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                            <FaTrashAlt className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Удаление пользователя</h2>
                            <p className="text-sm text-gray-500">Вы собираетесь удалить <span className="font-semibold">{username}</span></p>
                        </div>
                    </div>

                    <p className="text-sm text-red-700 bg-red-50 p-3 rounded-lg border border-red-200 mb-4">
                        Это действие необратимо. Все данные пользователя, включая заявки, сообщения и отзывы, будут навсегда удалены.
                    </p>

                    <div>
                        <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                            Причина удаления <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 shadow-sm focus:border-red-500 focus:ring-1 focus:ring-red-200 transition resize-none"
                            rows="3"
                            placeholder="Опишите причину удаления..."
                            maxLength={200}
                        />
                        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
                    </div>
                </div>
                
                <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-lg">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Отмена
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                    >
                        Удалить и запросить код
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteUserModal;
