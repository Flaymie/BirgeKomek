import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import classNames from 'classnames';
import { usersService, authService } from '../../services/api';
import { formatAvatarUrl } from '../../services/avatarUtils';
import AvatarUpload from '../layout/AvatarUpload';
import DeleteAccountModal from '../modals/DeleteAccountModal';
import DeleteConfirmModal from '../modals/DeleteConfirmModal';
import BanUserModal from '../modals/BanUserModal';
import ProfileNotFound from '../shared/ProfileNotFound';
import { FaTelegramPlane } from 'react-icons/fa';
import ReviewsBlock from '../shared/ReviewsBlock';
import { useReadOnlyCheck } from '../../hooks/useReadOnlyCheck';
import ConfirmUsernameChangeModal from '../modals/ConfirmUsernameChangeModal';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import './ProfilePage.css';
import RoleBadge from '../shared/RoleBadge';

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

  return (
    <Container>
      <div className={classNames(
        "max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden",
        styles.borderClass && `profile-card-wrapper ${styles.borderClass}`
      )}>
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

          {currentRole && (
            <div className={classNames('official-banner', styles.bannerClass)}>
              <span>{styles.bannerText}</span>
            </div>
          )}

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
                  <h2 className="text-xl font-medium text-gray-900 flex items-center">
                    {profile.username}
                    <RoleBadge user={profile} />
                  </h2>
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
                
                {profile.telegramUsername && (
                   <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Telegram</h3>
                     <a 
                        href={`https://t.me/${profile.telegramUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 hover:underline flex items-center"
                      >
                       <FaTelegramPlane className="mr-2" />
                       @{profile.telegramUsername}
                      </a>
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
            
            <form onSubmit={handleProfileSubmit} className="space-y-8">
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
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700">Никнейм</label>
                  <input
                    type="text"
                    name="username"
                    id="username"
                    value={profileData.username || ''}
                    onChange={handleProfileChange}
                    disabled={isUsernameChangeBlocked || isProfileLoading}
                    className={classNames(
                      "mt-1 block w-full shadow-sm sm:text-sm rounded-md",
                      { "bg-gray-100 cursor-not-allowed": isUsernameChangeBlocked || isProfileLoading },
                      profileErrors.username ? "border-red-500" : "border-gray-300"
                    )}
                  />
                  {isUsernameChangeBlocked && (
                    <p className="mt-2 text-sm text-red-600">
                      Вы сможете изменить никнейм только после {nextUsernameChangeDate}.
                    </p>
                  )}
                  {profileErrors.username && <p className="mt-2 text-sm text-red-600">{profileErrors.username}</p>}
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
                    value={formatPhoneNumber(profileData.phone) || ''}
                    className="mt-1 form-input bg-gray-100 cursor-not-allowed"
                    placeholder="Привязывается через Telegram"
                    readOnly
                    disabled
                  />
                   <p className="mt-1 text-xs text-gray-500">Телефон привязывается и обновляется через Telegram.</p>
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
                    {[...Array(5)].map((_, i) => (<option key={i + 7} value={i + 7}>{i + 7} класс</option>))}
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
              
              <div className="flex items-center justify-end">
                <button type="submit" className={classNames("btn btn-primary", isProfileLoading && "opacity-75 cursor-not-allowed")} disabled={isProfileLoading}>
                  {isProfileLoading ? (<> <LoadingOverlay className="w-5 h-5 mr-2" /> Сохранение... </>) : ("Сохранить изменения")}
                </button>
              </div>
            </form>

            {/* --- ОБНОВЛЕННЫЙ БЛОК ДЛЯ TELEGRAM --- */}
            <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Интеграция с Telegram</h3>
                
                {currentUser.telegramId ? (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center">
                            <FaTelegramPlane className="w-6 h-6 mr-3 text-green-600" />
                            <div>
                                <p className="text-sm font-semibold text-gray-800">
                                    Аккаунт привязан к @{currentUser.telegramUsername || currentUser.telegramId}
                                </p>
                                <p className="text-xs text-gray-600">Вы получаете уведомления в Telegram.</p>
                            </div>
                        </div>
                        <div className="mt-4" title={!canUnlinkTelegram ? 'Сначала установите пароль, чтобы иметь возможность войти в аккаунт после отвязки.' : 'Отвязать Telegram'}>
                            <button 
                                onClick={onUnlinkTelegram} 
                                className="w-full bg-gray-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-600 transition-all duration-300 flex items-center justify-center text-base"
                                disabled={isTelegramLoading || !canUnlinkTelegram}
                            >
                                {isTelegramLoading ? <LoadingOverlay className="w-5 h-5 mr-2" /> : (
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
                    <div className="mt-4">
                        <p className="text-sm text-gray-600 mb-3">
                            Привяжите свой Telegram, чтобы получать уведомления о новых ответах и статусах ваших запросов.
                        </p>
                         <button
                            type="button"
                            onClick={onLinkTelegram}
                            className="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition-all duration-300 flex items-center justify-center text-base"
                            disabled={isTelegramLoading}
                        >
                             {isTelegramLoading && <LoadingOverlay className="w-5 h-5 mr-2" />}
                             <FaTelegramPlane className="w-5 h-5 mr-2" />
                            Привязать Telegram
                        </button>
                    </div>
                )}
            </div>

            {/* --- УЛУЧШЕННАЯ DANGER ZONE --- */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="relative overflow-hidden rounded-xl border border-red-200 bg-gradient-to-br from-red-50 via-red-50 to-red-100">
                {/* Декоративные элементы */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-200 rounded-full opacity-20 -translate-y-16 translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-300 rounded-full opacity-10 translate-y-12 -translate-x-12"></div>
                
                <div className="relative p-6">
                  {/* Заголовок с иконкой */}
                  <div className="flex items-center mb-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-full mr-3">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-red-800">Опасная зона</h3>
                  </div>
                  
                  <p className="text-sm text-red-700 mb-6 font-medium">
                    Действия в этой зоне являются необратимыми. Пожалуйста, будьте осторожны.
                  </p>
                  
                  {/* Карточка с действием */}
                  <div className="bg-white rounded-lg border border-red-200 shadow-sm p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <h4 className="text-lg font-semibold text-gray-900">
                            Удаление аккаунта
                          </h4>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          Полное удаление вашего аккаунта и всех связанных с ним данных
                        </p>
                        <p className="text-xs text-red-600 font-medium">
                          ⚠️ Это действие нельзя будет отменить
                        </p>
                      </div>
                      
                      <button 
                        type="button" 
                        onClick={onDeleteAccount} 
                        className="ml-4 inline-flex items-center px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white text-sm font-medium rounded-lg hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Удалить аккаунт
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
};

const ProfilePage = () => {
  const { 
    currentUser, 
    loading: authLoading, 
    updateProfile, 
    logout, 
    _updateCurrentUserState,
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
  
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileErrors, setProfileErrors] = useState({});
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  
  const [profileData, setProfileData] = useState({});
  
  const { checkAndShowModal, ReadOnlyModalComponent } = useReadOnlyCheck();
  
  const [isUsernameChangeBlocked, setIsUsernameChangeBlocked] = useState(false);
  const [nextUsernameChangeDate, setNextUsernameChangeDate] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  
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
        <>
          <UserProfileView
            profile={profile}
            currentUser={currentUser}
            onBack={() => navigate(-1)}
            onBan={() => setIsBanModalOpen(true)}
            onUnban={handleUnbanUser}
            isMyProfile={isMyProfile}
          />
          {/* ИСПРАВЛЕНО: Отзывы показываются только для хелперов */}
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
    </>
  );
};

export default ProfilePage; 