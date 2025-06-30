import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { requestsService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import CreateRequestModal from '../modals/CreateRequestModal';
import { SUBJECTS, REQUEST_STATUSES, REQUEST_STATUS_LABELS, STATUS_COLORS } from '../../services/constants';

const RequestsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { socket } = useSocket();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Получаем параметры из URL (если есть)
  const urlParams = new URLSearchParams(location.search);
  const subjectFromUrl = urlParams.get('subject');
  
  const [filters, setFilters] = useState({
    status: REQUEST_STATUSES.OPEN, // По умолчанию только открытые запросы
    subject: subjectFromUrl || '',
    search: ''
  });
  
  // Обновляем URL при изменении фильтров
  useEffect(() => {
    const queryParams = new URLSearchParams();
    
    if (filters.subject) {
      queryParams.set('subject', filters.subject);
    }
    
    if (filters.search) {
      queryParams.set('search', filters.search);
    }
    
    // Обновляем URL без перезагрузки страницы
    const newUrl = 
      queryParams.toString() 
        ? `${location.pathname}?${queryParams.toString()}` 
        : location.pathname;
    
    navigate(newUrl, { replace: true });
  }, [filters, location.pathname, navigate]);
  
  const fetchRequests = useCallback(async (isPageReset = true) => {
    setLoading(true);
    setError(null);
    try {
      const pageToFetch = isPageReset ? 1 : currentPage;
      if (isPageReset) {
        setCurrentPage(1);
      }
      
      const params = { page: pageToFetch, ...filters };
      
      if (!filters.status) delete params.status;
      if (!filters.subject) delete params.subject;
      if (!filters.search) delete params.search;
      
      const response = await requestsService.getRequests(params);
      setRequests(response.data.requests);
      setTotalPages(response.data.totalPages);
    } catch (err) {
      console.error('Ошибка при получении запросов:', err);
      if (err.response && err.response.status === 401) {
        // Просто выводим сообщение, не делаем редирект, т.к. страница публичная
        setError('Для выполнения этого действия необходимо авторизоваться.');
      } else {
        setError(err.response?.data?.msg || 'Произошла ошибка при загрузке запросов');
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  useEffect(() => {
    if (!socket) return;

    const handleNewRequest = (newRequest) => {
      console.log('Получена новая заявка через сокет:', newRequest);
      
      // --- ИСПРАВЛЕННАЯ ЛОГИКА ---
      // Новая заявка всегда имеет статус 'open'.
      // Добавляем ее в список, если у нас выбран фильтр 'open' (по умолчанию) или статус не фильтруется.
      // Игнорируем остальные фильтры (по предмету, поиску), т.к. пользователь только что создал эту заявку и ожидает ее увидеть.
      if (filters.status === REQUEST_STATUSES.OPEN || !filters.status) {
          setRequests(prevRequests => {
            // Избегаем дублирования, на всякий случай
            if (prevRequests.some(req => req._id === newRequest._id)) {
              return prevRequests;
            }
            // Добавляем в начало списка
            return [newRequest, ...prevRequests];
          });
      }
    };

    const handleRequestUpdate = (updatedRequest) => {
      console.log('Заявка обновлена через сокет:', updatedRequest);
      setRequests(prevRequests => 
        prevRequests.map(req => 
          req._id === updatedRequest._id ? updatedRequest : req
        )
      );
      // --- НОВОЕ: Логика удаления из списка при смене статуса ---
      // Если статус обновленной заявки больше не соответствует текущему фильтру,
      // удаляем ее из списка.
      const statusFilter = filters.status;
      if (statusFilter && updatedRequest.status !== statusFilter) {
          setRequests(prevRequests => prevRequests.filter(req => req._id !== updatedRequest._id));
      } else {
           setRequests(prevRequests => 
            prevRequests.map(req => 
              req._id === updatedRequest._id ? updatedRequest : req
            )
          );
      }
    };

    socket.on('new_request', handleNewRequest);
    socket.on('request_updated', handleRequestUpdate);

    return () => {
      socket.off('new_request', handleNewRequest);
      socket.off('request_updated', handleRequestUpdate);
    };
  }, [socket, filters]); // <-- Добавляем filters в зависимости

  useEffect(() => {
    fetchRequests(true); // Загружаем при монтировании и смене фильтров
  }, [filters, currentUser]); // Убрали fetchRequests из зависимостей

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setCurrentPage(1); // Сбрасываем на первую страницу при изменении фильтров
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    // fetchRequests() вызывается через useEffect при изменении filters,
    // но для мгновенной реакции на сабмит формы можно вызвать и здесь.
    fetchRequests();
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

  // Получение класса для статуса
  const getStatusClass = (status) => {
    return STATUS_COLORS[status] || { bg: 'bg-gray-100', text: 'text-gray-800' };
  };
  
  // Получение названия статуса
  const getStatusLabel = (status) => {
    return REQUEST_STATUS_LABELS[status] || 'Неизвестно';
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Открытые запросы на помощь</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Создать запрос
        </button>
      </div>
      
      {/* Фильтры */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Поиск</label>
            <input
              type="text"
              id="search"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Поиск по заголовку или описанию"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          <div className="w-full md:w-1/4">
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Предмет</label>
            <select
              id="subject"
              name="subject"
              value={filters.subject}
              onChange={handleFilterChange}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Все предметы</option>
              {SUBJECTS.map((subject) => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
          
          <div className="self-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Применить
            </button>
          </div>
        </form>
      </div>

      {/* Сообщение об ошибке */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-6">
          {error}
        </div>
      )}

      {/* Индикатор загрузки */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Список запросов */}
          {requests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {requests.map((request) => (
                <div key={request._id} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h2 className="text-lg font-semibold text-gray-900 line-clamp-2">
                        {request.title}
                      </h2>
                      <span className={`px-2 py-1 ${getStatusClass(request.status).bg} ${getStatusClass(request.status).text} rounded-full text-xs font-medium`}>
                        {getStatusLabel(request.status)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {request.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                        {request.subject}
                      </span>
                      <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
                        {request.grade} класс
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
                      <span>Автор: {request.author.username}</span>
                      <span>Создано: {formatDate(request.createdAt)}</span>
                    </div>
                    
                    <Link 
                      to={`/request/${request._id}`}
                      className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Подробнее
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <p className="text-gray-600">Запросы не найдены</p>
              {currentUser && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Создать запрос
                </button>
              )}
            </div>
          )}

          {/* Пагинация */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <nav className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded ${
                    currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  &laquo;
                </button>
                
                {[...Array(totalPages).keys()].map(page => (
                  <button
                    key={page + 1}
                    onClick={() => setCurrentPage(page + 1)}
                    className={`px-3 py-1 rounded ${
                      currentPage === page + 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {page + 1}
                  </button>
                ))}
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded ${
                    currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  &raquo;
                </button>
              </nav>
            </div>
          )}
        </>
      )}
      
      {/* Модальное окно создания запроса */}
      <CreateRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default RequestsPage; 