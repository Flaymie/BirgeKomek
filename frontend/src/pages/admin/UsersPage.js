import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { debounce } from 'lodash';
import { FiMoreVertical, FiEdit, FiTrash2, FiSlash, FiSend, FiCheckCircle, FiEye } from 'react-icons/fi';
import ChangeRoleModal from '../../components/modals/ChangeRoleModal';
import BanUserModal from '../../components/modals/BanUserModal';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import SendNotificationModal from '../../components/modals/SendNotificationModal';
import DeleteUserWithCodeModal from '../../components/modals/DeleteUserWithCodeModal';
import { useNavigate } from 'react-router-dom';
import UserActionsMenu from './UserActionsMenu';

// Компонент-заглушка для строки таблицы
const UserTableRowSkeleton = () => (
    <tr className="bg-white border-b animate-pulse">
        <td className="p-4"><div className="h-6 bg-gray-200 rounded"></div></td>
        <td className="p-4"><div className="h-6 bg-gray-200 rounded"></div></td>
        <td className="p-4"><div className="h-6 bg-gray-200 rounded"></div></td>
        <td className="p-4"><div className="h-6 bg-gray-200 rounded"></div></td>
        <td className="p-4"><div className="h-6 bg-gray-200 rounded"></div></td>
        <td className="p-4"><div className="h-6 bg-gray-200 rounded"></div></td>
    </tr>
);

const UsersPage = () => {
  const { callApi, loading } = useApi();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    role: '',
  });

  // Состояния для модальных окон
  const [isChangeRoleModalOpen, setIsChangeRoleModalOpen] = useState(false);
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchUsers = useCallback(async (page, currentFilters) => {
    try {
      const queryParams = new URLSearchParams({
        page,
        limit: 15,
        ...currentFilters,
      }).toString();
      
      const { data } = await callApi(`/admin/users?${queryParams}`, 'GET');
      
      setUsers(data.users);
      setTotalPages(data.totalPages);
      setCurrentPage(data.currentPage);
    } catch (error) {
      console.error("Ошибка при загрузке пользователей:", error);
      // Тут можно показать уведомление об ошибке
    }
  }, [callApi]);

  const debouncedFetch = useCallback(debounce((p, f) => fetchUsers(p, f), 500), [fetchUsers]);

  useEffect(() => {
    debouncedFetch(1, filters);
    // При изменении фильтров всегда сбрасываем на первую страницу
    setCurrentPage(1);
  }, [filters, debouncedFetch]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };
  
  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      fetchUsers(newPage, filters);
    }
  };

  // --- Обработчики модалки смены роли ---
  const handleOpenChangeRoleModal = (user) => {
    setSelectedUser(user);
    setIsChangeRoleModalOpen(true);
  };
  const handleCloseChangeRoleModal = () => {
    setSelectedUser(null);
    setIsChangeRoleModalOpen(false);
  };

  // --- Обработчики модалки бана ---
  const handleOpenBanModal = (user) => {
    setSelectedUser(user);
    setIsBanModalOpen(true);
  };
  const handleCloseBanModal = () => {
    setSelectedUser(null);
    setIsBanModalOpen(false);
  };
  
  const handleBanConfirm = async (reason, duration) => {
    if (!selectedUser) return;
    try {
      const { data } = await callApi(`/users/${selectedUser._id}/ban`, 'POST', { reason, duration });
      toast.success(data.msg || `Пользователь ${selectedUser.username} успешно забанен.`);
      handleUserUpdate({ ...selectedUser, banDetails: { ...selectedUser.banDetails, isBanned: true } });
      handleCloseBanModal();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Не удалось забанить пользователя.');
    }
  };
  
  const handleUnban = async (user) => {
    if (!window.confirm(`Вы уверены, что хотите разбанить пользователя ${user.username}?`)) return;
    try {
      const { data } = await callApi(`/users/${user._id}/unban`, 'POST');
      toast.success(data.msg || `Пользователь ${user.username} успешно разбанен.`);
      handleUserUpdate({ ...user, banDetails: { ...user.banDetails, isBanned: false } });
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Не удалось разбанить пользователя.');
    }
  };

  // --- Обработчики модалки удаления ---
  const handleOpenDeleteModal = async (user) => {
    if (!window.confirm(`Вы уверены, что хотите инициировать удаление пользователя ${user.username}? Это потребует подтверждения в Telegram.`)) {
      return;
    }
    setSelectedUser(user);
    try {
      const { data } = await callApi(`/admin/users/${user._id}/delete-request`, 'POST');
      toast.info(data.msg || 'Код подтверждения отправлен в ваш Telegram.');
      setIsDeleteModalOpen(true);
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Не удалось отправить запрос на удаление.');
      setSelectedUser(null);
    }
  };

  const handleCloseDeleteModal = () => {
    setSelectedUser(null);
    setIsDeleteModalOpen(false);
  };
  
  const handleDeleteConfirm = async (confirmationCode) => {
    if (!selectedUser) return;
    setDeleteLoading(true);
    try {
      const { data } = await callApi(`/admin/users/${selectedUser._id}`, 'DELETE', { confirmationCode });
      toast.success(data.msg || `Пользователь ${selectedUser.username} успешно удален.`);
      setUsers(currentUsers => currentUsers.filter(u => u._id !== selectedUser._id));
      handleCloseDeleteModal();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Не удалось удалить пользователя. Проверьте код.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleUserUpdate = (updatedUser) => {
    setUsers(currentUsers => 
      currentUsers.map(u => u._id === updatedUser._id ? { ...u, ...updatedUser } : u)
    );
  };

  const getRoleBadge = (roles) => {
    if (roles.admin) return <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full">Админ</span>;
    if (roles.moderator) return <span className="px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full">Модер</span>;
    if (roles.helper) return <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">Хелпер</span>;
    return <span className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 rounded-full">Юзер</span>;
  };

  // --- Обработчики модалки уведомлений ---
  const handleOpenNotificationModal = (user) => {
    setSelectedUser(user);
    setIsNotificationModalOpen(true);
  };

  const handleCloseNotificationModal = () => {
    setSelectedUser(null);
    setIsNotificationModalOpen(false);
  };

  const handleNotificationSent = () => {
    toast.success(`Уведомление для ${selectedUser?.username} успешно отправлено.`);
    handleCloseNotificationModal();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Управление пользователями</h1>

      {/* Фильтры */}
      <div className="mb-6 flex items-center gap-4">
        <input
          type="text"
          name="search"
          placeholder="Поиск по нику или телефону..."
          value={filters.search}
          onChange={handleFilterChange}
          className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          name="role"
          value={filters.role}
          onChange={handleFilterChange}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Все роли</option>
          <option value="admin">Админ</option>
          <option value="moderator">Модератор</option>
          <option value="helper">Хелпер</option>
          <option value="user">Юзер</option>
        </select>
      </div>

      {/* Таблица пользователей */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th scope="col" className="p-4">Пользователь</th>
              <th scope="col" className="p-4">Телефон</th>
              <th scope="col" className="p-4">Роль</th>
              <th scope="col" className="p-4">Город</th>
              <th scope="col" className="p-4">Рейтинг</th>
              <th scope="col" className="p-4">Действия</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <UserTableRowSkeleton key={i} />)
            ) : users.length > 0 ? (
              users.map((user) => {
                return (
                  <tr key={user._id} className={`bg-white border-b hover:bg-gray-50 ${user.banDetails?.isBanned ? 'bg-red-50' : ''}`}>
                    <td className="p-4 font-medium text-gray-900 flex items-center gap-3">
                      <img src={user.avatar || '/img/default-avatar.png'} alt={user.username} className="w-8 h-8 rounded-full object-cover" />
                      {user.username}
                      {user.banDetails?.isBanned && <FiSlash className="w-4 h-4 text-red-500" title="Забанен" />}
                    </td>
                    <td className="p-4">{user.phone || 'Не указан'}</td>
                    <td className="p-4">{getRoleBadge(user.roles)}</td>
                    <td className="p-4">{user.location || 'Не указан'}</td>
                    <td className="p-4">{user.rating?.toFixed(1) || 'N/A'}</td>
                    <td className="p-4 text-right">
                      <UserActionsMenu
                        user={user}
                        currentUser={currentUser}
                        handleOpenChangeRoleModal={handleOpenChangeRoleModal}
                        handleOpenBanModal={handleOpenBanModal}
                        handleUnban={handleUnban}
                        handleOpenNotificationModal={handleOpenNotificationModal}
                        handleOpenDeleteModal={handleOpenDeleteModal}
                      />
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan="6" className="p-4 text-center text-gray-500">
                  Пользователи не найдены.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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

      {/* Модальные окна */}
      <ChangeRoleModal 
        isOpen={isChangeRoleModalOpen}
        onClose={handleCloseChangeRoleModal}
        user={selectedUser}
        onSuccess={handleUserUpdate}
      />
      
      <BanUserModal
        isOpen={isBanModalOpen}
        onClose={handleCloseBanModal}
        onConfirm={handleBanConfirm}
        username={selectedUser?.username}
      />

      <SendNotificationModal
        isOpen={isNotificationModalOpen}
        onClose={handleCloseNotificationModal}
        recipient={selectedUser}
        onNotificationSent={handleNotificationSent}
      />

      <DeleteUserWithCodeModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleDeleteConfirm}
        username={selectedUser?.username}
        loading={deleteLoading}
      />
    </div>
  );
};

export default UsersPage; 