import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { requestsService, responsesService, usersService, serverURL } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import ResponseModal from '../modals/ResponseModal';
import ResponseCard from '../ResponseCard';
import AdminEditModal from '../modals/AdminEditModal';
import AdminDeleteModal from '../modals/AdminDeleteModal';
import RequestNotFound from '../shared/RequestNotFound';
import { useSocket } from '../../context/SocketContext';
import StatusBadge from '../shared/StatusBadge';
import RoleBadge from '../shared/RoleBadge';
import { CheckBadgeIcon, PencilSquareIcon, TrashIcon, Cog6ToothIcon, ChatBubbleLeftRightIcon, PaperAirplaneIcon, ArrowUturnLeftIcon, UserCircleIcon, CalendarIcon, TagIcon, EyeIcon, PaperClipIcon, ArrowDownTrayIcon, DocumentIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import ModeratorActionConfirmModal from '../modals/ModeratorActionConfirmModal';
import ConfirmDeleteModal from '../modals/ConfirmDeleteModal';
import { motion } from 'framer-motion';
import { downloadFile } from '../../services/downloadService';
import ReportModal from '../modals/ReportModal';
import ImageViewerModal from '../modals/ImageViewerModal';

 


const RequestDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
  const location = useLocation();
    const [request, setRequest] = useState(null);
    const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
  const [responses, setResponses] = useState([]);
  const [responsesLoading, setResponsesLoading] = useState(true);
  const { currentUser, loading: authLoading } = useAuth();
  const { socket } = useSocket();
  const [myResponse, setMyResponse] = useState(null);
  
  const [isAdminEditModalOpen, setAdminEditModalOpen] = useState(false);
  const [isAdminDeleteModalOpen, setAdminDeleteModalOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // НОВЫЕ СТЕЙТЫ ДЛЯ ПОДТВЕРЖДЕНИЯ
  const [isConfirmingModAction, setIsConfirmingModAction] = useState(false);
  const [modActionArgs, setModActionArgs] = useState(null);
  const [modActionLoading, setModActionLoading] = useState(false);

  // НОВАЯ ЛОГИКА ДЛЯ ВЛОЖЕНИЙ
  const isImageFile = (fileName = '') => {
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const fileExtension = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
    return imageExtensions.includes(fileExtension);
  };

  const handlePreviewClick = (file) => {
    if (isImageFile(file.originalName)) {
      const imageUrl = file.path.startsWith('http') ? file.path : `${serverURL}${file.path}`;
      setLightboxImage(imageUrl);
    }
  };
  
  // Определяем, откуда пришел пользователь
  const fromMyRequests = location.state?.from === '/my-requests';

  // НОВЫЙ СТЕЙТ ДЛЯ ПОЛНЫХ ДАННЫХ ЮЗЕРОВ
  const [authorProfile, setAuthorProfile] = useState(null);
  const [helperProfile, setHelperProfile] = useState(null);

  // НОВЫЙ СТЕЙТ ДЛЯ ПРОФИЛЕЙ ИЗ ОТКЛИКОВ
  const [responderProfiles, setResponderProfiles] = useState({});

  // НОВЫЙ ЭФФЕКТ ДЛЯ ПОДГРУЗКИ ПОЛНЫХ ПРОФИЛЕЙ
  useEffect(() => {
    const fetchFullUserData = async (user, setUserProfile) => {
      if (!user?._id) return;
      try {
        const res = await usersService.getUserById(user._id);
        setUserProfile(res.data);
      } catch (error) {
        console.error(`Failed to fetch full profile for ${user.username}`, error);
        // Если не удалось, оставляем урезанные данные из заявки
        setUserProfile(user);
      }
    };

    if (request?.author) {
      fetchFullUserData(request.author, setAuthorProfile);
    }
    if (request?.helper) {
      fetchFullUserData(request.helper, setHelperProfile);
    }
  }, [request]);

  useEffect(() => {
    if (authLoading) return;

    if (!currentUser) {
      navigate('/login', { state: { message: 'Для просмотра этой страницы необходимо авторизоваться' } });
      return;
    }

    const fetchRequestDetails = async () => {
        try {
        setLoading(true);
            const response = await requestsService.getRequestById(id);
            setRequest(response.data);
        setError(null);
        } catch (err) {
        if (err.response?.status !== 404 && err.response?.status !== 400) {
          console.error('Ошибка при получении данных запроса:', err);
          toast.error(err.response?.data?.msg || 'Произошла ошибка при загрузке данных запроса');
        }
        if (err.response && err.response.status === 401) {
          navigate('/login', { state: { message: 'Сессия истекла, пожалуйста, авторизуйтесь снова' } });
          return;
        }
        setError(true);
        } finally {
            setLoading(false);
      }
    };
    
    fetchRequestDetails();
  }, [id, navigate, currentUser, authLoading]);

  const isAuthor = useMemo(() => {
    return request && currentUser && request.author._id === currentUser._id;
  }, [request, currentUser]);

  const fetchResponses = useCallback(async () => {
    try {
      setResponsesLoading(true);
      const response = await responsesService.getResponsesForRequest(id);
      setResponses(response.data);
    } catch (err) {
      console.error('Ошибка при получении откликов:', err);
    } finally {
      setResponsesLoading(false);
        }
    }, [id]);

    useEffect(() => {
    fetchResponses();
  }, [fetchResponses]);

  useEffect(() => {
    // Этот эффект будет обновлять myResponse, если он изменился в общем списке
    // (например, после создания через модалку или получения по сокету)
    const ownResponse = responses.find(r => r.helper._id === currentUser?._id);
    setMyResponse(ownResponse || null);
  }, [responses, currentUser]);

    useEffect(() => {
        if (!socket) return;
        
    const handleNewResponse = (newResponse) => {
      if (newResponse.request === id) {
        setResponses(prev => [...prev, newResponse]);
            }
        };

    const handleResponseUpdate = (updatedResponse) => {
      setResponses(prev => prev.map(r => r._id === updatedResponse._id ? updatedResponse : r));
      if (updatedResponse.helper._id === currentUser?._id) {
        setMyResponse(updatedResponse);
            }
        };

    socket.on('new_response', handleNewResponse);
    socket.on('response_updated', handleResponseUpdate);

        return () => {
      socket.off('new_response', handleNewResponse);
      socket.off('response_updated', handleResponseUpdate);
        };
  }, [socket, id, currentUser]);

  const isPrivilegedUser = useMemo(() => {
    return currentUser?.roles?.admin || currentUser?.roles?.moderator;
  }, [currentUser]);
    
  // Обработчик удаления запроса
  const handleDeleteRequest = async () => {
        try {
      await requestsService.deleteRequest(id);
      toast.success('Запрос успешно удален');
      // После удаления перенаправляем на страницу "Мои запросы"
      navigate('/my-requests');
    } catch (err) {
      console.error('Ошибка при удалении запроса:', err);
      toast.error(err.response?.data?.msg || 'Произошла ошибка при удалении запроса');
    }
  };

  const handleAdminEdit = (reason) => {
    setAdminEditModalOpen(false);
    navigate(`/request/${id}/edit`, { state: { editReason: reason, fromAdmin: true } });
  };
  
  const confirmAdminDelete = useCallback(async (confirmationCode) => {
    if (!modActionArgs) return;
    
    setModActionLoading(true);
    try {
      await requestsService.deleteRequest(id, { 
        deleteReason: modActionArgs.reason, 
        confirmationCode 
      });
      toast.success('Заявка успешно удалена модератором');
      setIsConfirmingModAction(false);
      navigate('/requests');
    } catch (err) {
      console.error('Ошибка при подтверждении удаления:', err);
      toast.error(err.response?.data?.msg || 'Не удалось удалить заявку');
      // Закрываем модалку при ошибке
      setIsConfirmingModAction(false);
    } finally {
      setModActionLoading(false);
      setModActionArgs(null); // Очищаем аргументы
    }
  }, [id, modActionArgs, navigate]);

  const handleAdminDelete = async (reason) => {
    setAdminDeleteModalOpen(false); // Сразу закрываем первую модалку
    try {
      // Первая попытка без кода
      await requestsService.deleteRequest(id, { deleteReason: reason });
      toast.success('Заявка успешно удалена модератором');
      navigate('/requests');
        } catch (err) {
      if (err.response && err.response.data.confirmationRequired) {
        // Если требуется код
        setModActionArgs({ reason }); // Сохраняем причину для второго шага
        setIsConfirmingModAction(true); // Открываем модалку с кодом
        toast.info(err.response.data.message);
      } else {
        // Если другая ошибка
        console.error('Ошибка при удалении:', err);
        toast.error(err.response?.data?.msg || 'Не удалось удалить заявку');
      }
        }
    };
    
  // Обработка действий с откликами (принятие/отклонение)
  const handleResponseAction = (action, responseId) => {
    if (action === 'accepted') {
      navigate(`/requests/${id}/chat`);
    }
    // Обновляем список откликов после действия
    fetchResponses();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Проверка, является ли пользователь хелпером
  const isHelper = () => {
    return currentUser?.roles?.helper === true || 
           currentUser?.roles?.moderator === true || 
           currentUser?.roles?.admin === true;
  };
  
  // Функция для преобразования текста с специальными символами в HTML
  const formatDescription = (text) => {
    if (!text) return '';
    // Заменяем HTML-сущности на соответствующие символы
    return text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  };

  // Новая переменная для проверки, может ли хелпер откликнуться
  const canHelperRespond = useMemo(() => {
    if (!currentUser || !request) return false;
    return currentUser.roles.helper && 
           request.status === 'open' && 
           request.author._id !== currentUser._id && 
           !myResponse;
  }, [currentUser, request, myResponse]);

  useEffect(() => {
    const fetchResponderProfiles = async () => {
      if (responses.length === 0) return;

      // 1. Собираем уникальные ID всех хелперов из откликов, ИГНОРИРУЯ ПУСТЫЕ
      const responderIds = [...new Set(
        responses
          .filter(r => r.helper)
          .map(r => r.helper._id)
      )];
      
      if (responderIds.length === 0) return; // Если все отклики от удаленных юзеров

      // 2. Делаем запросы для каждого ID
      const profilePromises = responderIds.map(id => usersService.getUserById(id));

      try {
        const profileResponses = await Promise.all(profilePromises);
        // 3. Создаем карту { userId: fullProfile }
        const profilesMap = profileResponses.reduce((acc, res) => {
          acc[res.data._id] = res.data;
          return acc;
        }, {});
        setResponderProfiles(profilesMap);
      } catch (error) {
        console.error('Failed to fetch responder profiles', error);
      }
    };

    fetchResponderProfiles();

  }, [request, responses]);

  // ИСПРАВЛЕНИЕ: Переменная для скрытия пустого блока "Действия"
  const showActionsBlock =
    request && ( // <-- ВОТ ОН, СПАСИТЕЛЬНЫЙ КРЮК
      (isAuthor && request.status === 'open') ||
      (request.status === 'in_progress' && (isAuthor || request.helper?._id === currentUser?._id)) ||
      (request.status === 'open' && !isAuthor && !isHelper()) ||
      (['closed', 'completed', 'cancelled'].includes(request.status))
    );

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return <RequestNotFound />;
  }

  if (!request) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Запрос не найден</h2>
          <Link 
            to={fromMyRequests ? "/my-requests" : "/requests"}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {fromMyRequests ? "Вернуться к моим запросам" : "Вернуться к списку запросов"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero Section */}
      <div className="bg-white pt-12 pb-12">
        <div className="container mx-auto px-4">
          <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.5 }}
          >
        <Link 
          to={fromMyRequests ? "/my-requests" : "/requests"}
              className="inline-flex items-center text-sm font-semibold text-gray-600 hover:text-primary-600 transition-colors mb-4"
            >
              <ArrowUturnLeftIcon className="h-4 w-4 mr-2" />
              {fromMyRequests ? "К моим запросам" : "Ко всем запросам"}
        </Link>
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
               <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
                                {request.title}
                            </h1>
              <StatusBadge status={request.status} large />
            </div>
              {request.editReason && (
              <p 
                className="mt-2 text-sm text-gray-500 italic"
                  title={`Причина редактирования: ${request.editReason}`}
                >
                (отредактировано модератором)
              </p>
              )}
          </motion.div>
            </div>
                        </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Левая (основная) колонка */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-2 space-y-8"
          >
            {/* Описание */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Описание запроса</h2>
              <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
                {formatDescription(request.description)}
              </div>
            </div>

            {/* Вложения */}
            {request.attachments && request.attachments.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                      <PaperClipIcon className="h-6 w-6 mr-2 text-gray-400" />
                      Вложения ({request.attachments.length})
                  </h3>
                  <ul className="space-y-3">
                      {request.attachments.map((file, index) => (
                          <li key={index} className="flex items-center justify-between bg-gray-50 p-2.5 rounded-lg">
                              <div className="flex items-center gap-4 min-w-0 flex-1">
                                  {/* Иконка или миниатюра */}
                                  <div
                                      className={`flex-shrink-0 ${isImageFile(file.originalName) ? 'cursor-pointer' : ''}`}
                                      onClick={() => handlePreviewClick(file)}
                                  >
                                      {isImageFile(file.originalName) ? (
                                          <img src={file.path.startsWith('http') ? file.path : `${serverURL}${file.path}`} alt={file.originalName} className="h-14 w-14 object-cover rounded-md bg-gray-200 hover:ring-2 hover:ring-primary-500 transition-all" />
                                      ) : (
                                          <div className="h-14 w-14 flex items-center justify-center bg-gray-200 rounded-md">
                                              <DocumentIcon className="h-8 w-8 text-gray-500" />
                                          </div>
                                      )}
                                  </div>
                                  {/* Имя и размер файла */}
                                  <div className="min-w-0">
                                      <p className="text-sm text-gray-800 font-medium truncate" title={file.originalName}>
                                          {file.originalName}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                          ({(file.size / 1024 / 1024).toFixed(2)} МБ)
                                      </p>
                                    </div>
                                </div>
                              {/* Кнопка скачать */}
                              <button
                                  onClick={() => downloadFile({ 
                                    fileUrl: file.path, 
                                    fileName: file.originalName 
                                  })}
                                  className="ml-4 flex-shrink-0 p-2 rounded-full hover:bg-gray-200 transition-colors group"
                                  title="Скачать"
                              >
                                  <ArrowDownTrayIcon className="h-6 w-6 text-gray-500 group-hover:text-primary-600" />
                              </button>
                          </li>
                      ))}
                  </ul>
              </div>
            )}

            {/* ИСПРАВЛЕНИЕ: ПРАВИЛЬНАЯ ЛОГИКА ОТОБРАЖЕНИЯ БЛОКА ОТКЛИКА */}
            {/* Показываем блок, только если пользователь НЕ автор И (он может откликнуться ИЛИ он уже откликнулся) */}
            {!isAuthor && (canHelperRespond || myResponse) && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                 <h2 className="text-xl font-bold text-gray-800 mb-4">Ваш отклик</h2>
                {canHelperRespond && (
                    <button
                      onClick={() => setIsResponseModalOpen(true)}
                    className="btn btn-primary w-full inline-flex items-center justify-center gap-2"
                    >
                    <PaperAirplaneIcon className="h-5 w-5" />
                      Предложить помощь
                    </button>
                )}
                {myResponse && <ResponseCard response={myResponse} isMyResponse={true} fullHelperProfile={responderProfiles[myResponse.helper._id] || currentUser} />}
                            </div>
                        )}

            {/* Отклики для автора */}
      {isAuthor && request.status === 'open' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">
            Отклики ({responses.length})
                </h2>
          {responsesLoading ? (
                  <div className="text-center py-6 text-gray-500">Загрузка откликов...</div>
          ) : responses.length > 0 ? (
            <div className="space-y-4">
              {responses.map(response => (
                <ResponseCard 
                  key={response._id} 
                  response={response}
                        fullHelperProfile={responderProfiles[response.helper?._id]}
                  isAuthor={isAuthor} 
                  onResponseAction={handleResponseAction} 
                />
              ))}
            </div>
          ) : (
                  <div className="text-center py-6 text-gray-500">На ваш запрос пока нет откликов.</div>
          )}
                        </div>
      )}
          </motion.div>

          {/* Правая (сайдбар) колонка */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="lg:col-span-1 space-y-8"
          >
            {/* ИСПРАВЛЕНИЕ: Скрываем блок, если он пустой */}
            {showActionsBlock && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                 <h3 className="text-xl font-bold text-gray-800 mb-4">Действия</h3>
                 <div className="space-y-3">
                  {isAuthor && request.status === 'open' && (
                    <>
                      <button
                        onClick={() => navigate(`/request/${request._id}/edit`)}
                        className="btn btn-primary-outline w-full inline-flex items-center justify-center gap-2"
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                        Редактировать
                      </button>
                      <button
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="btn btn-danger-outline w-full inline-flex items-center justify-center gap-2"
                      >
                         <TrashIcon className="h-5 w-5" />
                        Удалить
                      </button>
                    </>
                  )}
                   {request.status === 'in_progress' && (isAuthor || request.helper?._id === currentUser?._id) && (
                                <button 
                        className="btn bg-green-600 hover:bg-green-700 text-white w-full inline-flex items-center justify-center gap-2"
                        onClick={() => navigate(`/requests/${request._id}/chat`)}
                                >
                       <ChatBubbleLeftRightIcon className="h-5 w-5" />
                       Перейти в чат
                                </button>
                            )}
                   {request.status === 'open' && !isAuthor && !isHelper() && (
                      <div className="text-center text-sm text-gray-500">Чтобы помочь, вам нужен статус хелпера.</div>
                   )}
                   {currentUser && !isAuthor && (
                    <button
                        onClick={() => setIsReportModalOpen(true)}
                        className="btn bg-red-100 text-red-700 hover:bg-red-200 w-full inline-flex items-center justify-center gap-2"
                      >
                        <ExclamationTriangleIcon className="h-5 w-5" />
                        Пожаловаться
                      </button>
                   )}
                   {['closed', 'completed', 'cancelled'].includes(request.status) && (
                      <div className="text-center text-sm text-gray-500">Заявка закрыта, действия недоступны.</div>
          )}
          </div>
        </div>
      )}
      
            {/* Карта информации */}
            <div className="bg-white rounded-xl shadow-lg">
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Информация</h3>
                <ul className="space-y-4 text-sm">
                  <li className="flex items-center gap-3">
                    <UserCircleIcon className="h-6 w-6 text-gray-400" />
                    <div>
                      <span className="text-gray-500">Автор</span>
                      <div className="font-semibold text-gray-800 flex items-center gap-1">
                        <Link to={`/profile/${request.author.username}`} className="hover:text-primary-600 hover:underline">
                          {request.author.username}
                        </Link>
                        <RoleBadge user={authorProfile} />
                        </div>
                    </div>
                  </li>
                   {request.helper && (
                     <li className="flex items-center gap-3">
                        <CheckBadgeIcon className="h-6 w-6 text-green-500" />
                        <div>
                          <span className="text-gray-500">Помогает</span>
                          <div className="font-semibold text-gray-800 flex items-center gap-1">
                            <Link to={`/profile/${request.helper.username}`} className="hover:text-primary-600 hover:underline">
                              {request.helper.username}
                            </Link>
                            <RoleBadge user={helperProfile} />
                </div>
                        </div>
                     </li>
                   )}
                  <li className="flex items-center gap-3">
                    <CalendarIcon className="h-6 w-6 text-gray-400" />
                    <div>
                      <span className="text-gray-500">Создана</span>
                      <p className="font-semibold text-gray-800">{formatDate(request.createdAt)}</p>
                    </div>
                  </li>
                  <li className="flex items-center gap-3">
                    <TagIcon className="h-6 w-6 text-gray-400" />
                    <div>
                      <span className="text-gray-500">Предмет</span>
                      <p className="font-semibold text-gray-800">{request.subject}</p>
                    </div>
                  </li>
                </ul>
                </div>
            </div>

            {/* Панель модератора */}
            {isPrivilegedUser && !isAuthor && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Cog6ToothIcon className="h-6 w-6"/>Панель модератора</h3>
                <div className="space-y-3">
                  <button
                      onClick={() => setAdminEditModalOpen(true)}
                        className="btn btn-primary-outline w-full inline-flex items-center justify-center gap-2"
                  >
                        <PencilSquareIcon className="h-5 w-5" />
                      Редактировать
                  </button>
                  <button
                      onClick={() => setAdminDeleteModalOpen(true)}
                        className="btn btn-danger w-full inline-flex items-center justify-center gap-2"
                  >
                        <TrashIcon className="h-5 w-5" />
                      Удалить
                  </button>
              </div>
          </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Модальные окна */}
      <ImageViewerModal src={lightboxImage} alt="Предпросмотр вложения" onClose={() => setLightboxImage(null)} />
      <AdminEditModal isOpen={isAdminEditModalOpen} onClose={() => setAdminEditModalOpen(false)} onConfirm={handleAdminEdit} requestTitle={request.title} />
      <AdminDeleteModal isOpen={isAdminDeleteModalOpen} onClose={() => setAdminDeleteModalOpen(false)} onConfirm={handleAdminDelete} requestTitle={request.title} />
      <ResponseModal isOpen={isResponseModalOpen} onClose={() => setIsResponseModalOpen(false)} requestId={id} />
      <ConfirmDeleteModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDeleteRequest} title="Подтверждение удаления" body="Вы уверены, что хотите удалить этот запрос? Это действие нельзя отменить." />
      <ModeratorActionConfirmModal isOpen={isConfirmingModAction} onClose={() => setIsConfirmingModAction(false)} onConfirm={confirmAdminDelete} actionTitle={`Удаление заявки "${request?.title}"`} isLoading={modActionLoading} />
      {isReportModalOpen && (
        <ReportModal
            isOpen={isReportModalOpen}
            onClose={() => setIsReportModalOpen(false)}
            targetId={request._id}
            targetType="Request"
            targetName={`"${request.title}"`}
        />
      )}
        </div>
    );
};

export default RequestDetailPage; 