import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { FiUser, FiSmartphone, FiMapPin, FiAward, FiCalendar, FiSlash, FiCheckCircle, FiSave, FiXCircle } from 'react-icons/fi';
import { toast } from 'react-toastify';

const StatCard = ({ icon, label, value }) => (
  <div className="bg-gray-50 p-4 rounded-lg flex items-center">
    <div className="bg-white p-3 rounded-full mr-4 text-gray-600">
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

const UserProfileAdminPage = () => {
  const { id } = useParams();
  const { callApi, loading } = useApi();
  const [user, setUser] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({});

  const fetchUser = async () => {
    try {
      const { data } = await callApi(`/admin/users/${id}`, 'GET');
      setUser(data);
      setFormData({
        username: data.username,
        phone: data.phone || '',
        location: data.location || '',
        bio: data.bio || '',
      });
    } catch (error) {
      toast.error('Не удалось загрузить профиль пользователя.');
      console.error("Ошибка загрузки профиля:", error);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [id, callApi]);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const { data } = await callApi(`/admin/users/${id}`, 'PUT', formData);
      setUser(data);
      setIsEditMode(false);
      toast.success('Профиль успешно обновлен!');
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Ошибка при обновлении профиля.');
      console.error("Ошибка сохранения профиля:", error);
    }
  };

  const handleCancel = () => {
    setFormData({
      username: user.username,
      phone: user.phone || '',
      location: user.location || '',
      bio: user.bio || '',
    });
    setIsEditMode(false);
  };

  if (loading) {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 animate-pulse bg-gray-200 h-8 w-1/3 rounded"></h1>
            <div className="bg-white rounded-xl shadow-sm p-8 animate-pulse">
                <div className="h-24 bg-gray-200 rounded-lg"></div>
                <div className="h-10 bg-gray-200 rounded-lg mt-6"></div>
                <div className="h-40 bg-gray-200 rounded-lg mt-4"></div>
            </div>
        </div>
    )
  }

  if (!user) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl text-red-500">Пользователь не найден.</h2>
        <Link to="/admin/users" className="text-blue-500 hover:underline mt-4 inline-block">
          Вернуться к списку пользователей
        </Link>
      </div>
    );
  }
  
  const getRoleName = (roles) => {
    if (roles.admin) return 'Администратор';
    if (roles.moderator) return 'Модератор';
    if (roles.helper) return 'Хелпер';
    return 'Пользователь';
  }

  return (
    <div className="p-6 bg-gray-50 min-h-full">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <img src={user.avatar || '/img/default-avatar.png'} alt={user.username} className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"/>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{user.username}</h1>
            <span className="px-3 py-1 text-sm font-semibold text-indigo-800 bg-indigo-100 rounded-full">{getRoleName(user.roles)}</span>
          </div>
        </div>

        {/* Ban Status */}
        {user.banDetails?.isBanned && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6" role="alert">
            <p className="font-bold flex items-center"><FiSlash className="mr-2"/>Аккаунт заблокирован</p>
            <p><strong>Причина:</strong> {user.banDetails.reason}</p>
            <p><strong>Заблокировал:</strong> {user.banDetails.bannedBy?.username || 'Система'}</p>
            <p><strong>Дата блокировки:</strong> {new Date(user.banDetails.bannedAt).toLocaleString()}</p>
            <p><strong>Истекает:</strong> {user.banDetails.expiresAt ? new Date(user.banDetails.expiresAt).toLocaleString() : 'Навсегда'}</p>
          </div>
        )}
        
        {/* Main content */}
        <div className="bg-white rounded-xl shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">Основная информация</h2>
            {isEditMode ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Никнейм</label>
                  <input type="text" name="username" value={formData.username} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Телефон</label>
                  <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Город</label>
                  <input type="text" name="location" value={formData.location} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center">
                    <FiUser className="w-5 h-5 text-gray-400 mr-3"/>
                    <span className="text-gray-800">@{user.username}</span>
                </div>
                <div className="flex items-center">
                    <FiSmartphone className="w-5 h-5 text-gray-400 mr-3"/>
                    <span className="text-gray-800">{user.phone || 'Не указан'}</span>
                </div>
                <div className="flex items-center">
                    <FiMapPin className="w-5 h-5 text-gray-400 mr-3"/>
                    <span className="text-gray-800">{user.location || 'Не указан'}</span>
                </div>
                <div className="flex items-center">
                    <FiAward className="w-5 h-5 text-gray-400 mr-3"/>
                    <span className="text-gray-800">Рейтинг: {user.rating?.toFixed(1) || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                    <FiCalendar className="w-5 h-5 text-gray-400 mr-3"/>
                    <span className="text-gray-800">Регистрация: {new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
                {user.telegramId && (
                    <div className="flex items-center text-green-600">
                        <FiCheckCircle className="w-5 h-5 mr-3"/>
                        <span className="font-semibold">Telegram привязан</span>
                    </div>
                )}
              </div>
            )}
            
            <h2 className="text-xl font-bold text-gray-700 mt-8 mb-4 border-b pb-2">О себе</h2>
            {isEditMode ? (
              <textarea name="bio" value={formData.bio} onChange={handleInputChange} rows="5" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
            ) : (
              <p className="text-gray-600 whitespace-pre-wrap">{user.bio || 'Пользователь ничего не рассказал о себе.'}</p>
            )}
            
            <div className="mt-8 flex justify-end gap-4">
                {isEditMode ? (
                    <>
                        <button onClick={handleCancel} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 flex items-center gap-2">
                            <FiXCircle/> Отмена
                        </button>
                        <button onClick={handleSave} disabled={loading} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:bg-green-300">
                            <FiSave/> {loading ? 'Сохранение...' : 'Сохранить'}
                        </button>
                    </>
                ) : (
                    <button onClick={() => setIsEditMode(true)} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Редактировать профиль
                    </button>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileAdminPage; 