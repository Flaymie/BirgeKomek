import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { requestsService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import CreateRequestModal from '../modals/CreateRequestModal';
import { SUBJECTS, REQUEST_STATUS_LABELS, STATUS_COLORS } from '../../services/constants';
import { FiPlus, FiSearch } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { PencilIcon } from '@heroicons/react/24/solid';
import Pagination from '../shared/Pagination';

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
  const [activeTab, setActiveTab] = useState('published'); // 'published' или 'drafts'
  
  const [filters, setFilters] = useState({
    subject: '',
    search: ''
  });

  const fetchRequests = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const publishedStatuses = ['open', 'in_progress', 'completed', 'cancelled', 'closed', 'pending'];
      
      const params = {
        page: currentPage,
        limit: 6,
        authorId: currentUser._id,
        status: activeTab === 'drafts' ? 'draft' : publishedStatuses.join(','),
        ...filters,
      };

      if (!filters.subject) delete params.subject;
      if (!filters.search) delete params.search;
      
      if (params.subject) {
        params.subjects = params.subject;
        delete params.subject;
      }
      
      const response = await requestsService.getRequests(params);
      
      setRequests(response.data.requests);
      setTotalPages(response.data.totalPages);

    } catch (err) {
      console.error('Ошибка при получении запросов:', err);
      if (err.response && err.response.status === 401) {
        navigate('/login', { state: { message: 'Сессия истекла, пожалуйста, авторизуйтесь снова' } });
      } else {
        setError(err.response?.data?.msg || 'Произошла ошибка при загрузке запросов');
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser, currentPage, filters, activeTab, navigate]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);
  
  // Сбрасываем страницу при смене фильтров или таба
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, activeTab]);


  useEffect(() => {
    if (!socket || !currentUser) return;

    const handleNewOrUpdatedRequest = (request) => {
      // Проверяем, что это наша заявка
      if (request.author?._id !== currentUser._id) return;
      
      const isDraft = request.status === 'draft';
      const isCurrentTabDrafts = activeTab === 'drafts';

      // Обновляем список, если статус заявки соответствует текущему табу
      if (isDraft === isCurrentTabDrafts) {
          setRequests(prev => {
              const exists = prev.some(r => r._id === request._id);
              if (exists) {
                  // Обновить существующую
                  return prev.map(r => r._id === request._id ? request : r);
              } else {
                  // Добавить новую в начало
                  return [request, ...prev];
              }
          });
      } else {
          // Если статус не соответствует (например, черновик стал опубликованным),
          // просто удаляем его из текущего списка
          setRequests(prev => prev.filter(r => r._id !== request._id));
      }
    };
    
    socket.on('new_request', handleNewOrUpdatedRequest);
    socket.on('request_updated', handleNewOrUpdatedRequest);

    return () => {
      socket.off('new_request', handleNewOrUpdatedRequest);
      socket.off('request_updated', handleNewOrUpdatedRequest);
    };
  }, [socket, currentUser, activeTab]);
  
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

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

  const TabButton = ({ tabName, label, activeTab, setActiveTab }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
        activeTab === tabName
          ? 'bg-primary-600 text-white shadow'
          : 'text-gray-600 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="bg-gray-50 min-h-screen">
       <div className="container mx-auto px-4 py-8">
        {/* Заголовок и кнопка */}
        <div className="flex justify-between items-center mb-6">
           <h1 className="text-3xl font-bold text-gray-900">Мои заявки</h1>
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <FiPlus />
              Создать запрос
            </button>
        </div>

        {/* Фильтры и табы */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
              {/* Табы */}
              <div className="flex items-center gap-2">
                <TabButton tabName="published" label="Опубликованные" activeTab={activeTab} setActiveTab={setActiveTab} />
                <TabButton tabName="drafts" label="Черновики" activeTab={activeTab} setActiveTab={setActiveTab} />
              </div>

              <div className="w-full border-t md:border-t-0 md:border-l border-gray-200 md:pl-4 flex flex-col md:flex-row gap-4">
                {/* Фильтры */}
                <div className="relative flex-grow">
                  <label htmlFor="search" className="sr-only">Поиск</label>
                  <FiSearch className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    id="search"
                    name="search"
                    value={filters.search}
                    onChange={handleFilterChange}
                    placeholder="Поиск по моим заявкам..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
                
                <div className="w-full md:max-w-xs">
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
                       <Link to={`/request/${request._id}`} state={{ from: '/my-requests' }} className="block h-full">
                        <div className="bg-white rounded-xl shadow-lg h-full flex flex-col overflow-hidden transform hover:-translate-y-2 transition-transform duration-300 ease-in-out group border-b-4 border-transparent hover:border-primary-500">
                          <div className="p-6 flex-grow">
                            <div className="flex justify-between items-center mb-3">
                              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusClass(request.status).bg} ${getStatusClass(request.status).text}`}>
                                {getStatusLabel(request.status)}
                              </span>
                              <span className="text-xs text-gray-500">{formatDate(request.updatedAt)}</span>
                            </div>
                            
                            <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-primary-600 transition-colors">
                               {request.title || <span className="italic text-gray-400">Без заголовка</span>}
                            </h3>
                            
                            <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                              {request.description || <span className="italic text-gray-400">Нет описания</span>}
                            </p>
                          </div>
                          
                          <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-xs font-medium">
                                  {request.subject || "Без предмета"}
                                </span>
                                {request.status === 'draft' ? (
                                    <span className="text-yellow-600 font-semibold">Черновик</span>
                                ) : (
                                    <div className="text-gray-600">
                                      {/* Тут можно что-то еще добавить, если нужно */}
                                    </div>
                                )}
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
                <h3 className="text-xl font-semibold text-gray-700">
                    {activeTab === 'drafts' ? 'У вас нет черновиков' : 'Запросы не найдены'}
                </h3>
                <p className="text-gray-500 mt-2">
                    {activeTab === 'drafts' ? 'Все ваши черновики будут здесь.' : 'Попробуйте изменить фильтры или создайте новый запрос.'}
                </p>
              </div>
            )}

            {/* ЗАМЕНЯЕМ КНОПКУ "ПОКАЗАТЬ ЕЩЕ" НА ПАГИНАЦИЮ */}
            <div className="flex justify-center mt-12">
              <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          </>
        )}
      </div>
      
      <CreateRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchRequests()}
      />
    </div>
  );
};

export default MyRequestsPage; 