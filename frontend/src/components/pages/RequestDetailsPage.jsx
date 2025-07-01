import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { requestsService, usersService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { toast } from 'react-toastify';

import StatusBadge from '../shared/StatusBadge';
import UserCard from '../features/UserCard';
import ChatWindow from '../features/ChatWindow';
import ModeratorActions from '../admin/ModeratorActions';
import Spinner from '../shared/Spinner';

import { ShieldCheckIcon } from '@heroicons/react/24/outline';

const RequestDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser, isModerator, isAdmin } = useAuth();
    const { socket } = useSocket();

    const [request, setRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchRequest = useCallback(async () => {
        try {
            const response = await requestsService.getRequestById(id);
            setRequest(response.data);
        } catch (err) {
            console.error(err);
            setError('Не удалось загрузить данные заявки. Возможно, она была удалена.');
            toast.error('Ошибка при загрузке заявки.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchRequest();
    }, [fetchRequest]);

    useEffect(() => {
        if (!socket) return;
        
        const handleRequestUpdate = (updatedRequest) => {
            if (updatedRequest._id === id) {
                setRequest(prev => ({ ...prev, ...updatedRequest }));
            }
        };

        const handleRequestDeleted = ({ id: deletedId }) => {
            if (deletedId === id) {
                toast.warn('Эта заявка была удалена.');
                navigate('/requests');
            }
        };

        socket.on('request_updated', handleRequestUpdate);
        socket.on('request_deleted', handleRequestDeleted);

        return () => {
            socket.off('request_updated', handleRequestUpdate);
            socket.off('request_deleted', handleRequestDeleted);
        };
    }, [socket, id, navigate]);
    
    const handleTakeRequest = async () => {
        try {
            await requestsService.updateRequestStatus(id, 'assigned'); // Предполагается, что бекенд назначит текущего юзера
            toast.success('Вы взяли заявку в работу!');
            fetchRequest();
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Не удалось взять заявку');
        }
    };
    
    const handleCompleteRequest = async () => {
        // ... Логика завершения
    };
    
    if (loading) return <div className="flex justify-center items-center h-screen"><Spinner /></div>;
    if (error) return <div className="text-center text-red-500 font-bold mt-10">{error}</div>;
    if (!request) return null;

    const isAuthor = currentUser?._id === request.author._id;
    const isHelper = currentUser?._id === request.helper?._id;

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Основная колонка */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        {/* Заголовок */}
                        <div className="flex justify-between items-start mb-4">
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 break-words pr-4">
                                {request.title}
                            </h1>
                            <StatusBadge status={request.status} />
                        </div>

                        {/* Метка о редактировании */}
                        {request.editedByAdminInfo && (
                            <div className="my-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 rounded-r-lg">
                                <div className="flex items-center">
                                    <ShieldCheckIcon className="h-6 w-6 mr-3" />
                                    <div>
                                        <p className="font-semibold">Отредактировано модератором</p>
                                        <p className="text-sm italic">Причина: "{request.editedByAdminInfo.reason}"</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Детали заявки */}
                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500 mb-4">
                            <span>Предмет: <span className="font-medium text-gray-700">{request.subject}</span></span>
                            <span>Класс: <span className="font-medium text-gray-700">{request.grade}</span></span>
                            <span>Создана: <span className="font-medium text-gray-700">{new Date(request.createdAt).toLocaleString('ru-RU')}</span></span>
                        </div>

                        {/* Описание */}
                        <div className="prose max-w-none text-gray-800 whitespace-pre-wrap break-words">
                            <p>{request.description}</p>
                        </div>
                    </div>
                    
                    {/* Чат */}
                    {(isAuthor || isHelper || isModerator) && <ChatWindow request={request} />}
                </div>

                {/* Боковая колонка */}
                <div className="space-y-6">
                    <UserCard user={request.author} title="Автор запроса" />
                    {request.helper && <UserCard user={request.helper} title="Помощник" />}
                    
                    {/* Кнопки действий */}
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="font-bold text-lg mb-3">Действия</h3>
                        <div className="space-y-3">
                            {currentUser && !isAuthor && !request.helper && request.status === 'open' && (
                                <button onClick={handleTakeRequest} className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition">
                                    Взять в работу
                                </button>
                            )}
                             {/* Другие кнопки действий для автора и хелпера */}
                        </div>
                    </div>

                    {/* Панель модератора */}
                    {(isModerator || isAdmin) && (
                        <ModeratorActions request={request} onUpdateRequest={fetchRequest} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default RequestDetailsPage; 