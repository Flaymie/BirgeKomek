import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { requestsService } from '../../services/api';

const RequestsPage = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    status: 'open',
    subject: '',
    search: ''
  });

  useEffect(() => {
    // Проверяем наличие токена при загрузке компонента
    const token = localStorage.getItem('token');
    if (!token) {
      // Если токена нет, перенаправляем на страницу логина
      navigate('/login', { state: { message: 'Для просмотра запросов необходимо авторизоваться' } });
      return;
    }
    
    fetchRequests();
  }, [currentPage, filters, navigate]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // Формируем параметры запроса
      const params = {
        page: currentPage,
        ...(filters.status && { status: filters.status }),
        ...(filters.subject && { subject: filters.subject }),
        ...(filters.search && { search: filters.search })
      };

      // Делаем запрос к API через сервис
      const response = await requestsService.getRequests(params);
      setRequests(response.data.requests);
      setTotalPages(response.data.totalPages);
      setLoading(false);
    } catch (err) {
      console.error('Ошибка при получении запросов:', err);
      
      // Если ошибка 401 (Unauthorized), перенаправляем на логин
      if (err.response && err.response.status === 401) {
        localStorage.removeItem('token'); // Удаляем невалидный токен
        navigate('/login', { state: { message: 'Сессия истекла, пожалуйста, авторизуйтесь снова' } });
        return;
      }
      
      setError(err.response?.data?.msg || 'Произошла ошибка при загрузке запросов');
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setCurrentPage(1); // Сбрасываем на первую страницу при изменении фильтров
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Открыта</span>;
      case 'in_progress':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">В процессе</span>;
      case 'closed':
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">Закрыта</span>;
      case 'cancelled':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">Отменена</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">{status}</span>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Запросы на помощь</h1>
      
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
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
            <select
              id="status"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Все статусы</option>
              <option value="open">Открытые</option>
              <option value="in_progress">В процессе</option>
              <option value="closed">Закрытые</option>
              <option value="cancelled">Отмененные</option>
            </select>
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
              <option value="Математика">Математика</option>
              <option value="Физика">Физика</option>
              <option value="Химия">Химия</option>
              <option value="Биология">Биология</option>
              <option value="История">История</option>
              <option value="Литература">Литература</option>
              <option value="Английский">Английский</option>
              <option value="Информатика">Информатика</option>
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
                      {getStatusBadge(request.status)}
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
                      to={`/requests/${request._id}`}
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
    </div>
  );
};

export default RequestsPage; 