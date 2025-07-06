import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { requestsService, usersService, serverURL } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { toast } from 'react-toastify';

import StatusBadge from '../shared/StatusBadge';
import Loader from '../shared/Loader'; // ИСПРАВЛЕННЫЙ ПРАВИЛЬНЫЙ ПУТЬ и ИМЯ

import { ShieldCheckIcon, PaperClipIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

const RequestDetailsPage = () => {
    console.log('--- RequestDetailsPage РЕНДЕРИТСЯ ---');
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser, isModerator, isAdmin } = useAuth();
    const { socket } = useSocket();

    const [request, setRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

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
                setRequest(prevRequest => ({
                    ...prevRequest,
                    ...updatedRequest,
                    attachments: updatedRequest.attachments || prevRequest.attachments,
                }));
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
            await requestsService.updateRequestStatus(id, 'assigned');
            toast.success('Вы взяли заявку в работу!');
            fetchRequest();
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Не удалось взять заявку');
        }
    };
    
    const handleCompleteRequest = async () => {
        // ... Логика завершения
    };
    
    if (loading) return <div className="flex justify-center items-center h-screen"><Loader /></div>;
    if (error) return <div className="text-center text-red-500 font-bold mt-10">{error}</div>;
    if (!request) return null;

    const isAuthor = currentUser?._id === request.author._id;
    const isHelper = currentUser?._id === request.helper?._id;

    const description_cutoff = 300;
    const isLongDescription = request.description.length > description_cutoff;

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Основная колонка */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-md min-w-0">
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
                        <div className="mt-4 text-gray-800">
                            <p className="whitespace-pre-wrap break-words">
                                {isLongDescription && !isDescriptionExpanded 
                                    ? `${request.description.substring(0, description_cutoff)}...`
                                    : request.description
                                }
                            </p>
                            {isLongDescription && (
                                <button 
                                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                    className="text-blue-600 hover:text-blue-800 font-semibold mt-2"
                                >
                                    {isDescriptionExpanded ? 'Свернуть' : 'Читать далее'}
                                </button>
                            )}
                        </div>

                        {/* Вложения */}
                        {request.attachments && request.attachments.length > 0 && (
                            <div className="mt-6 pt-4 border-t border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                                    <PaperClipIcon className="h-6 w-6 mr-2 text-gray-500" />
                                    Вложения ({request.attachments.length})
                                </h3>
                                <ul className="space-y-2">
                                    {request.attachments.map((file, index) => (
                                        <li key={index}>
                                            <a
                                                href={`${serverURL}${file.path}`}
                                                download={file.originalName}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 p-3 rounded-lg transition-colors duration-150 group"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <span className="text-sm text-gray-800 font-medium truncate" title={file.originalName}>
                                                        {file.originalName}
                                                    </span>
                                                    <span className="text-xs text-gray-500 flex-shrink-0">
                                                        ({(file.size / 1024 / 1024).toFixed(2)} МБ)
                                                    </span>
                                                </div>
                                                <ArrowDownTrayIcon className="h-5 w-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                    
                    {/* Чат */}
                    {/* {(isAuthor || isHelper || isModerator) && <ChatWindow request={request} />} */}
                </div>

                {/* Боковая колонка */}
                <div className="space-y-6">
                    {/* <UserCard user={request.author} title="Автор запроса" /> */}
                    {/* {request.helper && <UserCard user={request.helper} title="Помощник" />} */}
                    
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
                    {/* {(isModerator || isAdmin) && (
                        <ModeratorActions request={request} onUpdateRequest={fetchRequest} />
                    )} */}
                </div>
            </div>
        </div>
    );
};

export default RequestDetailsPage; 