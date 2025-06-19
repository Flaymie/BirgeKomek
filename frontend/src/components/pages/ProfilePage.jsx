import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import classNames from 'classnames';
import axios from 'axios';

// Компонент загрузки
const LoadingOverlay = ({ className }) => (
  <svg className={className || "animate-spin h-5 w-5 text-white"} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

// Компонент загрузки страницы
const Loader = () => (
  <div className="flex justify-center items-center h-screen">
    <LoadingOverlay className="h-10 w-10 text-indigo-600" />
  </div>
);

// Компонент контейнера
const Container = ({ children }) => (
  <div className="container mx-auto px-4 py-8">
    {children}
  </div>
);

// Функция для получения текста роли
const getRoleText = (profile) => {
  if (!profile || !profile.roles) return 'Пользователь';
  
  if (profile.roles.admin) return 'Администратор';
  if (profile.roles.moderator) return 'Модератор';
  if (profile.roles.helper) return 'Помощник (хелпер)';
  return 'Ученик';
};

// Компонент просмотра профиля другого пользователя
const UserProfileView = ({ profile, currentUser, onBack }) => {
  if (!profile) return null;
  
  return (
    <Container>
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">Профиль пользователя</h1>
          
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center mb-6">
                <div className="h-20 w-20 rounded-full bg-indigo-100 flex items-center justify-center mr-4">
                  <span className="text-3xl font-semibold text-indigo-600">
                    {profile.username ? profile.username.charAt(0).toUpperCase() : '?'}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-medium text-gray-900">{profile.username}</h2>
                  <p className="text-gray-500">На платформе с {new Date(profile.createdAt).toLocaleDateString()}</p>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      profile.roles && profile.roles.helper 
                        ? 'bg-indigo-100 text-indigo-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {getRoleText(profile)}
                    </span>
                    {profile.grade && (
                      <span className="inline-flex items-center ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {profile.grade} класс
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {profile.bio && (
                  <div className="col-span-2">
                    <h3 className="text-sm font-medium text-gray-700 mb-1">О себе</h3>
                    <p className="text-gray-900">{profile.bio}</p>
                  </div>
                )}
                
                {profile.location && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Город</h3>
                    <p className="text-gray-900">{profile.location}</p>
                  </div>
                )}
                
                {profile.roles && profile.roles.helper && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Помощь в предметах</h3>
                    {profile.helperSubjects && profile.helperSubjects.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {profile.helperSubjects.map((subject, index) => (
                          <span key={index} className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">
                            {subject}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">Предметы не указаны</p>
                    )}
                  </div>
                )}
              </div>
              
              <div className="border-t border-gray-200 pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-lg font-semibold text-indigo-600">{profile.rating ? profile.rating.toFixed(1) : 'Н/Д'}</p>
                    <p className="text-sm text-gray-500">Рейтинг</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-indigo-600">{profile.completedRequests || 0}</p>
                    <p className="text-sm text-gray-500">Выполнено</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-indigo-600">{profile.points || 0}</p>
                    <p className="text-sm text-gray-500">Баллы</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-indigo-600">{profile.grade || 'Н/Д'}</p>
                    <p className="text-sm text-gray-500">Класс</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {currentUser && (
            <div className="mt-6 flex justify-end">
              <button 
                onClick={onBack} 
                className="btn btn-outline"
              >
                Назад
              </button>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
};

// Компонент редактирования профиля пользователя
const ProfileEditor = ({ 
  profileData, 
  profileErrors, 
  profileSuccess, 
  profileError, 
  isProfileLoading, 
  handleProfileChange, 
  handleProfileSubmit,
  currentUser
}) => {
  return (
    <Container>
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">Мой профиль</h1>
          
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              {/* Информация о роли и классе */}
              <div className="mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center">
                  <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center mr-4">
                    <span className="text-2xl font-semibold text-indigo-600">
                      {currentUser.username ? currentUser.username.charAt(0).toUpperCase() : '?'}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">{currentUser.username}</h2>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        currentUser.roles && currentUser.roles.helper 
                          ? 'bg-indigo-100 text-indigo-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {getRoleText(currentUser)}
                      </span>
                      {currentUser.grade && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {currentUser.grade} класс
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <h2 className="text-xl font-medium text-gray-900 mb-4">Личные данные</h2>
              
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                {profileSuccess && (
                  <div className="bg-green-50 p-4 rounded-md">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.707a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-800">{profileSuccess}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {profileError && (
                  <div className="bg-red-50 p-4 rounded-md">
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      className={`form-input bg-gray-100 ${profileErrors.email ? 'form-input-error' : ''}`}
                      disabled
                      readOnly
                    />
                    {profileErrors.email && (
                      <p className="mt-1 text-sm text-red-600">{profileErrors.email}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">Для изменения email обратитесь в поддержку</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Телефон
                    </label>
                    <input
                      type="text"
                      id="phone"
                      name="phone"
                      value={profileData.phone}
                      onChange={handleProfileChange}
                      className={`form-input ${profileErrors.phone ? 'form-input-error' : ''}`}
                      placeholder="+7 (___) ___-__-__"
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
                      placeholder="Например: Алматы"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-1">
                      Класс
                    </label>
                    <select
                      id="grade"
                      name="grade"
                      value={profileData.grade || ''}
                      onChange={handleProfileChange}
                      className={`form-select ${profileErrors.grade ? 'form-input-error' : ''}`}
                    >
                      <option value="">Выберите класс</option>
                      {[...Array(11)].map((_, i) => (
                        <option key={i+1} value={i+1}>{i+1} класс</option>
                      ))}
                    </select>
                    {profileErrors.grade && (
                      <p className="mt-1 text-sm text-red-600">{profileErrors.grade}</p>
                    )}
                  </div>
                  
                  <div>
                    {/* Пустая ячейка для выравнивания сетки */}
                  </div>
                </div>
                
                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                    О себе
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    rows="3"
                    value={profileData.bio}
                    onChange={handleProfileChange}
                    className="form-textarea"
                    placeholder="Расскажите немного о себе..."
                  ></textarea>
                </div>
                
                <div className="flex items-center justify-end">
                  <button
                    type="submit"
                    className={classNames(
                      "btn btn-primary",
                      isProfileLoading && "opacity-75 cursor-not-allowed"
                    )}
                    disabled={isProfileLoading}
                  >
                    {isProfileLoading ? (
                      <>
                        <LoadingOverlay className="w-5 h-5 mr-2" /> Сохранение...
                      </>
                    ) : (
                      "Сохранить изменения"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Получаем ID из URL
  const { currentUser, updateProfile, updatePassword, logout } = useAuth();
  
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    grade: ''
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
  const [publicProfile, setPublicProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Эффект для загрузки данных пользователя
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        if (id) {
          // Если есть ID в URL, загружаем публичный профиль по API
          console.log('Загружаем публичный профиль по ID:', id);
          
          try {
            const response = await axios.get(`http://localhost:5050/api/users/${id}`);
            console.log('Загруженный профиль:', response.data);
            setPublicProfile(response.data);
          } catch (error) {
            console.error('Ошибка при загрузке профиля:', error);
            toast.error('Не удалось загрузить профиль пользователя');
          }
          
        } else if (currentUser) {
          // Если нет ID, но пользователь авторизован, загружаем его профиль
          setProfileData({
            username: currentUser.username || '',
            email: currentUser.email || '',
            phone: currentUser.phone ? formatPhoneNumber(currentUser.phone) : '',
            location: currentUser.location || '',
            bio: currentUser.bio || '',
            grade: currentUser.grade || ''
          });
        } else {
          // Если пользователь не авторизован и нет ID, перенаправляем на логин
          navigate('/login', { state: { message: 'Пожалуйста, войдите в систему для доступа к профилю' } });
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [id, currentUser, navigate]);
  
  // Форматирование телефонного номера
  const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return '';

    // Удалим все нецифровые символы
    let digitsOnly = phoneNumber.replace(/\D/g, '');

    // Проверим на российский формат
    if (digitsOnly.length === 11 && (digitsOnly[0] === '7' || digitsOnly[0] === '8')) {
      return `+7 (${digitsOnly.slice(1, 4)}) ${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7, 9)}-${digitsOnly.slice(9, 11)}`;
    }

    // Для других форматов просто вернем очищенную строку
    return digitsOnly;
  };
  
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    
    // Если это телефон, применяем маску ввода
    if (name === 'phone') {
      // Очищаем от всех нецифровых символов
      let digitsOnly = value.replace(/\D/g, '');
      
      // Ограничиваем до 11 цифр (для России)
      if (digitsOnly.length > 11) {
        digitsOnly = digitsOnly.slice(0, 11);
      }
      
      // Форматируем телефон
      let formattedPhone = '';
      if (digitsOnly.length > 0) {
        if (digitsOnly.length === 11 && (digitsOnly[0] === '7' || digitsOnly[0] === '8')) {
          formattedPhone = `+7 (${digitsOnly.slice(1, 4) || ''}`;
          if (digitsOnly.length > 4) {
            formattedPhone += `) ${digitsOnly.slice(4, 7) || ''}`;
          }
          if (digitsOnly.length > 7) {
            formattedPhone += `-${digitsOnly.slice(7, 9) || ''}`;
          }
          if (digitsOnly.length > 9) {
            formattedPhone += `-${digitsOnly.slice(9, 11) || ''}`;
          }
        } else {
          formattedPhone = digitsOnly;
        }
      }
      
      setProfileData((prev) => ({
        ...prev,
        [name]: formattedPhone,
      }));
    } else {
      setProfileData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
    
    // Сбрасываем ошибку для поля, которое изменяется
    if (profileErrors[name]) {
      setProfileErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
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
    const errors = {};
    
    if (!profileData.username.trim()) {
      errors.username = 'Имя пользователя обязательно';
    } else if (profileData.username.length < 3) {
      errors.username = 'Имя пользователя должно содержать не менее 3 символов';
    }
    
    // Телефон необязателен, но если указан, проверяем формат
    if (profileData.phone) {
      const phoneDigits = profileData.phone.replace(/\D/g, '');
      if (phoneDigits.length < 10) {
        errors.phone = 'Телефон должен содержать не менее 10 цифр';
      }
    }
    
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
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
    
    // Подготавливаем данные для отправки
    const dataToSend = {
      username: profileData.username.trim(),
      location: profileData.location.trim(),
      bio: profileData.bio.trim(),
      grade: profileData.grade ? parseInt(profileData.grade) : null
    };
    
    // Очищаем телефон от форматирования для отправки на сервер
    if (profileData.phone) {
      const cleanPhone = profileData.phone.replace(/\D/g, '');
      if (cleanPhone.length === 11 && (cleanPhone[0] === '7' || cleanPhone[0] === '8')) {
        dataToSend.phone = '+' + cleanPhone.substring(1);
      } else if (cleanPhone.length > 0) {
        dataToSend.phone = cleanPhone;
      } else {
        dataToSend.phone = '';
      }
    } else {
      dataToSend.phone = '';
    }
    
    console.log('Отправляемые данные:', JSON.stringify(dataToSend));
    
    try {
      const result = await updateProfile(dataToSend);
      console.log('Ответ сервера:', result);
      
      if (result.success) {
        setProfileSuccess('Профиль успешно обновлен');
        toast.success('Профиль успешно обновлен');
        
        // Обновляем данные в форме с форматированием телефона
        setProfileData(prev => ({
          ...prev,
          ...result.data,
          grade: result.data.grade || '',
          phone: result.data.phone ? formatPhoneNumber(result.data.phone) : ''
        }));
      } else {
        setProfileError(result.error || 'Ошибка при обновлении профиля');
        toast.error(result.error || 'Ошибка при обновлении профиля');
      }
    } catch (err) {
      console.error('Ошибка обновления профиля:', err);
      console.error('Детали ошибки:', err.response?.data);
      setProfileError(err.message || 'Ошибка при обновлении профиля');
      toast.error(err.message || 'Ошибка при обновлении профиля');
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
  
  if (loading) {
    return <Loader />;
  }
  
  // Если есть ID в URL, показываем публичный профиль
  if (id && publicProfile) {
    return (
      <UserProfileView 
        profile={publicProfile} 
        currentUser={currentUser} 
        onBack={() => navigate(-1)} 
      />
    );
  }
  
  // Если нет ID, показываем форму редактирования своего профиля
  if (!id && currentUser) {
    return (
      <ProfileEditor
        profileData={profileData}
        profileErrors={profileErrors}
        profileSuccess={profileSuccess}
        profileError={profileError}
        isProfileLoading={isProfileLoading}
        handleProfileChange={handleProfileChange}
        handleProfileSubmit={handleProfileSubmit}
        currentUser={currentUser}
      />
    );
  }
  
  // Если что-то пошло не так, показываем сообщение
  return (
    <Container>
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden p-6 text-center">
        <h2 className="text-xl font-medium text-red-600 mb-4">Профиль не найден</h2>
        <p className="text-gray-600 mb-6">Запрашиваемый профиль не существует или у вас нет к нему доступа</p>
        <button 
          onClick={() => navigate('/')} 
          className="btn btn-primary"
        >
          На главную
        </button>
      </div>
    </Container>
  );
};

export default ProfilePage; 