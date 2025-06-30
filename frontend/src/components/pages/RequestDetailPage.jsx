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
import StatusBadge from '../shared/StatusBadge';
import RoleBadge from '../shared/RoleBadge';

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
          <div className="flex flex-col md:flex-row justify-between md:items-start mb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2 md:mb-0">
              {request.title}
            </h1>
            <div className="flex-shrink-0">
              <StatusBadge status={request.status} />
            </div>
          </div>
          
          <div className="text-sm text-gray-500 mb-6 space-y-2 md:space-y-0 md:flex md:items-center md:space-x-6">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              <span>Автор:</span>
              <Link to={`/profile/${request.author.username}`} className="ml-1.5 font-medium text-gray-700 hover:text-blue-600 hover:underline flex items-center">
                {request.author.username}
                <RoleBadge user={request.author} />
              </Link>
            </div>
            <div className="hidden md:block">|</div>
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              <span>Создан: {formatDate(request.createdAt)}</span>
            </div>
            <div className="hidden md:block">|</div>
            <div className="flex items-center">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {request.subject}
              </span>
            </div>
          </div>
          
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Описание</h2>
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-gray-700 whitespace-pre-wrap">{formatDescription(request.description)}</p>
            </div>
          </div>
          
          {request.helper && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 mr-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zM9 12a1 1 0 112 0 1 1 0 01-2 0zm-1-3a1 1 0 00-1 1v1a1 1 0 102 0v-1a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <span className="font-semibold">Помощь оказывает:</span>
                <Link to={`/profile/${request.helper.username}`} className="ml-2 font-bold text-green-800 hover:underline flex items-center">
                  {request.helper.username}
                  <RoleBadge user={request.helper} />
                </Link>
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