import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { toast } from 'react-toastify';
import { authService, usersService, notificationsService, baseURL } from '../services/api';
import { formatAvatarUrl } from '../services/avatarUtils';
import { getAuthToken, setAuthToken as storeToken, clearAuthToken as removeToken } from '../services/tokenStorage';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(getAuthToken());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [banDetails, setBanDetails] = useState(null);
  const [isBannedModalOpen, setIsBannedModalOpen] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [isRequireTgModalOpen, setIsRequireTgModalOpen] = useState(false);
  const [linkTelegramHandler, setLinkTelegramHandler] = useState(null);
  
  // --- НОВЫЕ ГЛОБАЛЬНЫЕ СОСТОЯНИЯ ДЛЯ ПРИВЯЗКИ TELEGRAM ---
  const [isLinkTelegramModalOpen, setLinkTelegramModalOpen] = useState(false);
  const [telegramLinkUrl, setTelegramLinkUrl] = useState('');
  const [isTelegramLoading, setIsTelegramLoading] = useState(false);
  const [pollingIntervalId, setPollingIntervalId] = useState(null);

  // Компонент для кастомного тоста, вынесен для стабильности
  const ToastBody = ({ title, message, link }) => (
    <a href={link} className="block w-full" onClick={() => toast.dismiss()}>
      <p className="font-bold text-gray-800">{title}</p>
      {message && <p className="text-sm text-gray-600">{message}</p>}
    </a>
  );

  const processUserData = useCallback((userData) => {
    if (!userData) return null;
    return {
      ...userData,
      formattedAvatar: formatAvatarUrl(userData),
    };
  }, []);

  const checkAdminTelegramRequirement = useCallback((user) => {
    if (user && (user.roles?.admin || user.roles?.moderator) && !user.telegramId) {
      setIsRequireTgModalOpen(true);
      return true;
    }
    setIsRequireTgModalOpen(false);
    return false;
  }, []);

  const showBanModal = useCallback((details) => {
    setBanDetails(details);
    setIsBannedModalOpen(true);
  }, []);

  const processAndCheckBan = useCallback((userData) => {
    if (checkAdminTelegramRequirement(userData)) {
      setCurrentUser(processUserData(userData));
      return;
    }
    if (userData?.banDetails?.isBanned) {
      showBanModal(userData.banDetails);
    } else {
      setBanDetails(null);
      setIsBannedModalOpen(false);
    }
    setCurrentUser(processUserData(userData));
  }, [checkAdminTelegramRequirement, processUserData, showBanModal]);

  // Генерация цвета аватара на основе имени пользователя
  const generateAvatarColor = (username) => {
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 80%)`;
  };

  const _updateCurrentUserState = useCallback((newUserData) => {
    if (!newUserData) return;
    setCurrentUser(processUserData(newUserData));
    setIsReadOnly(!newUserData.telegramId);
    checkAdminTelegramRequirement(newUserData);
  }, [processUserData, checkAdminTelegramRequirement]);

  // Загрузка данных пользователя
  useEffect(() => {
    const loadUser = async () => {
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await usersService.getCurrentUser();
        processAndCheckBan(response.data);
        setIsReadOnly(!response.data.telegramId);
      } catch (err) {
        console.error('Ошибка при загрузке пользователя:', err);
        // Если токен недействителен, удаляем его
        if (err.response && err.response.status === 401) {
          removeToken();
          setToken(null);
        }
        setError(err.message);
        setIsReadOnly(true);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [processAndCheckBan]);
  
  // Управление SSE-соединением УДАЛЕНО

  // Функция для входа пользователя
  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await authService.login(credentials);
      storeToken(data.token);
      setToken(data.token);
      
      processAndCheckBan(data.user);
      setIsReadOnly(!data.user.telegramId);
      
      setLoading(false);
      toast.success('Вход выполнен успешно!');
      return { success: true };

    } catch (err) {
      console.error('Ошибка входа:', err);

      let errorMessage;
      if (err.response && err.response.status === 429) {
        errorMessage = 'Слишком много попыток входа. Попробуйте снова через час.';
      } else if (err.response && err.response.status === 403) {
        errorMessage = err.response?.data?.msg || 'Доступ запрещен. Ваш аккаунт может быть заблокирован.';
      } else {
        errorMessage = err.response?.data?.msg || 'Неверные учетные данные';
      }

      setError(errorMessage);
      toast.error(errorMessage);
      setLoading(false);
      setIsReadOnly(true);
      return { success: false, error: errorMessage };
    }
  };

  // Вход с использованием токена (например, после Telegram)
  const loginWithToken = (token, user) => {
    setLoading(true);
    try {
      storeToken(token);
      setToken(token);
      processAndCheckBan(user);
      toast.success(`Добро пожаловать, ${user.username}!`);
    } catch (error) {
      console.error('Ошибка при обработке токена:', error);
      setError('Ошибка при обработке токена');
      toast.error('Ошибка при обработке токена');
    } finally {
      setLoading(false);
    }
  };

  // Функция для регистрации пользователя
  const register = async (userData) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('AuthContext: Начинаем регистрацию, данные:', JSON.stringify(userData));
      
      // Проверяем, есть ли данные аватара в userData и подготавливаем их к отправке
      let formData = new FormData();
      let hasAvatar = false;
      
      // Копируем все поля из userData в formData, кроме аватара
      Object.keys(userData).forEach(key => {
        if (key === 'avatar') {
          if (userData.avatar instanceof File) {
            console.log('AuthContext: В данных присутствует аватар в виде файла');
            formData.append('avatar', userData.avatar);
            hasAvatar = true;
          } else if (userData.avatar && typeof userData.avatar === 'string' && userData.avatar.length > 0) {
            console.log('AuthContext: В данных присутствует аватар в виде URL:', userData.avatar.substring(0, 100) + '...');
            // Если аватар - строка (URL или base64), добавляем как есть
            formData.append('avatar', userData.avatar);
            hasAvatar = true;
          }
        } else if (key === 'subjects' && Array.isArray(userData[key])) {
          // Для массивов (например, предметы) добавляем каждый элемент отдельно
          userData[key].forEach(subject => {
            formData.append('subjects', subject);
          });
        } else {
          formData.append(key, userData[key]);
        }
      });
      
      if (!hasAvatar) {
        console.log('AuthContext: Аватар не предоставлен в данных регистрации');
      }
      
      const response = await authService.register(formData);
      console.log('AuthContext: Ответ сервера о регистрации:', response);
      
      if (response && response.data) {
        console.log('AuthContext: Регистрация успешна, данные ответа:', response.data);
        
        // Проверяем, содержит ли ответ токен, который нужно сохранить
        if (response.data.token && response.data.user) {
            console.log('AuthContext: Получены токен и пользователь. Вызываем loginWithToken.');
            // Используем loginWithToken для установки состояния
            loginWithToken(response.data.token, response.data.user);
            // Возвращаем успех, чтобы компонент мог среагировать
            return { success: true };
        } else {
            console.warn('AuthContext: Ответ не содержит токен или пользователя.');
            // На всякий случай обрабатываем ситуацию, когда чего-то не хватает
            setError('Не удалось завершить сессию после регистрации.');
            toast.error('Не удалось завершить сессию после регистрации.');
            return { success: false, error: 'Missing token or user data' };
        }
      } else {
        console.error('AuthContext: Неожиданный формат ответа:', response);
        setLoading(false);
        throw new Error('Неожиданный формат ответа от сервера');
      }
    } catch (err) {
      console.error('AuthContext: Ошибка при регистрации:', err);
      
      // Расширенное логирование информации об ошибке
      if (err.response) {
        console.error('AuthContext: Данные ошибки:', err.response.data);
        console.error('AuthContext: Статус ошибки:', err.response.status);
        console.error('AuthContext: Заголовки ответа:', err.response.headers);
        
        // Полезно для отладки - сериализуем полностью ответ об ошибке
        try {
          console.error('AuthContext: Полный объект ответа:', JSON.stringify(err.response));
        } catch (e) {
          console.error('AuthContext: Не удалось сериализовать объект ответа');
        }
      }
      
      const errorMessage = err.response?.data?.msg || err.message || 'Ошибка регистрации';
      setError(errorMessage);
      toast.error(errorMessage);
      setLoading(false);
      setIsReadOnly(true);
      
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  };

  // Функция для обновления аватара пользователя
  const updateAvatar = (avatarUrl) => {
    if (currentUser) {
      const updatedUser = { 
        ...currentUser, 
        avatar: avatarUrl,
        formattedAvatar: formatAvatarUrl(avatarUrl, currentUser.username)
      };
      setCurrentUser(processUserData(updatedUser));
    }
  };

  // Функция для обновления профиля пользователя
  const updateProfile = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const payload = { ...userData };
      // Принудительно удаляем поля, которые могут вызвать проверку пароля на бэкенде
      delete payload.password;
      delete payload.roles;
      delete payload._id;
      delete payload.id;

      console.log('Отправка очищенных данных на сервер:', JSON.stringify(payload));
      const response = await usersService.updateProfile(payload);
      
      // Сохраняем telegramId из текущего пользователя, если его нет в ответе
      const mergedData = {...currentUser, ...response.data};
      if (response.data.telegramId === undefined && currentUser.telegramId) {
        mergedData.telegramId = currentUser.telegramId;
      }
      
      const updatedUserData = processUserData(mergedData);
      setCurrentUser(updatedUserData);
      setIsReadOnly(!updatedUserData.telegramId);
      
      setLoading(false);
      return { success: true, user: response.data };
    } catch (err) {
      console.error('Ошибка обновления профиля:', err);
      console.error('Детали ошибки:', JSON.stringify(err.response?.data || {}));
      
      let errorMessage = 'Ошибка при обновлении профиля';
      if (err.response) {
        if (err.response.data.errors && err.response.data.errors.length > 0) {
          errorMessage = err.response.data.errors.map(e => e.msg).join(', ');
        } else if (err.response.data.msg) {
          errorMessage = err.response.data.msg;
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage); // Показываем тост с ошибкой здесь
      setLoading(false);
      setIsReadOnly(true);
      return { success: false, error: errorMessage };
    }
  };

  // Функция для обновления пароля пользователя
  const updatePassword = async (currentPassword, newPassword) => {
    setLoading(true);
    setError(null);
    try {
      const response = await usersService.updatePassword(currentPassword, newPassword);
      setLoading(false);
      setIsReadOnly(!response.data.telegramId);
      return { success: true, data: response.data };
    } catch (err) {
      console.error('Ошибка обновления пароля:', err);
      setError(err.response?.data?.msg || 'Ошибка при обновлении пароля');
      setLoading(false);
      setIsReadOnly(true);
      return { success: false, error: err.response?.data?.msg || 'Ошибка при обновлении пароля' };
    }
  };

  // Функция для выхода пользователя
  const logout = async (showToast = true) => {
    console.log('Выполняется выход...');
    try {
        const token = getAuthToken();
        if (token) {
            await authService.logout();
        }
    } catch (err) {
        console.error("Ошибка при выходе на сервере, но выходим локально", err);
    } finally {
        setCurrentUser(null);
        removeToken();
        setToken(null);
        // Закрываем все модальные окна и сбрасываем состояния
        setIsBannedModalOpen(false);
        setBanDetails(null);
        setIsReadOnly(true);
    }
  };

  const closeLinkTelegramModal = useCallback(() => {
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
    }
    setLinkTelegramModalOpen(false);
  }, [pollingIntervalId]);

  const handleLinkTelegram = useCallback(async () => {
    setIsTelegramLoading(true);
    try {
      if (pollingIntervalId) clearInterval(pollingIntervalId);

      const { data } = await authService.generateLinkToken();
      const token = data.linkToken;
      const botUsername = process.env.REACT_APP_BOT_USERNAME;

      if (!botUsername) {
        toast.error('Имя бота не настроено. Обратитесь к администратору.');
        return;
      }

      const url = `https://t.me/${botUsername}?start=${token}`;
      setTelegramLinkUrl(url);
      setLinkTelegramModalOpen(true);

      const intervalId = setInterval(async () => {
        try {
          const statusRes = await authService.checkLinkStatus(token);
          if (statusRes.data.status === 'linked') {
            toast.success('Telegram успешно привязан!');
            const response = await usersService.getMe();
            _updateCurrentUserState(response.data);
            closeLinkTelegramModal(); // Закроет модалку и очистит интервал
          }
        } catch (pollError) {
           console.error('Ошибка опроса статуса привязки:', pollError);
           if (pollError.response?.status === 404) {
               closeLinkTelegramModal();
           }
        }
      }, 3000);
      setPollingIntervalId(intervalId);

    } catch (error) {
      toast.error('Не удалось сгенерировать ссылку для привязки.');
      console.error(error);
    } finally {
      setIsTelegramLoading(false);
    }
  }, [pollingIntervalId, _updateCurrentUserState, closeLinkTelegramModal]);

  const handleUnlinkTelegram = useCallback(async () => {
    if (window.confirm('Вы уверены, что хотите отвязать Telegram? Это действие нельзя будет отменить.')) {
        setIsTelegramLoading(true);
        try {
            const res = await authService.unlinkTelegram();
            toast.success(res.data.msg);
            _updateCurrentUserState(res.data.user);
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Не удалось отвязать Telegram.');
        } finally {
            setIsTelegramLoading(false);
        }
    }
  }, [_updateCurrentUserState]);

  const value = {
    currentUser,
    loading,
    error,
    token,
    banDetails,
    isBannedModalOpen,
    showBanModal,
    closeBanModal: () => setIsBannedModalOpen(false),
    setBanDetails,
    login,
    logout,
    register,
    updateProfile,
    _updateCurrentUserState,
    updatePassword,
    updateAvatar,
    generateAvatarColor,
    loginWithToken,
    isReadOnly,
    updateUser: _updateCurrentUserState,
    isRequireTgModalOpen,
    handleLinkTelegram,
    handleUnlinkTelegram,
    isLinkTelegramModalOpen,
    telegramLinkUrl,
    isTelegramLoading,
    closeLinkTelegramModal,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext; 