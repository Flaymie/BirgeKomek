import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, usersService } from '../../../services/api';
import { toast } from 'react-toastify';
import { formatAvatarUrl } from '../../../services/avatarUtils';
import RoleBadge from '../../shared/RoleBadge';
import { FaGavel } from 'react-icons/fa';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import BanUserModal from '../../modals/BanUserModal';
import ChangeRoleModal from '../../modals/ChangeRoleModal';
import AdminActionConfirmModal from '../../modals/AdminActionConfirmModal';
import DeleteUserModal from '../../modals/DeleteUserModal';

const Loader = () => (
    <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
    </div>
);

const UserDetailsPage = () => {
    const { id } = useParams();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isBanModalOpen, setIsBanModalOpen] = useState(false);
    const [isChangeRoleModalOpen, setIsChangeRoleModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [actionToConfirm, setActionToConfirm] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const navigate = useNavigate();


    const fetchUserDetails = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await api.get(`/admin/users/${id}`);
            setUser(data);
        } catch (err) {
            console.error("Ошибка при загрузке данных пользователя:", err);
            setError('Не удалось загрузить данные. Пользователь не найден или у вас нет прав.');
            toast.error(err.response?.data?.msg || 'Ошибка загрузки данных');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchUserDetails();
    }, [fetchUserDetails]);

    const handleBanUser = async (reason, duration) => {
        try {
            const res = await usersService.banUser(id, reason, duration);
            toast.success(res.data.msg || `Пользователь ${user.username} забанен.`);
            setIsBanModalOpen(false);
            fetchUserDetails(); // Обновляем инфу
        } catch (err) {
            // Ошибку с 2FA пока не обрабатываем, но она будет здесь
            toast.error(err.response?.data?.msg || 'Не удалось забанить пользователя.');
        }
    };
    
    const handleUnbanUser = async () => {
        try {
            const res = await usersService.unbanUser(id);
            toast.success(res.data.msg || `Пользователь ${user.username} разбанен.`);
            fetchUserDetails(); // Обновляем инфу
        } catch (err) {
             toast.error(err.response?.data?.msg || 'Не удалось разбанить пользователя.');
        }
    };
    
    // Функция-триггер для смены роли
    const handleChangeRole = async (roles) => {
        try {
            // Этап 1: Отправляем запрос без кода
            await api.put(`/admin/users/${id}/roles`, roles);
        } catch (err) {
            if (err.response?.data?.confirmationRequired) {
                // Если нужен код, сохраняем действие и открываем модалку подтверждения
                setActionToConfirm(() => (confirmationCode) => 
                    api.put(`/admin/users/${id}/roles`, { ...roles, confirmationCode })
                );
                setIsChangeRoleModalOpen(false); // Закрываем модалку выбора ролей
                setIsConfirmModalOpen(true);     // Открываем модалку ввода кода
                toast.info('Код для подтверждения отправлен в Telegram.');
            } else {
                toast.error(err.response?.data?.msg || 'Не удалось изменить роли.');
            }
        }
    };

    // Функция-триггер для удаления
    const handleDeleteUser = async (reason) => {
        try {
            await api.post(`/admin/users/${id}/delete`, { reason });
        } catch (err) {
            if (err.response?.data?.confirmationRequired) {
                setActionToConfirm(() => (confirmationCode) =>
                    api.post(`/admin/users/${id}/delete`, { reason, confirmationCode })
                );
                setIsDeleteModalOpen(false);
                setIsConfirmModalOpen(true);
                toast.info('Код для подтверждения отправлен в Telegram.');
            } else {
                toast.error(err.response?.data?.msg || 'Не удалось удалить пользователя.');
            }
        }
    };

    // Функция для выполнения подтвержденного действия
    const handleConfirmAction = async (confirmationCode) => {
        if (!actionToConfirm) return;

        setActionLoading(true);
        try {
            const res = await actionToConfirm(confirmationCode);
            toast.success(res.data.msg || 'Действие успешно выполнено!');
            
            // Если это было удаление, редиректим на список
            if (res.config.url.endsWith('/delete')) {
                navigate('/admin/users');
            } else {
                setUser(res.data.user); // Обновляем данные пользователя
            }
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Ошибка при подтверждении действия.');
        } finally {
            setActionLoading(false);
            setIsConfirmModalOpen(false);
            setActionToConfirm(null);
        }
    };


    if (loading) return <Loader />;
    if (error) return (
        <div className="container mx-auto p-8 text-center text-red-500">
            <h2 className="text-2xl">{error}</h2>
            <Link to="/admin/users" className="text-indigo-600 hover:underline mt-4 inline-block">
                Вернуться к списку пользователей
            </Link>
        </div>
    );
    if (!user) return null;

    const BanInfo = ({ banDetails }) => {
        if (!banDetails?.isBanned) return null;
        const expiration = banDetails.expiresAt
            ? `до ${new Date(banDetails.expiresAt).toLocaleString('ru-RU')}`
            : 'навсегда';

        return (
            <div className="bg-red-100 border border-red-300 rounded-lg p-4 mb-6" role="alert">
                <div className="flex items-center">
                    <FaGavel className="h-6 w-6 text-red-600 mr-3" />
                    <div>
                        <p className="font-bold text-red-800">ПОЛЬЗОВАТЕЛЬ ЗАБЛОКИРОВАН ({expiration})</p>
                        {banDetails.reason && <p className="text-sm text-red-700">Причина: {banDetails.reason}</p>}
                        {banDetails.bannedBy && <p className="text-sm text-red-700">Кем: {banDetails.bannedBy.username}</p>}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="container mx-auto px-4 py-8">
                <div className="mb-4">
                    <Link to="/admin/users" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-indigo-600">
                        <ArrowLeftIcon className="h-5 w-5 mr-2" />
                        К списку пользователей
                    </Link>
                </div>
                
                <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
                    <BanInfo banDetails={user.banDetails} />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="md:col-span-1 flex flex-col items-center text-center">
                            <img src={formatAvatarUrl(user)} alt={user.username} className="w-40 h-40 rounded-full border-4 border-gray-200" />
                            <h2 className="text-3xl font-bold mt-4">{user.username}</h2>
                            <div className="mt-2">
                                <RoleBadge user={user} />
                            </div>
                            <div className="mt-2 text-sm text-gray-500">
                                {user.isOnline ? (
                                    <span className="flex items-center text-green-600">
                                        <span className="h-2 w-2 mr-1.5 bg-green-500 rounded-full"></span>
                                        Онлайн
                                    </span>
                                ) : (
                                    <span className="flex items-center">
                                        <span className="h-2 w-2 mr-1.5 bg-gray-400 rounded-full"></span>
                                        Был(а) в сети {new Date(user.lastSeen).toLocaleString('ru-RU')}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <h3 className="text-xl font-semibold border-b pb-2 mb-4">Основная информация</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                <div>
                                    <h4 className="font-semibold text-gray-600">ID пользователя</h4>
                                    <p className="font-mono text-gray-800 break-all">{user._id}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-600">Телефон</h4>
                                    <p className="text-gray-800">{user.phone || 'Не указан'}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-600">Telegram</h4>
                                    <p className="text-gray-800">{user.telegramUsername ? `@${user.telegramUsername}` : 'Не привязан'}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-600">Дата регистрации</h4>
                                    <p className="text-gray-800">{new Date(user.createdAt).toLocaleString('ru-RU')}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-600">Город</h4>
                                    <p className="text-gray-800">{user.location || 'Не указан'}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-600">Класс</h4>
                                    <p className="text-gray-800">{user.grade ? `${user.grade} класс` : 'Не указан'}</p>
                                </div>
                                {user.roles.helper && (
                                    <div>
                                        <h4 className="font-semibold text-gray-600">Рейтинг</h4>
                                        <p className="text-gray-800 font-bold text-lg text-indigo-600">{user.rating.toFixed(1)}</p>
                                    </div>
                                )}
                            </div>
                             <div className="mt-4">
                                <h4 className="font-semibold text-gray-600">О себе (Bio)</h4>
                                <p className="text-gray-800 mt-1 whitespace-pre-wrap bg-gray-50 p-3 rounded-md">{user.bio || 'Не заполнено'}</p>
                            </div>
                             {user.roles.helper && user.subjects?.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="font-semibold text-gray-600">Предметы (хелпер)</h4>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {user.subjects.map(subject => (
                                            <span key={subject} className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm font-medium rounded-full">{subject}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                             {user.registrationDetails && (
                                <>
                                    <h3 className="text-xl font-semibold border-b pb-2 my-4 pt-4">Данные при регистрации</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                        <div>
                                            <h4 className="font-semibold text-gray-600">IP-адрес</h4>
                                            <p className="font-mono text-gray-800">{user.registrationDetails.ip}</p>
                                        </div>
                                         <div>
                                            <h4 className="font-semibold text-gray-600">Очки подозрения</h4>
                                            <p className="text-gray-800 font-bold">{user.suspicionScore}</p>
                                        </div>
                                        {user.registrationDetails.ipInfo && (
                                            <>
                                                <div>
                                                    <h4 className="font-semibold text-gray-600">Страна / Город</h4>
                                                    <p className="text-gray-800">{user.registrationDetails.ipInfo.country || 'N/A'} / {user.registrationDetails.ipInfo.city || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-gray-600">Тип IP</h4>
                                                    <div className="flex gap-2 items-center flex-wrap">
                                                        {user.registrationDetails.ipInfo.isProxy && <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-red-600 bg-red-200">Прокси</span>}
                                                        {user.registrationDetails.ipInfo.isHosting && <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-yellow-600 bg-yellow-200">Хостинг</span>}
                                                        {!user.registrationDetails.ipInfo.isProxy && !user.registrationDetails.ipInfo.isHosting && <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-green-600 bg-green-200">Обычный</span>}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="mt-4">
                                        <h4 className="font-semibold text-gray-600">User-Agent</h4>
                                        <p className="font-mono text-xs text-gray-800 bg-gray-50 p-2 rounded-md break-all">{user.registrationDetails.userAgent}</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="mt-8 border-t pt-6">
                         <h3 className="text-xl font-semibold mb-4">Действия</h3>
                         <div className="flex flex-wrap gap-4">
                            {user.banDetails?.isBanned ? (
                                <button onClick={handleUnbanUser} className="btn btn-success">Разблокировать</button>
                            ) : (
                                <button onClick={() => setIsBanModalOpen(true)} className="btn btn-danger">Заблокировать</button>
                            )}
                            <button onClick={() => setIsChangeRoleModalOpen(true)} className="btn btn-secondary">Изменить роль</button>
                            <button onClick={() => setIsDeleteModalOpen(true)} className="btn btn-danger-outline">Удалить пользователя</button>
                         </div>
                    </div>
                </div>
            </div>
            <BanUserModal
                isOpen={isBanModalOpen}
                onClose={() => setIsBanModalOpen(false)}
                onConfirm={handleBanUser}
                username={user?.username}
            />
            <ChangeRoleModal
                isOpen={isChangeRoleModalOpen}
                onClose={() => setIsChangeRoleModalOpen(false)}
                onConfirm={handleChangeRole}
                user={user}
            />
            <DeleteUserModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteUser}
                username={user?.username}
            />
            <AdminActionConfirmModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleConfirmAction}
                isLoading={actionLoading}
                title="Подтвердите действие"
            />
        </div>
    );
};

export default UserDetailsPage;
