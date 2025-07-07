import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { debounce } from 'lodash';
import { useNavigate } from 'react-router-dom';

const StatusBadge = ({ status }) => {
    const statusClasses = {
      open: 'bg-green-100 text-green-800',
      assigned: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-indigo-100 text-indigo-800',
      cancelled: 'bg-red-100 text-red-800',
      closed: 'bg-gray-100 text-gray-800',
    };
    const statusText = {
        open: 'Открыта',
        assigned: 'Назначена',
        in_progress: 'В процессе',
        completed: 'Выполнена',
        cancelled: 'Отменена',
        closed: 'Закрыта',
    }
    return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
            {statusText[status] || status}
        </span>
    );
};

// Список предметов, лучше вынести в константы, если используется где-то еще
const subjectOptions = [
    { value: 'Математика', label: 'Математика' },
    { value: 'Физика', label: 'Физика' },
    { value: 'Химия', label: 'Химия' },
    { value: 'Биология', label: 'Биология' },
    { value: 'История', label: 'История' },
    { value: 'География', label: 'География' },
    { value: 'Литература', label: 'Литература' },
    { value: 'Русский язык', label: 'Русский язык' },
    { value: 'Казахский язык', label: 'Казахский язык' },
    { value: 'Английский язык', label: 'Английский язык' },
    { value: 'Информатика', label: 'Информатика' },
    { value: 'Другое', label: 'Другое' },
];

const RequestsPage = () => {
    const { callApi, loading } = useApi();
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({ 
        search: '', 
        status: '',
        subject: '',
        dateFrom: '',
        dateTo: '',
    });

    const fetchRequests = useCallback(async (page, currentFilters) => {
        try {
            const queryParams = new URLSearchParams({
                page,
                limit: 15,
                ...currentFilters,
            }).toString();

            const { data } = await callApi(`/admin/requests?${queryParams}`, 'GET');
            
            setRequests(data.requests);
            setTotalPages(data.totalPages);
            setCurrentPage(data.currentPage);
        } catch (error) {
            console.error("Ошибка при загрузке заявок:", error);
        }
    }, [callApi]);

    const debouncedFetch = useCallback(debounce((p, f) => fetchRequests(p, f), 500), [fetchRequests]);
    
    useEffect(() => {
        debouncedFetch(1, filters);
        setCurrentPage(1);
    }, [filters, debouncedFetch]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPages) {
            fetchRequests(newPage, filters);
        }
    };

    const handleRowClick = (id) => {
        navigate(`/admin/request/${id}`);
    };

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Управление заявками</h1>

            {/* Фильтры */}
            <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    <input
                        type="text"
                        name="search"
                        placeholder="Заголовок или ID автора..."
                        value={filters.search}
                        onChange={handleFilterChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                        name="status"
                        value={filters.status}
                        onChange={handleFilterChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Все статусы</option>
                        <option value="open">Открыта</option>
                        <option value="assigned">Назначена</option>
                        <option value="in_progress">В процессе</option>
                        <option value="completed">Выполнена</option>
                        <option value="cancelled">Отменена</option>
                        <option value="closed">Закрыта</option>
                    </select>
                    <select
                        name="subject"
                        value={filters.subject}
                        onChange={handleFilterChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Все предметы</option>
                        {subjectOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    <input
                        type="date"
                        name="dateFrom"
                        value={filters.dateFrom}
                        onChange={handleFilterChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        title="Дата от"
                    />
                    <input
                        type="date"
                        name="dateTo"
                        value={filters.dateTo}
                        onChange={handleFilterChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        title="Дата до"
                    />
                </div>
            </div>

            {/* Таблица для больших экранов */}
            <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" className="p-4">Заголовок</th>
                            <th scope="col" className="p-4">Автор</th>
                            <th scope="col" className="p-4">Исполнитель</th>
                            <th scope="col" className="p-4">Статус</th>
                            <th scope="col" className="p-4">Дата создания</th>
                            <th scope="col" className="p-4">Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 10 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="p-4" colSpan="6"><div className="h-6 bg-gray-200 rounded"></div></td>
                                </tr>
                            ))
                        ) : requests.length > 0 ? (
                            requests.map((req) => (
                                <tr 
                                    key={req._id} 
                                    className="bg-white border-b hover:bg-gray-100 cursor-pointer"
                                    onClick={() => handleRowClick(req._id)}
                                >
                                    <td className="p-4 font-medium text-gray-900 max-w-xs truncate" title={req.title}>{req.title}</td>
                                    <td className="p-4">{req.author?.username || 'N/A'}</td>
                                    <td className="p-4">{req.helper?.username || '—'}</td>
                                    <td className="p-4"><StatusBadge status={req.status} /></td>
                                    <td className="p-4">{new Date(req.createdAt).toLocaleDateString()}</td>
                                    <td className="p-4">
                                        <span className="text-indigo-600 hover:underline">Просмотр</span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="p-4 text-center text-gray-500">Заявки не найдены.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Список карточек для мобильных экранов */}
            <div className="block lg:hidden space-y-4">
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="bg-white rounded-xl shadow-sm border p-4 animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                        </div>
                    ))
                ) : requests.length > 0 ? (
                    requests.map(req => (
                        <div key={req._id} className="bg-white rounded-xl shadow-sm border p-4 active:bg-gray-100" onClick={() => handleRowClick(req._id)}>
                            <div className="flex justify-between items-start gap-2">
                                <h3 className="font-bold text-gray-800 break-words flex-1">{req.title}</h3>
                                <div className="flex-shrink-0">
                                   <StatusBadge status={req.status} />
                                </div>
                            </div>
                            <div className="text-sm text-gray-600 mt-3 space-y-1">
                                <p>
                                    Автор: <span className="font-medium text-gray-800">{req.author?.username || 'N/A'}</span>
                                </p>
                                <p>
                                    Исполнитель: <span className="font-medium text-gray-800">{req.helper?.username || '—'}</span>
                                </p>
                            </div>
                            <p className="text-xs text-gray-400 mt-3">
                                {new Date(req.createdAt).toLocaleString()}
                            </p>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10 text-gray-500">
                        <p>Заявки не найдены.</p>
                    </div>
                )}
            </div>
            
            {/* Пагинация */}
            {!loading && totalPages > 1 && (
                 <div className="flex justify-center items-center gap-4 mt-6">
                 <button
                   onClick={() => handlePageChange(currentPage - 1)}
                   disabled={currentPage === 1}
                   className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50"
                 >
                   Назад
                 </button>
                 <span>Стр. {currentPage} из {totalPages}</span>
                 <button
                   onClick={() => handlePageChange(currentPage + 1)}
                   disabled={currentPage === totalPages}
                   className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50"
                 >
                   Вперед
                 </button>
               </div>
            )}
        </div>
    );
};

export default RequestsPage; 