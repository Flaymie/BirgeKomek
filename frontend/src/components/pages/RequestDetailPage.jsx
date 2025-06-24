import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { requestsService, responsesService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import ResponseModal from '../modals/ResponseModal';
import ResponseCard from '../shared/ResponseCard';
import DeleteConfirmationModal from '../modals/DeleteConfirmationModal';
import AdminEditRequestModal from '../modals/AdminEditRequestModal';
import AdminDeleteRequestModal from '../modals/AdminDeleteRequestModal';


const RequestDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAdminEditModalOpen, setIsAdminEditModalOpen] = useState(false);
  const [isAdminDeleteModalOpen, setIsAdminDeleteModalOpen] = useState(false);
  const [responses, setResponses] = useState([]);
  const [responsesLoading, setResponsesLoading] = useState(true);
  const { currentUser } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAdminUpdate = (updatedRequestData) => {
    setRequest(prevRequest => ({
      ...prevRequest,
      ...updatedRequestData,
      // Убедимся, что вложенные объекты тоже обновляются правильно
      author: updatedRequestData.author || prevRequest.author,
      subject: updatedRequestData.subject || prevRequest.subject,
    }));
  };

  const handleAdminDelete = async (reason) => {
    try {
      await requestsService.adminDeleteRequest(id, reason);
      toast.success('Заявка успешно удалена');
      navigate('/requests'); // или на админ-панель
    } catch (error) {
      console.error('Ошибка при удалении заявки админом:', error);
      toast.error(error.response?.data?.msg || 'Не удалось удалить заявку');
    }
  };

  // Определяем, откуда пришел пользователь
  const fromMyRequests = location.state?.from === '/my-requests';

  const fetchRequestDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await requestsService.getRequestById(id);
      setRequest(response.data);
      setError(null);
    } catch (err) {
      console.error('Ошибка при получении данных запроса:', err);
      
      // Если ошибка 401 (Unauthorized), перенаправляем на логин
      if (err.response && err.response.status === 401) {
        localStorage.removeItem('token');
        navigate('/login', { state: { message: 'Сессия истекла, пожалуйста, авторизуйтесь снова' } });
        return;
      }
      
      setError(err.response?.data?.msg || 'Произошла ошибка при загрузке данных запроса');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchRequestDetails();
  }, [fetchRequestDetails]);

  const isAuthor = useMemo(() => {
    return request && currentUser && request.author._id === currentUser._id;
  }, [request, currentUser]);

  const isMod = useMemo(() => {
    if (!currentUser || !currentUser.roles) return false;
    return currentUser.roles.admin || currentUser.roles.moderator;
  }, [currentUser]);

  const fetchResponses = useCallback(async () => {
    if (isAuthor) {
      try {
        setResponsesLoading(true);
        const response = await responsesService.getResponsesForRequest(id);
        setResponses(response.data);
      } catch (err) {
        console.error('Ошибка при получении откликов:', err);
      } finally {
        setResponsesLoading(false);
      }
    }
  }, [id, isAuthor]);

  useEffect(() => {
    fetchResponses();
  }, [fetchResponses]);

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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-6">
          {error}
        </div>
        <div className="text-center mt-4">
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
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 md:mb-0">
                {request.title}
              </h1>
              {request.adminEditInfo && (
                <div className="group relative">
                  <span className="text-sm text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full cursor-help">
                    (изм. админом)
                  </span>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs p-3 bg-gray-800 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                    <p className="font-bold">Причина изменения:</p>
                    <p className="whitespace-pre-wrap">{request.adminEditInfo.reason}</p>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                  </div>
                </div>
              )}
            </div>
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
                <span className="text-sm text-gray-500 block">Создано</span>
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
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Кнопка для хелперов - предложить помощь */}
            {request.status === 'open' && isHelper() && !isAuthor && (
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                onClick={() => setIsResponseModalOpen(true)}
              >
                Предложить помощь
              </button>
            )}
            
            {/* Кнопка для всех участников - перейти в чат */}
            {request.status === 'in_progress' && (
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                onClick={() => navigate(`/requests/${request._id}/chat`)}
              >
                Перейти в чат
              </button>
            )}
            
            {/* Кнопки для автора запроса */}
            {isAuthor && request.status === 'open' && (
              <>
                <button 
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
                  onClick={() => navigate(`/request/${request._id}/edit`)}
                >
                  Редактировать
                </button>
                
                <button 
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  onClick={() => setIsDeleteModalOpen(true)}
                >
                  Удалить
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* АДМИН ПАНЕЛЬ */}
      {isMod && (
        <div className="bg-red-50 border-t border-red-200 px-6 py-4">
          <h3 className="text-lg font-bold text-red-800 mb-2">Панель модератора</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={() => setIsAdminEditModalOpen(true)} 
              className="btn-admin-edit"
            >
              Редактировать
            </button>
            <button 
              onClick={() => setIsAdminDeleteModalOpen(true)} 
              className="btn-admin-delete"
            >
              Удалить
            </button>
          </div>
        </div>
      )}
      
      {/* Секция с откликами для автора запроса */}
      {isAuthor && request.status === 'open' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Отклики на запрос</h2>
          
          {responsesLoading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : responses.length > 0 ? (
            <div>
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
      
      {/* Модальное окно для ответа */}
      <ResponseModal
        isOpen={isResponseModalOpen}
        onClose={() => setIsResponseModalOpen(false)}
        requestId={id}
        onResponseSubmitted={handleNewResponse}
      />
      
      {/* Модальное окно для подтверждения удаления (стандартное) */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteRequest}
        title="Удалить запрос?"
        message="Вы уверены, что хотите удалить этот запрос? Это действие необратимо."
      />

      {/* Модальные окна для админов */}
      {isMod && (
        <>
          <AdminEditRequestModal
            isOpen={isAdminEditModalOpen}
            onClose={() => setIsAdminEditModalOpen(false)}
            request={request}
            onSuccess={handleAdminUpdate}
          />
          <AdminDeleteRequestModal
            isOpen={isAdminDeleteModalOpen}
            onClose={() => setIsAdminDeleteModalOpen(false)}
            onConfirm={handleAdminDelete}
          />
        </>
      )}
    </div>
  );
};

export default RequestDetailPage; 