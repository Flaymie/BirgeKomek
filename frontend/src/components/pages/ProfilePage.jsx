import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import classNames from 'classnames';
import { usersService } from '../../services/api';
import { formatAvatarUrl } from '../../services/avatarUtils';
import AvatarUpload from '../layout/AvatarUpload';
import DeleteAccountModal from '../modals/DeleteAccountModal';
import BanUserModal from '../modals/BanUserModal';
import ProfileNotFound from '../shared/ProfileNotFound';

// Функция для форматирования времени "last seen"
const formatLastSeen = (dateString) => {
  if (!dateString) return 'давно';
  
  const now = new Date();
  const lastSeen = new Date(dateString);
  const diffSeconds = Math.round((now - lastSeen) / 1000);
  const diffMinutes = Math.round(diffSeconds / 60);
  const diffHours = Math.round(diffMinutes / 60);
  const diffDays = Math.round(diffHours / 24);

  if (diffMinutes < 1) return 'только что';
  if (diffMinutes < 60) return `${diffMinutes} мин. назад`;
  if (diffHours < 24) return `${diffHours} ч. назад`;
  if (diffDays === 1) return 'вчера';
  if (diffDays < 30) return `${diffDays} д. назад`;
  
  return new Intl.DateTimeFormat('ru-RU').format(lastSeen);
};

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

// ПРАВИЛЬНЫЙ СПИСОК ПРЕДМЕТОВ
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

// === НОВЫЙ КОМПОНЕНТ СТАТИСТИКИ ===
const ProfileStats = ({ profile }) => {
  if (!profile || !profile.roles) return null;

  // Если хелпер, показываем его статистику
  if (profile.roles.helper) {
    return (
      <div className="border-t border-gray-200 pt-4 mt-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-lg font-semibold text-indigo-600">
              {typeof profile.rating === 'number' ? profile.rating.toFixed(1) : 'Н/Д'}
            </p>
            <p className="text-sm text-gray-500">Рейтинг</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-indigo-600">{profile.completedRequests || 0}</p>
            <p className="text-sm text-gray-500">Выполнено</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-indigo-600">{profile.grade || 'Н/Д'}</p>
            <p className="text-sm text-gray-500">Класс</p>
          </div>
        </div>
      </div>
    );
  }

  // Если ученик, показываем его статистику
  return (
    <div className="border-t border-gray-200 pt-4 mt-6">
      <div className="grid grid-cols-2 gap-4 text-center">
        <div>
          <p className="text-lg font-semibold text-indigo-600">{profile.createdRequests || 0}</p>
          <p className="text-sm text-gray-500">Создано запросов</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-indigo-600">{profile.grade || 'Н/Д'}</p>
          <p className="text-sm text-gray-500">Класс</p>
        </div>
      </div>
    </div>
  );
};

const BanInfo = ({ banDetails }) => {
  if (!banDetails?.isBanned) return null;

  const expiration = banDetails.expiresAt
    ? `до ${new Date(banDetails.expiresAt).toLocaleString('ru-RU')}`
    : 'навсегда';

  return (
    <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6" role="alert">
      <div className="flex">
        <div className="py-1">
          <svg className="h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <div>
          <p className="font-bold text-red-800">ПОЛЬЗОВАТЕЛЬ ЗАБЛОКИРОВАН ({expiration})</p>
          {banDetails.reason && (
            <p className="text-sm text-red-700 mt-1">
              <strong>Причина:</strong> {banDetails.reason}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// === ОБНОВЛЕННЫЙ КОМПОНЕНТ ПРОСМОТРА ПРОФИЛЯ ===
const UserProfileView = ({ profile, currentUser, onBack, onBan, onUnban, isMyProfile }) => {
  if (!profile) return null;
  
  const canModerate = currentUser?.roles?.admin || currentUser?.roles?.moderator;
  const targetIsAdmin = profile.roles?.admin;
  
  return (
    <Container>
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-start">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6">Профиль пользователя</h1>
            {canModerate && !isMyProfile && !targetIsAdmin && (
              <div className="flex gap-2">
                {profile.banDetails?.isBanned ? (
                  <button onClick={onUnban} className="btn btn-success btn-sm">Разбанить</button>
                ) : (
                  <button onClick={onBan} className="btn btn-error btn-sm">Забанить</button>
                )}
              </div>
            )}
          </div>
          
          <BanInfo banDetails={profile.banDetails} />

          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex flex-col md:flex-row items-center mb-6">
                <div className="mb-4 md:mb-0 md:mr-6">
                  <AvatarUpload 
                    currentAvatar={formatAvatarUrl(profile)} 
                    size="lg" 
                    editable={false} 
                  />
                </div>
                <div>
                  <h2 className="text-xl font-medium text-gray-900">{profile.username}</h2>
                  <div className="flex items-center mt-1">
                    {profile.isOnline ? (
                      <span className="flex items-center text-sm text-green-600">
                        <span className="h-2 w-2 mr-1.5 bg-green-500 rounded-full"></span>
                        Онлайн
                      </span>
                    ) : (
                      <span className="flex items-center text-sm text-gray-500">
                        <span className="h-2 w-2 mr-1.5 bg-gray-400 rounded-full"></span>
                        Был(а) в сети {formatLastSeen(profile.lastSeen)}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 mt-1">На платформе с {new Date(profile.createdAt).toLocaleDateString()}</p>
                  <div className="mt-2">
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
                    {profile.subjects && profile.subjects.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {profile.subjects.map((subject, index) => (
                          <span key={index} className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">
                            {subjectOptions.find(s => s.value === subject)?.label || subject}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">Предметы не указаны</p>
                    )}
                  </div>
                )}
              </div>
              
              <ProfileStats profile={profile} />
            </div>
          </div>
          
          <div className="mt-6 flex justify-end gap-4">
             <button 
              onClick={onBack} 
              className="btn btn-outline"
            >
              Назад
            </button>
          </div>
        </div>
      </div>
    </Container>
  );
};

// === ИСПРАВЛЕННЫЙ КОМПОНЕНТ РЕДАКТИРОВАНИЯ ПРОФИЛЯ ===
const ProfileEditor = ({ 
  profileData, 
  profileErrors, 
  profileSuccess, 
  profileError, 
  isProfileLoading, 
  handleProfileChange, 
  handleProfileSubmit,
  currentUser,
  handleSubjectsChange,
  onDeleteAccount
}) => {
  const handlePhoneChange = (e) => {
    const value = e.target.value;
    let digits = value.replace(/\D/g, '');

    if (digits.length === 0) {
      handleProfileChange({ target: { name: 'phone', value: '' } });
      return;
    }

    if (digits.startsWith('8')) {
      digits = '7' + digits.substring(1);
    }
    
    if (!digits.startsWith('7')) {
      digits = '7' + digits;
    }

    digits = digits.substring(0, 11);
    const numberPart = digits.substring(1);

    let formatted = '+7';
    if (numberPart.length > 0) {
      formatted = `+7 (${numberPart.substring(0, 3)}`;
    }
    if (numberPart.length >= 4) {
      formatted += `) ${numberPart.substring(3, 6)}`;
    }
    if (numberPart.length >= 7) {
      formatted += `-${numberPart.substring(6, 8)}`;
    }
    if (numberPart.length >= 9) {
      formatted += `-${numberPart.substring(8, 10)}`;
    }

    handleProfileChange({ target: { name: 'phone', value: formatted } });
  };

  // Обработчик изменения аватара
  const handleAvatarChange = (avatarUrl) => {
    handleProfileChange({ target: { name: 'avatar', value: avatarUrl } });
  };

  return (
    <Container>
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">Мой профиль</h1>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            {/* Загрузка аватара */}
            <div className="mb-6 pb-4 border-b border-gray-200">
              <div className="flex flex-col items-center">
                <AvatarUpload 
                  currentAvatar={formatAvatarUrl(profileData)}
                  onAvatarChange={handleAvatarChange}
                  size="xl"
                />
                <h2 className="text-lg font-medium text-gray-900 mt-4">{profileData.username}</h2>
                <div className="mt-1 flex flex-wrap gap-2 justify-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    profileData.roles && profileData.roles.helper 
                      ? 'bg-indigo-100 text-indigo-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {getRoleText(profileData)}
                  </span>
                  {profileData.grade && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {profileData.grade} класс
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <h2 className="text-xl font-medium text-gray-900 my-4">Личные данные</h2>
            
            <form onSubmit={handleProfileSubmit} className="space-y-6">
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700">Имя пользователя</label>
                  <input type="text" name="username" id="username" value={profileData.username || ''} onChange={handleProfileChange} className="mt-1 form-input" />
                  {profileErrors?.username && <p className="mt-1 text-sm text-red-600">{profileErrors.username}</p>}
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                  <input type="email" name="email" id="email" value={profileData.email || ''} className="mt-1 form-input bg-gray-100 cursor-not-allowed" disabled readOnly />
                  <p className="mt-1 text-xs text-gray-500">Email нельзя изменить.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Телефон</label>
                  <input
                    type="tel"
                    name="phone"
                    id="phone"
                    value={profileData.phone || ''}
                    onChange={handlePhoneChange}
                    className="mt-1 form-input"
                    placeholder="+7 (___) ___-__-__"
                    maxLength="18"
                  />
                </div>
                 <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700">Город</label>
                  <input type="text" name="location" id="location" value={profileData.location || ''} onChange={handleProfileChange} className="mt-1 form-input" placeholder="Например: Алматы"/>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="grade" className="block text-sm font-medium text-gray-700">Класс</label>
                  <select id="grade" name="grade" value={profileData.grade || ''} onChange={handleProfileChange} className="mt-1 form-select w-full">
                    <option value="">Выберите класс</option>
                    {[...Array(11)].map((_, i) => (<option key={i + 1} value={i + 1}>{i + 1} класс</option>))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700">О себе</label>
                <textarea id="bio" name="bio" rows="3" value={profileData.bio || ''} onChange={handleProfileChange} className="mt-1 form-textarea w-full" placeholder="Расскажите немного о себе..."></textarea>
              </div>
              
              {/* ЧЕКБОКСЫ */}
              {currentUser.roles && currentUser.roles.helper && (
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Предметы, в которых вы помогаете</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 border border-gray-200 rounded-md">
                    {subjectOptions.map((option) => (
                      <div key={option.value} className="flex items-center">
                        <input id={`subject-${option.value}`} name={option.value} type="checkbox" checked={(profileData.subjects || []).includes(option.value)} onChange={handleSubjectsChange} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"/>
                        <label htmlFor={`subject-${option.value}`} className="ml-3 block text-sm font-medium text-gray-700">{option.label}</label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                 <button type="button" onClick={onDeleteAccount} className="text-sm text-red-600 hover:text-red-800 hover:underline">
                    Удалить аккаунт
                </button>
                <button type="submit" className={classNames("btn btn-primary", isProfileLoading && "opacity-75 cursor-not-allowed")} disabled={isProfileLoading}>
                  {isProfileLoading ? (<> <LoadingOverlay className="w-5 h-5 mr-2" /> Сохранение... </>) : ("Сохранить изменения")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Container>
  );
};

const ProfilePage = () => {
  const { currentUser, loading: authLoading, updateProfile, logout } = useAuth();
  const { identifier } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMyProfile, setIsMyProfile] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileErrors, setProfileErrors] = useState({});
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    grade: '',
    subjects: [],
    avatar: '',
    roles: {},
  });
  
  const fetchUserData = useCallback(async (userIdentifier) => {
    if (!userIdentifier) return;
    setLoading(true);
    setError(null);
    try {
      const response = await usersService.getUserById(userIdentifier);
      setProfile(response.data);
    } catch (err) {
      console.error('Ошибка при загрузке профиля:', err);
      setError('Не удалось загрузить профиль. Возможно, он не существует.');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (identifier) {
      fetchUserData(identifier);
    } 
    else if (!authLoading && !identifier) {
      if (currentUser) {
        setProfileData({
          username: currentUser.username || '',
          email: currentUser.email || '',
          phone: currentUser.phone || '',
          location: currentUser.location || '',
          bio: currentUser.bio || '',
          grade: currentUser.grade || '',
          subjects: currentUser.subjects || [],
          avatar: currentUser.avatar || '',
          roles: currentUser.roles || {},
        });
        setIsMyProfile(true);
        setLoading(false);
      } else {
        navigate('/login');
      }
    }
  }, [identifier, currentUser, authLoading, navigate, fetchUserData]);

  useEffect(() => {
    if (profile && currentUser) {
      const isMine = currentUser._id === profile._id;
      setIsMyProfile(isMine);
      if (isMine) {
         setProfileData({
            username: profile.username || '',
            email: profile.email || '',
            phone: profile.phone || '',
            location: profile.location || '',
            bio: profile.bio || '',
            grade: profile.grade || '',
            subjects: profile.subjects || [],
            avatar: profile.avatar || '',
            roles: profile.roles || {},
         });
      }
    }
  }, [profile, currentUser]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubjectsChange = (e) => {
    const { name, checked } = e.target;
    setProfileData(prev => {
      const subjects = prev.subjects || [];
      if (checked) {
        return { ...prev, subjects: [...subjects, name] };
      } else {
        return { ...prev, subjects: subjects.filter(subj => subj !== name) };
      }
    });
  };
  
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsProfileLoading(true);
    setProfileSuccess('');
    setProfileError('');
    setProfileErrors({});
    
    try {
      await updateProfile(profileData);
      toast.success('Профиль успешно обновлен!');
      setProfileSuccess('Профиль успешно обновлен!');
    } catch (err) {
      const errorMessage = err.response?.data?.msg || 'Ошибка при обновлении профиля';
      toast.error(errorMessage);
      setProfileError(errorMessage);
    } finally {
      setIsProfileLoading(false);
    }
  };
  
  const handleDeleteAccount = async () => {
    try {
      await usersService.deleteAccount();
      toast.success('Ваш аккаунт был успешно удален.');
      logout();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Не удалось удалить аккаунт.');
      console.error(err);
    } finally {
      setIsDeleteModalOpen(false);
    }
  };

  const handleBanUser = async (reason, duration) => {
    if (!profile) return;
    try {
      await usersService.banUser(profile._id, reason, duration);
      toast.success(`Пользователь ${profile.username} забанен.`);
      setIsBanModalOpen(false);
      fetchUserData(profile._id);
    } catch (err) {
      console.error('Ошибка при бане:', err);
      toast.error(err.response?.data?.msg || 'Не удалось забанить пользователя.');
    }
  };

  const handleUnbanUser = async () => {
    if (!profile) return;
    try {
      await usersService.unbanUser(profile._id);
      toast.success(`Пользователь ${profile.username} разбанен.`);
      fetchUserData(profile._id);
    } catch (err) {
      console.error('Ошибка при разбане:', err);
      toast.error(err.response?.data?.msg || 'Не удалось разбанить пользователя.');
    }
  };

  if (loading || authLoading) return <Loader />;
  if (error) return <ProfileNotFound />;

  return (
    <>
      {identifier ? (
        <UserProfileView
          profile={profile}
          currentUser={currentUser}
          onBack={() => navigate(-1)}
          onBan={() => setIsBanModalOpen(true)}
          onUnban={handleUnbanUser}
          isMyProfile={isMyProfile}
        />
      ) : (
        <ProfileEditor
          profileData={profileData}
          profileErrors={profileErrors}
          profileSuccess={profileSuccess}
          profileError={profileError}
          isProfileLoading={isProfileLoading}
          handleProfileChange={handleProfileChange}
          handleProfileSubmit={handleProfileSubmit}
          currentUser={profileData}
          handleSubjectsChange={handleSubjectsChange}
          onDeleteAccount={() => setIsDeleteModalOpen(true)}
        />
      )}
      <DeleteAccountModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteAccount}
      />
      <BanUserModal
        isOpen={isBanModalOpen}
        onClose={() => setIsBanModalOpen(false)}
        onConfirm={handleBanUser}
        username={profile?.username}
      />
    </>
  );
};

export default ProfilePage; 