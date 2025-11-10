import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../services/api';
import { toast } from 'react-toastify';
import { FiSearch, FiUser } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { formatAvatarUrl } from '../../../services/avatarUtils';
import RoleBadge from '../../shared/RoleBadge';
import classNames from 'classnames';

const UsersPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        search: '',
        role: 'all',
        status: 'all',
    });
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalUsers: 0,
    });
    const navigate = useNavigate();

    const USERS_PER_PAGE = 15;

    const fetchUsers = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            const params = {
                page,
                limit: USERS_PER_PAGE,
                role: filters.role === 'all' ? '' : filters.role,
                status: filters.status === 'all' ? '' : filters.status,
                search: filters.search,
            };
            const { data } = await api.get('/admin/users', { params });
            setUsers(data.users);
            setPagination({
                currentPage: data.currentPage,
                totalPages: data.totalPages,
                totalUsers: data.totalUsers,
            });
        } catch (err) {
            console.error("Ошибка при загрузке пользователей:", err);
            toast.error(err.response?.data?.msg || 'Не удалось загрузить пользователей.');
            setError('Не удалось загрузить данные. Проверьте права доступа.');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchUsers(1); // Загружаем первую страницу при смене фильтров
    }, [filters.role, filters.status, fetchUsers]);
    
    // Отложенный поиск
    useEffect(() => {
        const handler = setTimeout(() => {
            fetchUsers(1);
        }, 500); // 500ms задержка

        return () => {
            clearTimeout(handler);
        };
    }, [filters.search, fetchUsers]);


    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, currentPage: newPage }));
            fetchUsers(newPage);
        }
    };
    
    const roleOptions = [
        { value: 'all', label: 'Все роли' },
        { value: 'student', label: 'Ученики' },
        { value: 'helper', label: 'Хелперы' },
        { value: 'moderator', label: 'Модераторы' },
        { value: 'admin', label: 'Админы' },
    ];
    
    const statusOptions = [
        { value: 'all', label: 'Все статусы' },
        { value: 'active', label: 'Активные' },
        { value: 'banned', label: 'Забаненные' },
    ];

    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Управление пользователями</h1>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-4 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative md:col-span-1">
                            <FiSearch className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                name="search"
                                value={filters.search}
                                onChange={handleFilterChange}
                                placeholder="Поиск по нику или телефону..."
                                className="w-full pl-10 pr-4 py-2 rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            />
                        </div>
                        
                        <div className="w-full">
                            <select
                                name="role"
                                value={filters.role}
                                onChange={handleFilterChange}
                                className="w-full py-2 rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            >
                                {roleOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>

                        <div className="w-full">
                            <select
                                name="status"
                                value={filters.status}
                                onChange={handleFilterChange}
                                className="w-full py-2 rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            >
                                {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg">
                        <p>{error}</p>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Загрузка пользователей...</p>
                    </div>
                ) : (
                    <>
                        {users.length > 0 ? (
                            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Пользователь</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Роли</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Рейтинг</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата регистрации</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {users.map((user) => (
                                            <tr key={user._id} onClick={() => navigate(`/admin/users/${user._id}`)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10 relative">
                                                            <img className="h-10 w-10 rounded-full" src={formatAvatarUrl(user)} alt={user.username} />
                                                             <span className={classNames('absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full border-2 border-white', user.isOnline ? 'bg-green-500' : 'bg-gray-400')} />
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">{user.username}</div>
                                                            <div className="text-sm text-gray-500">{user.phone || 'Нет телефона'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <RoleBadge user={user} />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {user.averageRating && user.averageRating > 0 
                                                        ? user.averageRating.toFixed(1) 
                                                        : (user.rating ? user.rating.toFixed(1) : 'Н/Д')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {user.banDetails?.isBanned ? (
                                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Забанен</span>
                                                    ) : (
                                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Активен</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(user.createdAt).toLocaleDateString('ru-RU')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-white rounded-xl shadow">
                                <FiUser size={48} className="mx-auto text-gray-400" />
                                <h3 className="text-xl font-semibold text-gray-700 mt-4">Пользователи не найдены</h3>
                                <p className="text-gray-500 mt-2">Попробуйте изменить фильтры.</p>
                            </div>
                        )}
                        
                        {pagination.totalPages > 1 && (
                            <div className="flex justify-center items-center mt-8">
                                <button
                                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                                    disabled={pagination.currentPage === 1}
                                    className="px-4 py-2 mx-1 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Назад
                                </button>
                                <span className="text-sm text-gray-700 mx-4">
                                    Страница {pagination.currentPage} из {pagination.totalPages}
                                </span>
                                <button
                                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                                    disabled={pagination.currentPage === pagination.totalPages}
                                    className="px-4 py-2 mx-1 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Вперед
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default UsersPage;
