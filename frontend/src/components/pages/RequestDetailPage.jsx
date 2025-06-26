import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { requestsService, responsesService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import ResponseModal from '../ResponseModal';
import ResponseCard from '../ResponseCard';
import AdminEditModal from '../modals/AdminEditModal';
import AdminDeleteModal from '../modals/AdminDeleteModal';
import RequestNotFound from '../shared/RequestNotFound';
import { useSocket } from '../../context/SocketContext';

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

  // Определяем, откуда пришел пользователь
  const fromMyRequests = location.state?.from === '/my-requests';

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
      const ownResponse = response.data.find(r => r.helper._id === currentUser?._id);
      setMyResponse(ownResponse || null);
    } catch (err) {
      console.error('Ошибка при получении откликов:', err);
    } finally {
      setResponsesLoading(false);
    }
  }, [id, currentUser]);

  useEffect(() => {
    fetchResponses();
  }, [fetchResponses]);

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
  
  const handleAdminDelete = async (reason) => {
    try {
      await requestsService.deleteRequest(id, { deleteReason: reason });
      toast.success('Заявка успешно удалена модератором');
      navigate('/requests');
    } catch (err) {
      console.error('Ошибка при удалении:', err);
      toast.error(err.response?.data?.msg || 'Не удалось удалить заявку');
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Открыта</span>;
      case 'in_progress':
        return <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">В процессе</span>;
      case 'completed':
        return <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">Завершена</span>;
      case 'cancelled':
        return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">Отменена</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">{status}</span>;
    }
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

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link 
          to={fromMyRequests ? "/my-requests" : "/requests"}
          className="text-blue-600 hover:text-blue-800 flex items-center"
          state={{ from: location.pathname }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          {fromMyRequests ? "Назад к моим запросам" : "Назад к списку запросов"}
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 mb-6">
        {/* Баннер для создателя запроса */}
        {isAuthor && (
          <div className="bg-blue-50 border-b border-blue-100 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span className="text-blue-700 font-medium">Вы автор этого запроса</span>
            </div>
          </div>
        )}
        
        <div className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 md:mb-0">
              {request.title}
              {request.editedByAdminInfo?.editorId && (
                 <span 
                    className="ml-2 text-sm text-gray-500 font-normal" 
                    title={`Отредактировано: ${new Date(request.editedByAdminInfo.editedAt).toLocaleString('ru-RU')}\nПричина: ${request.editedByAdminInfo.reason}`}
                 >
                    (изм. админом)
                 </span>
              )}
            </h1>
            {getStatusBadge(request.status)}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-3 rounded-md">
              <span className="text-sm text-gray-500 block">Предмет</span>
              <span className="font-medium">{request.subject}</span>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <span className="text-sm text-gray-500 block">Класс</span>
              <span className="font-medium">{request.grade}</span>
            </div>
          </div>
          
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Описание</h2>
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-gray-700 whitespace-pre-wrap">{formatDescription(request.description)}</p>
            </div>
          </div>
          
          <div className="border-t border-gray-100 pt-4 mb-6">
            <div className="flex flex-col sm:flex-row justify-between">
              <div className="mb-2 sm:mb-0">
                <span className="text-sm text-gray-500 block">Автор</span>
                <div className="flex items-center">
                  <span className="font-medium">{request.author.username}</span>
                  {isAuthor && (
                    <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      Вы
                    </span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-500 block">Опубликовано</span>
                <span className="font-medium">{formatDate(request.createdAt)}</span>
              </div>
            </div>
          </div>
          
          {request.helper && (
            <div className="border-t border-gray-100 pt-4 mb-6">
              <h3 className="text-lg font-semibold mb-2">Назначенный помощник</h3>
              <div className="bg-blue-50 p-4 rounded-md">
                <p className="font-medium text-blue-800">{request.helper.username}</p>
              </div>
            </div>
          )}

          {/* === БЛОК ДЕЙСТВИЙ === */}
          <div className="border-t border-gray-200 mt-6 pt-6">
            {/* --- Действия для АВТОРА --- */}
            {isAuthor && request.status === 'open' && (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate(`/request/${request._id}/edit`)}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
                >
                  Редактировать
                </button>
                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Удалить
                </button>
              </div>
            )}

            {/* --- Действия/Инфо для ХЕЛПЕРА --- */}
            {isHelper() && !isAuthor && (
              <>
                {canHelperRespond && (
                  <div className="text-center">
                    <button
                      onClick={() => setIsResponseModalOpen(true)}
                      className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors"
                    >
                      Предложить помощь
                    </button>
                  </div>
                )}
                {myResponse && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-gray-800">Ваш отклик:</h3>
                    <ResponseCard response={myResponse} isMyResponse={true} />
                  </div>
                )}
              </>
            )}

            {/* --- Действие для чата, когда заявка В РАБОТЕ --- */}
            {request.status === 'in_progress' && (isAuthor || request.helper?._id === currentUser?._id) && (
               <button 
                  className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  onClick={() => navigate(`/requests/${request._id}/chat`)}
               >
                 Перейти в чат
               </button>
            )}
          </div>
        </div>
      </div>

      {/* === ОТДЕЛЬНЫЙ БЛОК ОТКЛИКОВ ДЛЯ АВТОРА === */}
      {isAuthor && request.status === 'open' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-xl font-bold mb-4 text-gray-800">
            Отклики ({responses.length})
          </h3>
          {responsesLoading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : responses.length > 0 ? (
            <div className="space-y-4">
              {responses.map(response => (
                <ResponseCard 
                  key={response._id} 
                  response={response} 
                  isAuthor={isAuthor} 
                  onResponseAction={handleResponseAction} 
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              На ваш запрос пока нет откликов
            </div>
          )}
        </div>
      )}
      
      {/* Кнопки управления для админа/модератора */}
      {isPrivilegedUser && !isAuthor && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6 flex items-center justify-between">
            <p className="text-yellow-800 font-medium">Панель модератора</p>
            <div>
                <button
                    onClick={() => setAdminEditModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors mr-2"
                >
                    Редактировать
                </button>
                <button
                    onClick={() => setAdminDeleteModalOpen(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                    Удалить
                </button>
            </div>
        </div>
      )}

      {/* Модальные окна */}
      <AdminEditModal
        isOpen={isAdminEditModalOpen}
        onClose={() => setAdminEditModalOpen(false)}
        onConfirm={handleAdminEdit}
        requestTitle={request.title}
      />
      
      <AdminDeleteModal
        isOpen={isAdminDeleteModalOpen}
        onClose={() => setAdminDeleteModalOpen(false)}
        onConfirm={handleAdminDelete}
        requestTitle={request.title}
      />

      <ResponseModal
        isOpen={isResponseModalOpen}
        onClose={() => setIsResponseModalOpen(false)}
        requestId={id}
        onSuccess={(newResponse) => {
          setResponses(prev => [...prev, newResponse]);
          setMyResponse(newResponse);
          setIsResponseModalOpen(false);
          toast.success('Ваш отклик успешно отправлен!');
        }}
      />
      
      {/* Модальное окно подтверждения удаления */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Подтверждение удаления</h3>
            <p className="mb-6">Вы уверены, что хотите удалить этот запрос? Это действие нельзя отменить.</p>
            <div className="flex justify-end gap-3">
              <button 
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Отмена
              </button>
              <button 
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                onClick={handleDeleteRequest}
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestDetailPage; 