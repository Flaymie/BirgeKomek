import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { requestsService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import CreateRequestModal from '../modals/CreateRequestModal';
import { SUBJECTS, REQUEST_STATUS_LABELS, STATUS_COLORS } from '../../services/constants';

const MyRequestsPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { socket } = useSocket();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    subject: '',
    search: ''
  });

  const fetchRequests = useCallback(async (page = 1) => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const params = {
        page: page,
        authorId: currentUser._id,
        ...filters,
      };
      if (!filters.subject) delete params.subject;
      if (!filters.search) delete params.search;

      const response = await requestsService.getRequests(params);
      setRequests(response.data.requests);
      setTotalPages(response.data.totalPages);
      setCurrentPage(response.data.currentPage);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        localStorage.removeItem('token');
        navigate('/login', { state: { message: 'Сессия истекла, пожалуйста, авторизуйтесь снова' } });
        return;
      }
      setError(err.response?.data?.msg || 'Произошла ошибка при загрузке запросов');
    } finally {
      setLoading(false);
    }
  }, [currentUser, filters, navigate]);

  useEffect(() => {
    if (!socket || !currentUser) return;

    const handleNewRequest = (newRequest) => {
      if (newRequest.author?._id === currentUser._id) {
        setRequests(prevRequests => {
          if (prevRequests.some(req => req._id === newRequest._id)) {
            return prevRequests;
          }
          return [newRequest, ...prevRequests];
        });
      }
    };

    const handleRequestUpdate = (updatedRequest) => {
      if (updatedRequest.author?._id === currentUser._id || updatedRequest.helper?._id === currentUser._id) {
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
  }, [socket, currentUser]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token && !currentUser) {
      navigate('/login', { state: { message: 'Для просмотра ваших запросов необходимо авторизоваться' } });
    } else if (currentUser) {
      fetchRequests(Number(currentPage) || 1);
    }
  }, [currentUser, currentPage, fetchRequests, navigate]);
  

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchRequests(1);
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

  const getStatusClass = (status) => {
    return STATUS_COLORS[status] || { bg: 'bg-gray-100', text: 'text-gray-800' };
  };
  
  const getStatusLabel = (status) => {
    return REQUEST_STATUS_LABELS[status] || 'Неизвестно';
  };
  
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Мои запросы</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Создать запрос
        </button>
      </div>
      
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

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {requests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {requests.map((request) => (
                <div key={request._id} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="p-4 flex flex-col h-full">
                    <div className="flex-grow">
                      <div className="flex justify-between items-start mb-2">
                        <h2 className="text-lg font-semibold text-gray-900 line-clamp-2">
                          {request.title}
                        </h2>
                        <span className={`px-2 py-1 ${getStatusClass(request.status).bg} ${getStatusClass(request.status).text} rounded-full text-xs font-medium`}>
                          {getStatusLabel(request.status)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-3">
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
                      <div className="text-xs text-gray-500 mb-3">
                        <span>Создано: {formatDate(request.createdAt)}</span>
                      </div>
                    </div>
                    <Link
                      to={`/request/${request._id}`}
                      className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors mt-auto"
                      state={{ from: '/my-requests' }}
                    >
                      Подробнее
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <p className="text-gray-600">У вас пока нет запросов</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                Создать запрос
              </button>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <nav className="inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  &laquo;
                </button>
                {[...Array(totalPages).keys()].map(number => (
                  <button
                    key={number + 1}
                    onClick={() => handlePageChange(number + 1)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === number + 1 ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}
                  >
                    {number + 1}
                  </button>
                ))}
                 <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  &raquo;
                </button>
              </nav>
            </div>
          )}
        </>
      )}

      <CreateRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchRequests(1)}
      />
    </div>
  );
};

export default MyRequestsPage;