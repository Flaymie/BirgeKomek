import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { requestsService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import CreateRequestModal from '../modals/CreateRequestModal';
import { SUBJECTS } from '../../services/constants';
import StatusBadge from '../shared/StatusBadge';
import { PencilIcon } from '@heroicons/react/24/solid';

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
  const [requestToEdit, setRequestToEdit] = useState(null);
  const [activeTab, setActiveTab] = useState('published');
  const [filters, setFilters] = useState({
    subject: '',
    search: ''
  });

  const fetchRequests = useCallback(async (page = 1) => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const publishedStatuses = ['open', 'assigned', 'in_progress', 'completed', 'cancelled', 'closed'];

      const params = {
        page: page,
        authorId: currentUser._id,
        status: activeTab === 'drafts' ? 'draft' : publishedStatuses,
        ...filters,
      };
      if (!filters.subject) delete params.subject;
      if (!filters.search) delete params.search;
      
      const response = await requestsService.getMyRequests(params);
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
  }, [currentUser, filters, navigate, activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  useEffect(() => {
    if (!socket || !currentUser) return;

    const handleNewRequest = (newRequest) => {
      if (newRequest.author?._id === currentUser._id && newRequest.status !== 'draft') {
        setRequests(prevRequests => {
          if (prevRequests.some(req => req._id === newRequest._id)) return prevRequests;
          return [newRequest, ...prevRequests];
        });
      }
    };

    const handleRequestUpdate = (updatedRequest) => {
      if (updatedRequest.author?._id === currentUser._id) {
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
      fetchRequests(currentPage);
    }
  }, [currentUser, currentPage, fetchRequests, navigate]);

  const handleOpenEditModal = (request) => {
    setRequestToEdit(request);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setRequestToEdit(null);
  };
  
  const handleSuccess = () => {
    fetchRequests(1);
  };

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

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const TabButton = ({ tabName, label }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        activeTab === tabName
          ? 'bg-blue-600 text-white shadow'
          : 'text-gray-600 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );

  const renderRequests = () => {
    if (requests.length === 0) {
      return (
        <div className="bg-gray-50 rounded-lg p-8 text-center mt-6">
          <p className="text-gray-600">
            {activeTab === 'drafts' ? 'У вас нет черновиков.' : 'У вас пока нет запросов.'}
          </p>
          {activeTab !== 'drafts' && (
             <button
                onClick={() => setIsModalOpen(true)}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                Создать первый запрос
              </button>
          )}
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {requests.map((request) => (
          <div key={request._id} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
            <div className="p-4 flex flex-col h-full">
              <div className="flex-grow">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-lg font-semibold text-gray-900 line-clamp-2 pr-2 break-words">
                    {request.title || <span className="italic text-gray-400">Без заголовка</span>}
                  </h2>
                  <StatusBadge status={request.status} />
                </div>
                <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                  {request.description || <span className="italic text-gray-400">Нет описания</span>}
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {request.subject && <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">{request.subject}</span>}
                  {request.grade && <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">{request.grade} класс</span>}
                </div>
                <div className="text-xs text-gray-500 mb-3">
                  <span>Обновлено: {formatDate(request.updatedAt)}</span>
                </div>
              </div>
              {activeTab === 'drafts' ? (
                <button
                  onClick={() => handleOpenEditModal(request)}
                  className="block w-full text-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors mt-auto flex items-center justify-center gap-2"
                >
                  <PencilIcon className="h-4 w-4" />
                  Редактировать
                </button>
              ) : (
                <Link
                  to={`/request/${request._id}`}
                  className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors mt-auto"
                  state={{ from: '/my-requests' }}
                >
                  Подробнее
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">Мои запросы</h1>
        <button
          onClick={() => { setRequestToEdit(null); setIsModalOpen(true); }}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Создать запрос
        </button>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <TabButton tabName="published" label="Опубликованные" />
        <TabButton tabName="drafts" label="Черновики" />
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
      ) : renderRequests()}

      {totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      <CreateRequestModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        requestToEdit={requestToEdit}
      />
    </div>
  );
};

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav className="inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-50 transition-colors"
      >
        &laquo;
      </button>
      {pageNumbers.map(number => (
        <button
          key={number}
          onClick={() => onPageChange(number)}
          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors ${
            currentPage === number
              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
          }`}
        >
          {number}
        </button>
      ))}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-50 transition-colors"
      >
        &raquo;
      </button>
    </nav>
  );
};

export default MyRequestsPage;