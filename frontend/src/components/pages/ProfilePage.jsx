import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { currentUser, updateProfile, updatePassword, logout } = useAuth();
  
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    phone: '',
    location: '',
    bio: ''
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  // Перенаправляем неавторизованных пользователей
  useEffect(() => {
    if (!currentUser) {
      navigate('/login', { state: { message: 'Пожалуйста, войдите в систему для доступа к профилю' } });
    } else {
      // Загружаем данные пользователя
      setProfileData({
        username: currentUser.username || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        location: currentUser.location || '',
        bio: currentUser.bio || ''
      });
    }
  }, [currentUser, navigate]);
  
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (profileErrors[name]) {
      setProfileErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (passwordErrors[name]) {
      setPasswordErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  const validateProfileForm = () => {
    const newErrors = {};
    
    if (!profileData.username.trim()) {
      newErrors.username = 'Имя пользователя обязательно';
    }
    
    if (!profileData.email.trim()) {
      newErrors.email = 'Email обязателен';
    } else if (!/\S+@\S+\.\S+/.test(profileData.email)) {
      newErrors.email = 'Неверный формат email';
    }
    
    if (profileData.phone && !/^\+?[0-9]{10,15}$/.test(profileData.phone)) {
      newErrors.phone = 'Неверный формат телефона';
    }
    
    setProfileErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const validatePasswordForm = () => {
    const newErrors = {};
    
    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Введите текущий пароль';
    }
    
    if (!passwordData.newPassword) {
      newErrors.newPassword = 'Введите новый пароль';
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = 'Пароль должен быть не менее 6 символов';
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Пароли не совпадают';
    }
    
    setPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');
    
    if (!validateProfileForm()) return;
    
    setIsProfileLoading(true);
    
    try {
      const result = await updateProfile(profileData);
      
      if (result.success) {
        setProfileSuccess('Профиль успешно обновлен');
        // Обновляем данные в форме
        setProfileData(prev => ({
          ...prev,
          ...result.data
        }));
      } else {
        setProfileError(result.error || 'Ошибка при обновлении профиля');
      }
    } catch (err) {
      console.error('Ошибка обновления профиля:', err);
      setProfileError(err.message || 'Ошибка при обновлении профиля');
    } finally {
      setIsProfileLoading(false);
    }
  };
  
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordSuccess('');
    setPasswordError('');
    
    if (!validatePasswordForm()) return;
    
    setIsPasswordLoading(true);
    
    try {
      const result = await updatePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );
      
      if (result.success) {
        setPasswordSuccess('Пароль успешно обновлен');
        // Очищаем форму пароля
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        setPasswordError(result.error || 'Ошибка при обновлении пароля');
      }
    } catch (err) {
      console.error('Ошибка обновления пароля:', err);
      setPasswordError(err.message || 'Ошибка при обновлении пароля');
    } finally {
      setIsPasswordLoading(false);
    }
  };
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Ошибка при выходе:', err);
    }
  };
  
  if (!currentUser) {
    return null; // Не рендерим страницу, если пользователь не авторизован
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 animate-slideDown">Профиль пользователя</h1>
        <p className="text-gray-600 animate-slideUp">Управляйте своими личными данными и настройками аккаунта</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Боковая панель */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow-soft p-6 mb-6">
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                <span className="text-3xl font-bold text-indigo-600">
                  {currentUser.username ? currentUser.username.charAt(0).toUpperCase() : 'U'}
                </span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">{currentUser.username || 'Пользователь'}</h2>
              <p className="text-gray-600 mb-4">{currentUser.email}</p>
              <button
                onClick={handleLogout}
                className="w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-300"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                </svg>
                Выйти
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-soft p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Навигация</h3>
            <nav className="space-y-2">
              <a href="#profile" className="block px-4 py-2 rounded-md bg-indigo-50 text-indigo-700 font-medium hover:bg-indigo-100 transition-all duration-200">
                Личные данные
              </a>
              <a href="#security" className="block px-4 py-2 rounded-md text-gray-700 hover:bg-gray-50 transition-all duration-200">
                Безопасность
              </a>
              <a href="/requests" className="block px-4 py-2 rounded-md text-gray-700 hover:bg-gray-50 transition-all duration-200">
                Мои запросы
              </a>
            </nav>
          </div>
        </div>
        
        {/* Основное содержимое */}
        <div className="md:col-span-2 space-y-8">
          {/* Форма профиля */}
          <div id="profile" className="bg-white rounded-lg shadow-soft p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Личные данные</h2>
            
            {profileSuccess && (
              <div className="mb-6 rounded-md bg-green-50 p-4 animate-fadeIn">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">{profileSuccess}</p>
                  </div>
                </div>
              </div>
            )}
            
            {profileError && (
              <div className="mb-6 rounded-md bg-red-50 p-4 animate-fadeIn">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">{profileError}</p>
                  </div>
                </div>
              </div>
            )}
            
            <form onSubmit={handleProfileSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                    Имя пользователя
                  </label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={profileData.username}
                    onChange={handleProfileChange}
                    className={`form-input ${profileErrors.username ? 'form-input-error' : ''}`}
                  />
                  {profileErrors.username && (
                    <p className="mt-1 text-sm text-red-600">{profileErrors.username}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={profileData.email}
                    onChange={handleProfileChange}
                    className={`form-input ${profileErrors.email ? 'form-input-error' : ''}`}
                  />
                  {profileErrors.email && (
                    <p className="mt-1 text-sm text-red-600">{profileErrors.email}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Телефон
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={profileData.phone}
                    onChange={handleProfileChange}
                    className={`form-input ${profileErrors.phone ? 'form-input-error' : ''}`}
                    placeholder="+7 (XXX) XXX-XX-XX"
                  />
                  {profileErrors.phone && (
                    <p className="mt-1 text-sm text-red-600">{profileErrors.phone}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                    Город
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={profileData.location}
                    onChange={handleProfileChange}
                    className="form-input"
                    placeholder="Ваш город"
                  />
                </div>
              </div>
              
              <div className="mb-6">
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                  О себе
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows="4"
                  value={profileData.bio}
                  onChange={handleProfileChange}
                  className="form-textarea"
                  placeholder="Расскажите немного о себе..."
                ></textarea>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isProfileLoading}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300"
                >
                  {isProfileLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Сохранение...
                    </>
                  ) : 'Сохранить изменения'}
                </button>
              </div>
            </form>
          </div>
          
          {/* Форма изменения пароля */}
          <div id="security" className="bg-white rounded-lg shadow-soft p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Изменение пароля</h2>
            
            {passwordSuccess && (
              <div className="mb-6 rounded-md bg-green-50 p-4 animate-fadeIn">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">{passwordSuccess}</p>
                  </div>
                </div>
              </div>
            )}
            
            {passwordError && (
              <div className="mb-6 rounded-md bg-red-50 p-4 animate-fadeIn">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">{passwordError}</p>
                  </div>
                </div>
              </div>
            )}
            
            <form onSubmit={handlePasswordSubmit}>
              <div className="space-y-6 mb-6">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Текущий пароль
                  </label>
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className={`form-input ${passwordErrors.currentPassword ? 'form-input-error' : ''}`}
                  />
                  {passwordErrors.currentPassword && (
                    <p className="mt-1 text-sm text-red-600">{passwordErrors.currentPassword}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Новый пароль
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className={`form-input ${passwordErrors.newPassword ? 'form-input-error' : ''}`}
                  />
                  {passwordErrors.newPassword && (
                    <p className="mt-1 text-sm text-red-600">{passwordErrors.newPassword}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Подтверждение пароля
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className={`form-input ${passwordErrors.confirmPassword ? 'form-input-error' : ''}`}
                  />
                  {passwordErrors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmPassword}</p>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isPasswordLoading}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300"
                >
                  {isPasswordLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Обновление...
                    </>
                  ) : 'Изменить пароль'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 