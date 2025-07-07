import React, { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { toast } from 'react-toastify';

const ChangeRoleModal = ({ isOpen, onClose, user, onSuccess }) => {
  const [selectedRole, setSelectedRole] = useState('');
  const { callApi, loading } = useApi();

  if (!isOpen || !user) return null;

  // Определяем текущую роль пользователя для селекта
  const currentUserRole = user.roles.admin ? 'admin' :
                         user.roles.moderator ? 'moderator' :
                         user.roles.helper ? 'helper' : 'user';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRole || selectedRole === currentUserRole) {
      toast.info('Выберите новую роль для пользователя.');
      return;
    }

    try {
      const { data: updatedUser } = await callApi(`/admin/users/${user._id}/role`, 'PUT', { newRole: selectedRole });
      toast.success(`Роль для ${user.username} успешно изменена на ${selectedRole}!`);
      onSuccess(updatedUser);
      onClose();
    } catch (error) {
      toast.error(error.message || 'Ошибка при смене роли.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Изменить роль для <span className="text-indigo-600">{user.username}</span></h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="role-select" className="block text-sm font-medium text-gray-700 mb-2">
              Новая роль:
            </label>
            <select
              id="role-select"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="" disabled>Выберите роль...</option>
              {/* Админы не могут быть назначены через этот интерфейс */}
              {currentUserRole !== 'user' && <option value="user">Юзер</option>}
              {currentUserRole !== 'helper' && <option value="helper">Хелпер</option>}
              {currentUserRole !== 'moderator' && <option value="moderator">Модератор</option>}
            </select>
            <p className="text-xs text-gray-500 mt-2">
              Текущая роль: <span className="font-semibold">{currentUserRole}</span>. Вы не можете назначить роль "администратор".
            </p>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              disabled={loading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300"
              disabled={loading}
            >
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangeRoleModal; 