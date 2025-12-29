import React, { useState, useEffect } from 'react';
import { FiShield, FiUserCheck } from 'react-icons/fi';
import classNames from 'classnames';

const ToggleSwitch = ({ label, icon, enabled, onChange }) => (
    <div
        onClick={onChange}
        className={classNames(
            "flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all duration-200 border",
            enabled
                ? 'bg-indigo-50 border-indigo-300'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
        )}
    >
        <div className="flex items-center">
            {icon}
            <span className="font-medium text-gray-800 ml-3">{label}</span>
        </div>
        <div className={classNames(
            "w-12 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out",
            enabled ? 'bg-indigo-600' : 'bg-gray-300'
        )}>
            <div className={classNames(
                "bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out",
                { 'translate-x-6': enabled }
            )} />
        </div>
    </div>
);


const ChangeRoleModal = ({ isOpen, onClose, onConfirm, user }) => {
    const [isModerator, setIsModerator] = useState(false);
    const [isHelper, setIsHelper] = useState(false);

    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && user?.roles) {
            setIsModerator(user.roles.moderator);
            setIsHelper(user.roles.helper);
            setIsLoading(false);
        }
    }, [isOpen, user]);

    const handleSubmit = async () => {
        if (isLoading) return;

        try {
            setIsLoading(true);
            await onConfirm({ isModerator, isHelper });
        } catch (err) {
            console.error('Error in ChangeRoleModal:', err);
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-[100] pt-20 md:pt-24 overflow-y-auto p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                            <FiShield className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Управление ролями</h2>
                            <p className="text-sm text-gray-500">Пользователь: <span className="font-semibold">{user?.username}</span></p>
                        </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-6">
                        Измените роли пользователя. Снятие роли хелпера автоматически вернет пользователю роль студента.
                        Действие потребует подтверждения через Telegram.
                    </p>

                    <div className="space-y-3">
                        <ToggleSwitch
                            label="Права модератора"
                            icon={<FiShield className="text-gray-500" />}
                            enabled={isModerator}
                            onChange={() => !isLoading && setIsModerator(!isModerator)}
                        />
                        <ToggleSwitch
                            label="Права хелпера"
                            icon={<FiUserCheck className="text-gray-500" />}
                            enabled={isHelper}
                            onChange={() => !isLoading && setIsHelper(!isHelper)}
                        />
                    </div>
                </div>

                <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-lg">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                        {isLoading && (
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        {isLoading ? 'Запрос кода...' : 'Сохранить и запросить код'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChangeRoleModal;
