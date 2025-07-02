import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { requestsService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import CreateRequestModal from '../modals/CreateRequestModal';
import { SUBJECTS, REQUEST_STATUS_LABELS, STATUS_COLORS } from '../../services/constants';
import { FiPlus, FiSearch } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

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
  
  const urlParams = new URLSearchParams(location.search);
  const subjectFromUrl = urlParams.get('subject');
  
  const [filters, setFilters] = useState({
    subject: subjectFromUrl || '',
    search: ''
  });
  
  useEffect(() => {
    const queryParams = new URLSearchParams();
    
    if (filters.subject) {
      queryParams.set('subject', filters.subject);
    }
    
    if (filters.search) {
      queryParams.set('search', filters.search);
    }
    
    const newUrl = 
      queryParams.toString() 
        ? `${location.pathname}?${queryParams.toString()}` 
        : location.pathname;
    
    navigate(newUrl, { replace: true });
  }, [filters, location.pathname, navigate]);
  
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: currentPage, ...filters };
      
      const response = await requestsService.getRequests(params);
      
      if (currentPage === 1) {
        setRequests(response.data.requests);
      } else {
        setRequests(prev => [...prev, ...response.data.requests]);
      }
      
      setTotalPages(response.data.totalPages);
    } catch (err) {
      console.error('Ошибка при получении запросов:', err);
      if (err.response && err.response.status === 401) {
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
        setRequests(prevRequests => {
            if (prevRequests.some(req => req._id === newRequest._id)) {
              return prevRequests;
            }
            return [newRequest, ...prevRequests];
          });
    };

    const handleRequestUpdate = (updatedRequest) => {
        setRequests(prevRequests => 
        prevRequests.map(req => 
            req._id === updatedRequest._id ? updatedRequest : req
        )
        );
    };

    socket.on('new_request', handleNewRequest);
    socket.on('request_updated', handleRequestUpdate);

    return () => {
      socket.off('new_request', handleNewRequest);
      socket.off('request_updated', handleRequestUpdate);
    };
  }, [socket]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1); 
  };
  
  useEffect(() => {
    const handler = setTimeout(() => {
      if (currentPage === 1) {
        fetchRequests();
      } else {
        setCurrentPage(1);
      }
    }, 500); // debounce
    return () => clearTimeout(handler);
  }, [filters.search, filters.subject]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffSeconds = Math.round((now - date) / 1000);
    if (diffSeconds < 60) return 'только что';
    const diffMinutes = Math.round(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes} мин. назад`;
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} ч. назад`;
    
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const getStatusClass = (status) => {
    return STATUS_COLORS[status] || { bg: 'bg-gray-100', text: 'text-gray-800' };
  };
  
  const getStatusLabel = (status) => {
    return REQUEST_STATUS_LABELS[status] || 'Неизвестно';
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Заголовок и кнопка */}
        <div className="flex justify-between items-center mb-6">
           <h1 className="text-3xl font-bold text-gray-900">Лента заявок</h1>
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <FiPlus />
              Создать запрос
            </button>
        </div>

        {/* Фильтры */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <label htmlFor="search" className="sr-only">Поиск</label>
              <FiSearch className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                id="search"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Поиск по заголовку..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
            
            <div className="w-full">
              <label htmlFor="subject" className="sr-only">Предмет</label>
              <select
                id="subject"
                name="subject"
                value={filters.subject}
                onChange={handleFilterChange}
                className="w-full py-2 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="">Все предметы</option>
                {SUBJECTS.map((subject) => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg">
            <p>{error}</p>
          </div>
        )}

        {loading && requests.length === 0 ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : (
          <>
            {requests.length > 0 ? (
              <AnimatePresence>
                <motion.div 
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    visible: {
                      transition: {
                        staggerChildren: 0.05,
                      },
                    },
                  }}
                >
                  {requests.map((request) => (
                    <motion.div
                      key={request._id}
                      variants={{
                        hidden: { y: 20, opacity: 0 },
                        visible: { y: 0, opacity: 1 },
                      }}
                      className="h-full"
                    >
                       <Link to={`/request/${request._id}`} className="block h-full">
                        <div className="bg-white rounded-xl shadow-lg h-full flex flex-col overflow-hidden transform hover:-translate-y-2 transition-transform duration-300 ease-in-out group border-b-4 border-transparent hover:border-primary-500">
                          <div className="p-6 flex-grow">
                            <div className="flex justify-between items-center mb-3">
                              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusClass(request.status).bg} ${getStatusClass(request.status).text}`}>
                                {getStatusLabel(request.status)}
                              </span>
                              <span className="text-xs text-gray-500">{formatDate(request.createdAt)}</span>
                            </div>
                            
                            <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-primary-600 transition-colors">
                               {request.title}
                            </h3>
                            
                            <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                              {request.description}
                            </p>
                          </div>
                          
                          <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-xs font-medium">
                                  {request.subject}
                                </span>
                                <div className="text-gray-600">
                                  <span>by </span>
                                  <span className="font-semibold">{request.author.username}</span>
                                </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="text-center py-16">
                <h3 className="text-xl font-semibold text-gray-700">Запросы не найдены</h3>
                <p className="text-gray-500 mt-2">Попробуйте изменить фильтры или создайте свой собственный запрос.</p>
              </div>
            )}

            {currentPage < totalPages && (
              <div className="flex justify-center mt-12">
                <button
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={loading}
                  className="btn btn-secondary-outline"
                >
                  {loading ? 'Загрузка...' : 'Показать еще'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
      
      <CreateRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default RequestsPage; 