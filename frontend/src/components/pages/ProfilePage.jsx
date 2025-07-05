import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import classNames from 'classnames';
import { usersService } from '../../services/api';
import { formatAvatarUrl } from '../../services/avatarUtils';
import AvatarUpload from '../layout/AvatarUpload';
import DeleteAccountModal from '../modals/DeleteAccountModal';
import DeleteConfirmModal from '../modals/DeleteConfirmModal';
import BanUserModal from '../modals/BanUserModal';
import ProfileNotFound from '../shared/ProfileNotFound';
import { FaTelegramPlane, FaGavel } from 'react-icons/fa';
import ReviewsBlock from '../shared/ReviewsBlock';
import { useReadOnlyCheck } from '../../hooks/useReadOnlyCheck';
import ConfirmUsernameChangeModal from '../modals/ConfirmUsernameChangeModal';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import './ProfilePage.css';
import RoleBadge from '../shared/RoleBadge';
import ImageViewerModal from '../modals/ImageViewerModal';
import ModeratorActionConfirmModal from '../modals/ModeratorActionConfirmModal';
import ModeratorActionsDropdown from '../shared/ModeratorActionsDropdown';
import SendNotificationModal from '../modals/SendNotificationModal';
// --- ИКОНКИ ДЛЯ РОЛЕЙ ---

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
  <div className="container mx-auto px-4 pb-8">
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

// === НОВАЯ ФУНКЦИЯ ФОРМАТИРОВАНИЯ ТЕЛЕФОНА ---
const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  const phoneNumber = parsePhoneNumberFromString(phone, 'KZ'); // KZ - Казахстан как страна по умолчанию
  if (phoneNumber) {
    return phoneNumber.formatInternational();
  }
  return phone; // Возвращаем как есть, если не распознали
};

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
    <div className="bg-red-100 border border-red-300 rounded-lg p-4 mb-6" role="alert">
      <div className="flex items-start justify-between gap-4">
        {/* Левая часть с иконкой и текстом */}
        <div className="flex items-start">
          <FaGavel className="h-6 w-6 text-red-600 mr-3 flex-shrink-0 mt-1" />
          <div className="flex-grow">
          <p className="font-bold text-red-800">ПОЛЬЗОВАТЕЛЬ ЗАБЛОКИРОВАН ({expiration})</p>
          {banDetails.reason && (
              <p className="text-sm text-red-700 mt-1 break-words">
              <strong>Причина:</strong> {banDetails.reason}
            </p>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

// === ОБНОВЛЕННЫЙ КОМПОНЕНТ ПРОСМОТРА ПРОФИЛЯ ===
const UserProfileView = ({ profile, currentUser, onBack, onBan, onUnban, onNotify, isMyProfile, onAvatarClick }) => {
  if (!profile) return null;
  
  const canModerate = currentUser?.roles?.admin || currentUser?.roles?.moderator;
  const targetIsAdmin = profile.roles?.admin;
  const targetIsModerator = profile.roles?.moderator;

  // Определяем классы и контент для роли
  const roleStyles = {
    admin: {
      borderClass: 'admin-border',
      bannerText: 'Официальный аккаунт Администратора',
      bannerClass: 'official-banner-admin',
    },
    moderator: {
      borderClass: 'moderator-border',
      bannerText: 'Официальный аккаунт Модератора',
      bannerClass: 'official-banner-moderator',
    }
  };
  
  const currentRole = targetIsAdmin ? 'admin' : targetIsModerator ? 'moderator' : null;
  const styles = currentRole ? roleStyles[currentRole] : {};

  // Проверяем наличие данных для отображения
  const hasBio = profile.bio && profile.bio.trim().length > 0;
  const hasLocation = profile.location && profile.location.trim().length > 0;
  const hasTelegramUsername = profile.telegramUsername && profile.telegramUsername.trim().length > 0;
  const hasAnyContactInfo = hasLocation || hasTelegramUsername;

  return (
    <Container>
      <h1 className="text-2xl font-bold text-gray-800 mb-4 ml-12">Профиль</h1>
      <div className={classNames(
        "max-w-4xl mx-auto bg-white rounded-lg overflow-hidden relative",
        styles.borderClass && `profile-card-wrapper ${styles.borderClass}`
      )}>
            {canModerate && !isMyProfile && !targetIsAdmin && (
          <div className="absolute top-4 right-4 z-10">
            <ModeratorActionsDropdown 
              isBanned={profile.banDetails?.isBanned}
              onBan={onBan}
              onUnban={onUnban}
              onNotify={onNotify}
            />
              </div>
            )}
        <div className="p-6">
          <BanInfo banDetails={profile.banDetails} />

          <div className="grid grid-cols-1 gap-8">
            <div className="p-2">
              <div className="flex flex-col md:flex-row items-center text-center md:text-left">
                <div 
                  className={`mb-4 md:mb-0 md:mr-6 flex-shrink-0 ${!isMyProfile ? 'cursor-pointer' : ''}`}
                  onClick={!isMyProfile ? onAvatarClick : undefined}
                >
                  <AvatarUpload 
                    currentAvatar={formatAvatarUrl(profile)} 
                    size="lg" 
                    editable={false} 
                  />
                </div>
                <div className="w-full">
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <h2 className="text-2xl font-bold">
                      {profile.username}
                    </h2>
                    <RoleBadge user={profile} />
                  </div>
                  <div className="flex items-center justify-center md:justify-start mt-1 text-sm text-gray-500">
                    {profile.isOnline ? (
                      <span className="flex items-center">
                        <span className="h-2 w-2 mr-1.5 bg-green-500 rounded-full animate-pulse"></span>
                        Онлайн
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <span className="h-2 w-2 mr-1.5 bg-gray-400 rounded-full"></span>
                        Был(а) в сети {formatLastSeen(profile.lastSeen)}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 mt-1 text-sm">На платформе с {new Date(profile.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              
                {hasBio && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">О себе</h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
                  </div>
                )}
            </div>
                
            {hasAnyContactInfo && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {hasLocation && (
                <div className="bg-gray-50 p-4 rounded-xl hover:shadow-md transition-shadow">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Город</h3>
                  <p className="text-gray-800 font-semibold">{profile.location}</p>
                  </div>
                )}
                
                {hasTelegramUsername && (
                 <div className="bg-gray-50 p-4 rounded-xl hover:shadow-md transition-shadow">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Telegram</h3>
                     <a 
                        href={`https://t.me/${profile.telegramUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-800 font-semibold flex items-center"
                      >
                       <FaTelegramPlane className="mr-2" />
                       @{profile.telegramUsername}
                      </a>
                   </div>
                )}
            </div>
            )}
                
            {profile.roles?.helper && (
              <div className="p-2">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Помощь в предметах</h3>
                {profile.subjects?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {profile.subjects.map((subject, index) => (
                      <span key={index} className="px-3 py-1 bg-primary-100 text-primary-800 text-sm font-medium rounded-full">
                            {subjectOptions.find(s => s.value === subject)?.label || subject}
                          </span>
                        ))}
                      </div>
                    ) : (
                  <p className="text-gray-500 italic">Предметы не указаны</p>
                    )}
                  </div>
                )}
              
              <ProfileStats profile={profile} />
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
  onDeleteAccount,
  onLinkTelegram,
  onUnlinkTelegram,
  isTelegramLoading,
  isUsernameChangeBlocked,
  nextUsernameChangeDate
}) => {
  // Обработчик изменения аватара
  const handleAvatarChange = (avatarUrl) => {
    handleProfileChange({ target: { name: 'avatar', value: avatarUrl } });
  };

  const canUnlinkTelegram = currentUser.hasPassword;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4 animate-gradient-x">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-3xl mb-6 shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
                </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Мой профиль
          </h1>
          <p className="text-gray-500">
            Управляйте своими личными данными и настройками
          </p>
            </div>
            
        {/* Main Form Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
            <form onSubmit={handleProfileSubmit} className="space-y-8">
              {profileSuccess && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl animate-fade-in">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                  <p className="text-sm text-green-800">{profileSuccess}</p>
                  </div>
                </div>
              )}
              
              {profileError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl animate-fade-in">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                  <p className="text-sm text-red-800">{profileError}</p>
                  </div>
                </div>
              )}
              
            {/* Аватар по центру */}
            <div className="flex justify-center">
              <AvatarUpload 
                currentAvatar={formatAvatarUrl(profileData)}
                onAvatarChange={handleAvatarChange}
                size="lg"
                className="shadow-lg hover:shadow-xl transition-shadow duration-300"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Никнейм
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                  <input
                    type="text"
                    name="username"
                    id="username"
                    value={profileData.username || ''}
                    onChange={handleProfileChange}
                    disabled={isUsernameChangeBlocked || isProfileLoading}
                  className={`block w-full pl-10 py-3 border ${
                    profileErrors.username ? 'border-red-300' : 'border-gray-300'
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 ${
                    isUsernameChangeBlocked || isProfileLoading ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  />
              </div>
                  {isUsernameChangeBlocked && (
                <p className="text-sm text-red-600 flex items-center animate-fade-in">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                      Вы сможете изменить никнейм только после {nextUsernameChangeDate}.
                    </p>
                  )}
              {profileErrors.username && (
                <p className="text-sm text-red-600 flex items-center animate-fade-in">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {profileErrors.username}
                </p>
              )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                  Город
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={profileData.location || ''}
                    onChange={handleProfileChange}
                    placeholder="Например, Алматы"
                    className={`block w-full pl-10 py-3 border ${
                      profileErrors.location ? 'border-red-300' : 'border-gray-300'
                    } rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300`}
                  />
                </div>
                {profileErrors.location && (
                  <p className="text-sm text-red-600 flex items-center animate-fade-in">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {profileErrors.location}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="grade" className="block text-sm font-medium text-gray-700">
                  Класс
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                    </svg>
                  </div>
                  <select
                    id="grade"
                    name="grade"
                    value={profileData.grade || ''}
                    onChange={handleProfileChange}
                    className="block w-full pl-10 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 appearance-none bg-white"
                  >
                    <option value="">Выберите класс</option>
                    {[...Array(5)].map((_, i) => (
                      <option key={i + 7} value={i + 7}>{i + 7} класс</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                </div>
              </div>

            <div className="space-y-2">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Телефон
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <input
                  type="tel"
                  name="phone"
                  id="phone"
                  value={formatPhoneNumber(profileData.phone) || ''}
                  className="block w-full pl-10 py-3 border border-gray-200 rounded-xl bg-gray-100 cursor-not-allowed text-gray-500"
                  placeholder="Привязывается через Telegram"
                  readOnly
                  disabled
                />
              </div>
              <p className="text-xs text-gray-500">Телефон привязывается и обновляется через Telegram.</p>
              </div>
              
            <div className="space-y-2">
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                О себе
              </label>
              <div className="relative">
                <div className="absolute top-3 left-3 flex items-start pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <textarea
                  id="bio"
                  name="bio"
                  rows="4"
                  value={profileData.bio || ''}
                  onChange={handleProfileChange}
                  placeholder="Расскажите немного о себе..."
                  className="block w-full pl-10 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                ></textarea>
              </div>
            </div>
            
            {/* Предметы для хелперов */}
              {currentUser.roles && currentUser.roles.helper && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Предметы, в которых вы можете помочь
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {subjectOptions.map((option) => (
                    <div 
                      key={option.value} 
                      className={`cursor-pointer rounded-xl p-3 flex items-center transition-all duration-300 ${
                        (profileData.subjects || []).includes(option.value) 
                          ? 'bg-indigo-100 border border-indigo-300' 
                          : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                      }`}
                      onClick={() => handleSubjectsChange({ target: { name: option.value, checked: !(profileData.subjects || []).includes(option.value) } })}
                    >
                      <span className="text-sm">{option.label}</span>
                      {(profileData.subjects || []).includes(option.value) && (
                        <svg className="ml-auto h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
            <button
              type="submit"
              disabled={isProfileLoading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg"
            >
              {isProfileLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Сохранение...
                </>
              ) : (
                'Сохранить изменения'
              )}
                </button>
            </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Интеграция с Telegram</span>
            </div>
          </div>

          {/* Telegram Block */}
                {currentUser.telegramId ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                        <div className="flex items-center">
                            <FaTelegramPlane className="w-6 h-6 mr-3 text-green-600" />
                            <div>
                                <p className="text-sm font-semibold text-gray-800">
                                    Аккаунт привязан к @{currentUser.telegramUsername || currentUser.telegramId}
                                </p>
                                <p className="text-xs text-gray-600">Вы получаете уведомления в Telegram.</p>
                            </div>
                        </div>
              <div className="mt-4">
                            <button 
                                onClick={onUnlinkTelegram} 
                  className="w-full bg-gray-500 text-white font-bold py-3 px-4 rounded-xl hover:bg-gray-600 transition-all duration-300 flex items-center justify-center text-base disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isTelegramLoading || !canUnlinkTelegram}
                            >
                  {isTelegramLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Отвязка...
                    </>
                  ) : (
                                  <>
                                    <FaTelegramPlane className="w-5 h-5 mr-2" />
                                    Отвязать Telegram
                                  </>
                                )}
                            </button>
                        </div>
                        {!canUnlinkTelegram && (
                            <p className="text-xs text-red-600 mt-2">
                                Вы не можете отвязать Telegram, так как у вас не установлен пароль для входа.
                            </p>
                        )}
                    </div>
                ) : (
            <div>
                        <p className="text-sm text-gray-600 mb-3">
                            Привяжите свой Telegram, чтобы получать уведомления о новых ответах и статусах ваших запросов.
                        </p>
                         <button
                            type="button"
                            onClick={onLinkTelegram}
                className="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-xl hover:bg-blue-600 transition-all duration-300 flex items-center justify-center text-base disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isTelegramLoading}
                        >
                {isTelegramLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Подготовка...
                  </>
                ) : (
                  <>
                             <FaTelegramPlane className="w-5 h-5 mr-2" />
                            Привязать Telegram
                  </>
                )}
                        </button>
                    </div>
                )}

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Опасная зона</span>
            </div>
            </div>

          {/* Danger Zone */}
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex flex-col sm:flex-row sm:items-center">
                    <div className="flex-grow mb-3 sm:mb-0">
                <h3 className="font-bold text-red-800">Удаление аккаунта</h3>
                        <p className="text-sm text-red-700">
                            Удаление аккаунта - необратимое действие. Все ваши данные будут стерты.
                        </p>
                        </div>
                    <div className="sm:ml-4">
                      <button 
                        type="button" 
                        onClick={onDeleteAccount} 
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300"
                            disabled={isProfileLoading}
                      >
                        Удалить аккаунт
                      </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

const ProfilePage = () => {
  const { 
    currentUser, 
    loading: authLoading, 
    updateProfile, 
    logout, 
    handleLinkTelegram,
    handleUnlinkTelegram,
    isTelegramLoading,
  } = useAuth();
  const { identifier } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMyProfile, setIsMyProfile] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [isDeletingLoading, setIsDeletingLoading] = useState(false);
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [isNotificationModalOpen, setNotificationModalOpen] = useState(false);
  
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileErrors, setProfileErrors] = useState({});
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  
  const [profileData, setProfileData] = useState({});
  
  const { checkAndShowModal, ReadOnlyModalComponent } = useReadOnlyCheck();
  
  const [isUsernameChangeBlocked, setIsUsernameChangeBlocked] = useState(false);
  const [nextUsernameChangeDate, setNextUsernameChangeDate] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [viewerImageSrc, setViewerImageSrc] = useState(null);
  
  // --- НОВЫЕ СТЕЙТЫ ДЛЯ ПОДТВЕРЖДЕНИЯ ---
  const [isConfirmingModAction, setIsConfirmingModAction] = useState(false);
  const [modActionCallback, setModActionCallback] = useState(null);
  const [modActionLoading, setModActionLoading] = useState(false);
  
  const fetchUserData = useCallback(async (userIdentifier) => {
    if (!userIdentifier) return;
    setLoading(true);
    setError(null);
    try {
      const response = await usersService.getUserById(userIdentifier);
      const userData = response.data;
      setProfile(userData);
      setProfileData(userData);
      
      // Сброс состояния перед проверкой
      setIsUsernameChangeBlocked(false);
      setNextUsernameChangeDate(null);

      // --- Логика блокировки смены ника ---
      if (userData && userData.lastUsernameChange) {
          const lastChange = new Date(userData.lastUsernameChange);
          const now = new Date();
          const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
          const timeSinceChange = now.getTime() - lastChange.getTime();
    
          if (timeSinceChange < thirtyDaysInMs) {
              setIsUsernameChangeBlocked(true);
              const nextDate = new Date(lastChange.getTime() + thirtyDaysInMs);
              setNextUsernameChangeDate(nextDate.toLocaleDateString('ru-RU'));
          }
      }
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
    else if (!authLoading) {
      if (currentUser) {
        // --- ИСПРАВЛЕНИЕ: Устанавливаем и profile, и profileData ---
        setProfile({ ...currentUser });
        setProfileData({ ...currentUser });
        setIsMyProfile(true);
        setLoading(false);

        // --- ИСПРАВЛЕНИЕ: Добавляем логику кулдауна для своего профиля ---
        setIsUsernameChangeBlocked(false);
        setNextUsernameChangeDate(null);

        if (currentUser.lastUsernameChange) {
            const lastChange = new Date(currentUser.lastUsernameChange);
            const now = new Date();
            const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
            const timeSinceChange = now.getTime() - lastChange.getTime();
      
            if (timeSinceChange < thirtyDaysInMs) {
                setIsUsernameChangeBlocked(true);
                const nextDate = new Date(lastChange.getTime() + thirtyDaysInMs);
                setNextUsernameChangeDate(nextDate.toLocaleDateString('ru-RU'));
            }
        }
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
         setProfileData({ ...profile });
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
    
    // --- ИСПРАВЛЕНИЕ: Добавляем проверку на read-only режим ---
    if (checkAndShowModal()) {
      return; // Если юзер в ридонли, прерываем выполнение
    }

    // Проверяем, изменился ли никнейм
    if (profile && profileData.username && profileData.username.toLowerCase() !== profile.username) {
        setIsConfirmModalOpen(true); // Если да - открываем модалку для подтверждения
        return; // и прерываем сабмит
    }
    // Если ник не менялся - просто сохраняем
    await saveProfile(profileData);
  };
  
  const handleConfirmUsernameChange = async () => {
      setIsConfirmModalOpen(false); // Закрываем модалку
      await saveProfile(profileData); // И сохраняем профиль
  };

  const saveProfile = async (data) => {
    setIsProfileLoading(true);
    setProfileSuccess('');
    setProfileError('');
    setProfileErrors({});

    const getChangedData = (original, current) => {
      const changes = {};
      const editableFields = ['username', 'location', 'grade', 'bio', 'subjects', 'avatar'];

      editableFields.forEach(key => {
        const originalValue = original?.[key];
        const currentValue = current?.[key];

        if (key === 'subjects') {
          const sortedOriginal = [...(originalValue || [])].sort();
          const sortedCurrent = [...(currentValue || [])].sort();
          if (JSON.stringify(sortedOriginal) !== JSON.stringify(sortedCurrent)) {
            changes[key] = currentValue || [];
          }
        } else if (originalValue !== currentValue) {
          changes[key] = currentValue;
        }
      });
      return changes;
    };

    const changedData = getChangedData(profile, data);

    if (Object.keys(changedData).length === 0) {
      toast.info("Нет изменений для сохранения.");
      setIsProfileLoading(false);
      return;
    }

    const result = await updateProfile(changedData);

    if (result.success) {
      toast.success('Профиль успешно обновлен!');
      setProfileSuccess('Профиль успешно обновлен!');
      setProfile(prev => ({ ...prev, ...result.user }));
      setProfileData(prev => ({ ...prev, ...result.user }));
    } else {
      const errorMessage = result.error || 'Ошибка при обновлении профиля';
      toast.error(errorMessage);
      setProfileError(errorMessage);
    }
    
    setIsProfileLoading(false);
  };
  
  const handleRequestDeletion = async () => {
    // Эта функция вызывается из первой модалки (с вводом ника)
    setIsDeletingLoading(true);
    try {
      // Это теперь шаг 1: запрос кода
      const res = await usersService.requestAccountDeletion();
      
      // Если бэкенд ответил, что ждет подтверждения
      if (res.status === 202) {
        toast.success(res.data.message || 'Код подтверждения отправлен в Telegram.');
        setIsDeleteModalOpen(false); // Закрываем первую модалку
        setIsConfirmDeleteModalOpen(true); // Открываем вторую
      }
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Не удалось запросить удаление.');
      console.error(err);
    } finally {
      setIsDeletingLoading(false);
    }
  };
  
  const handleConfirmDeletion = async (confirmationCode) => {
    // Эта функция вызывается из второй модалки (с вводом кода)
    setIsDeletingLoading(true);
    try {
      await usersService.confirmAccountDeletion(confirmationCode);
      toast.success('Ваш аккаунт был успешно удален.');
      logout(); // Выходим из системы
      // Редирект на главную произойдет автоматически из-за выхода
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Не удалось удалить аккаунт.');
      console.error(err);
    } finally {
      setIsDeletingLoading(false);
      setIsConfirmDeleteModalOpen(false); // Закрываем модалку в любом случае
    }
  };

  const handleBanUser = async (reason, duration) => {
    if (!profile) return;
    setModActionCallback(() => async (confirmationCode) => { // Сохраняем коллбэк
      setModActionLoading(true);
      try {
        // Вызываем сервис с кодом
        await usersService.banUser(profile._id, reason, duration, confirmationCode);
        toast.success(`Пользователь ${profile.username} забанен.`);
        setIsConfirmingModAction(false); // Закрываем модалку подтверждения
        fetchUserData(profile._id); // Обновляем данные
      } catch (err) {
        console.error('Ошибка при подтверждении бана:', err);
        toast.error(err.response?.data?.msg || 'Не удалось забанить пользователя.');
      } finally {
        setModActionLoading(false);
      }
    });

    try {
      // Первая попытка без кода
      await usersService.banUser(profile._id, reason, duration);
      // Если прошло без ошибки (например, для админа без 2FA), просто обновляем
      toast.success(`Пользователь ${profile.username} забанен.`);
      fetchUserData(profile._id);
    } catch (err) {
      // Ожидаемая ошибка, требующая подтверждения
      if (err.response && err.response.data.confirmationRequired) {
        setIsBanModalOpen(false); // Закрываем модалку с причиной
        setIsConfirmingModAction(true); // Открываем модалку с кодом
        toast.info(err.response.data.message);
      } else {
        // Неожиданная ошибка
        console.error('Ошибка при бане:', err);
        toast.error(err.response?.data?.msg || 'Не удалось забанить пользователя.');
      }
    }
    setIsBanModalOpen(false); // Закрываем в любом случае
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

  const handleAvatarClick = () => {
    if (profile && profile.avatar) {
      setViewerImageSrc(formatAvatarUrl(profile));
    }
  };

  const handleSendNotificationClick = () => {
    setNotificationModalOpen(true);
  };

  const handleNotificationSent = (notification) => {
    toast.success(`Уведомление для ${profile.username} успешно отправлено!`);
    // Тут можно будет добавить что-то еще, если понадобится
  };

  if (loading || authLoading) return <Loader />;
  if (error) return <ProfileNotFound />;

  return (
    <>
      {identifier ? (
        <>
          <UserProfileView
            profile={profile}
            currentUser={currentUser}
            onBack={() => navigate(-1)}
            onBan={() => setIsBanModalOpen(true)}
            onUnban={handleUnbanUser}
            onNotify={handleSendNotificationClick}
            isMyProfile={isMyProfile}
            onAvatarClick={handleAvatarClick}
          />
          {profile?.roles?.helper && (
            <div className="container mx-auto px-4 py-8">
              <div className="max-w-4xl mx-auto">
                  <ReviewsBlock userId={profile._id} />
              </div>
            </div>
          )}
        </>
      ) : (
        <ProfileEditor
          profileData={profileData}
          profileErrors={profileErrors}
          profileSuccess={profileSuccess}
          profileError={profileError}
          isProfileLoading={isProfileLoading}
          handleProfileChange={handleProfileChange}
          handleProfileSubmit={handleProfileSubmit}
          currentUser={currentUser}
          handleSubjectsChange={handleSubjectsChange}
          onDeleteAccount={() => setIsDeleteModalOpen(true)}
          onLinkTelegram={handleLinkTelegram}
          onUnlinkTelegram={handleUnlinkTelegram}
          isTelegramLoading={isTelegramLoading}
          isUsernameChangeBlocked={isUsernameChangeBlocked}
          nextUsernameChangeDate={nextUsernameChangeDate}
        />
      )}
      <DeleteAccountModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleRequestDeletion}
        username={currentUser?.username}
        isLoading={isDeletingLoading}
      />
      <DeleteConfirmModal 
        isOpen={isConfirmDeleteModalOpen}
        onClose={() => setIsConfirmDeleteModalOpen(false)}
        onConfirm={handleConfirmDeletion}
        isLoading={isDeletingLoading}
      />
      <BanUserModal
        isOpen={isBanModalOpen}
        onClose={() => setIsBanModalOpen(false)}
        onConfirm={handleBanUser}
        username={profile?.username}
      />
      <ReadOnlyModalComponent />
      <ConfirmUsernameChangeModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmUsernameChange}
        newUsername={profileData.username}
      />
      <ModeratorActionConfirmModal
        isOpen={isConfirmingModAction}
        onClose={() => setIsConfirmingModAction(false)}
        onConfirm={modActionCallback}
        actionTitle={`Бан пользователя ${profile?.username}`}
        isLoading={modActionLoading}
      />
      <ImageViewerModal 
        src={viewerImageSrc} 
        alt={`Аватар ${profile?.username}`} 
        onClose={() => setViewerImageSrc(null)} 
      />
      <SendNotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setNotificationModalOpen(false)}
        recipient={profile}
        onNotificationSent={handleNotificationSent}
      />
    </>
  );
};

export default ProfilePage; 