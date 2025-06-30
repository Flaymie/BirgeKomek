import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { requestsService, messagesService, reviewsService, serverURL, baseURL, usersService } from '../../services/api';
import { formatAvatarUrl } from '../../services/avatarUtils';
import { toast } from 'react-toastify';
import {
  PaperClipIcon,
  ArrowLeftIcon,
  ArrowUpCircleIcon,
  ArrowDownCircleIcon,
  PhotoIcon,
  DocumentTextIcon,
  ArchiveBoxIcon,
  XCircleIcon,
  PencilIcon,
  TrashIcon,
  CheckBadgeIcon,
  LockClosedIcon
} from '@heroicons/react/24/solid';
import { AnimatePresence, motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import AttachmentModal from '../modals/AttachmentModal';
import Rating from './Rating';
import { downloadFile } from '../../services/downloadService';
import ResolveConfirmationModal from '../modals/ResolveConfirmationModal';
import DefaultAvatarIcon from '../shared/DefaultAvatarIcon';
import axios from 'axios';
import { useReadOnlyCheck } from '../../hooks/useReadOnlyCheck';
import RoleBadge from '../shared/RoleBadge';

// Создаем инстанс api прямо здесь для костыльного решения
const api = axios.create({
  baseURL: baseURL,
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- Хелперы для отображения вложений ---

// Форматируем размер файла
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Подбираем иконку по типу файла
const getFileIcon = (fileType) => {
  if (!fileType) return <ArchiveBoxIcon className="h-8 w-8 text-gray-400" />;
  if (fileType.startsWith('image/')) return <PhotoIcon className="h-8 w-8 text-blue-400" />;
  if (fileType === 'application/pdf') return <DocumentTextIcon className="h-8 w-8 text-red-400" />;
  // Проверяем на архивы
  if (['application/vnd.rar', 'application/x-rar-compressed', 'application/zip', 'application/x-zip-compressed', 'application/x-7z-compressed'].includes(fileType)) {
    return <ArchiveBoxIcon className="h-8 w-8 text-yellow-500" />;
  }
  return <DocumentTextIcon className="h-8 w-8 text-gray-400" />;
};

// Компонент для одного вложения (простой, без заглушек для фото)
const Attachment = ({ file, isOwnMessage, onImageClick }) => {
  const isImage = file.fileType && file.fileType.startsWith('image/');
  const fileUrl = `${serverURL}${file.fileUrl}`;

  const [isDownloading, setIsDownloading] = useState(false);

  const handleFileDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    await downloadFile(file);
    setIsDownloading(false);
  };

  if (isImage) {
    // Просто показываем картинку, без всяких заглушек
    return (
      <div onClick={() => onImageClick(file)} className="cursor-pointer max-w-[280px] rounded-lg overflow-hidden">
        <img src={fileUrl} alt={file.fileName} className="w-full h-auto object-cover" />
      </div>
    );
  }

  // Логика для обычных файлов (с индикатором загрузки)
  const attachmentBg = isOwnMessage ? 'bg-indigo-400' : 'bg-gray-300';
  const textColor = isOwnMessage ? 'text-indigo-100' : 'text-gray-600';

  return (
    <div className={`p-2 rounded-lg flex items-center gap-3 max-w-[280px] ${attachmentBg}`}>
      <button
        onClick={handleFileDownload}
        disabled={isDownloading}
        className="text-white bg-indigo-500 rounded-full p-2 hover:bg-indigo-600 transition-colors focus:outline-none disabled:bg-indigo-400 disabled:cursor-wait"
      >
        {isDownloading ? (
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white"></div>
        ) : (
          <ArrowDownCircleIcon className="h-6 w-6" />
        )}
      </button>
      <div className="overflow-hidden flex-1">
        <p className={`font-medium truncate ${isOwnMessage ? 'text-white' : 'text-gray-800'}`}>{file.fileName}</p>
        <p className={`text-sm ${textColor}`}>
          {formatFileSize(file.fileSize)}
        </p>
      </div>
    </div>
  );
};

// Новый компонент сообщения
const Message = ({ msg, isOwnMessage, onImageClick, onEdit, onDelete, isChatActive }) => {
  const hasAttachments = msg.attachments && msg.attachments.length > 0;
  const isDeleted = msg.content === 'Сообщение удалено';
  const isImageOnly = hasAttachments && !msg.content && msg.attachments.length === 1 && msg.attachments[0].fileType.startsWith('image/');
  const avatarUrl = formatAvatarUrl(msg.sender);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`group flex items-end gap-2 mb-4 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
    >
      <Link to={`/profile/${msg.sender._id}`} className="flex-shrink-0 self-end">
        {avatarUrl ? (
          <img src={avatarUrl} alt={msg.sender.username} className="w-8 h-8 rounded-full" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
            <DefaultAvatarIcon className="w-5 h-5 text-gray-500" />
          </div>
        )}
      </Link>

      {/* Основной пузырь сообщения или просто картинка */}
      <div className={`relative ${isDeleted ? 'italic' : ''} ${!isImageOnly ? `rounded-lg max-w-sm md:max-w-md ${isOwnMessage ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-800'}` : ''}`}>

        {hasAttachments && !isDeleted && (
          <div className={!isImageOnly ? (msg.content ? 'pt-1 px-1' : 'p-1') : ''}>
            {msg.attachments.map((file, index) => (
              <Attachment key={index} file={file} isOwnMessage={isOwnMessage} onImageClick={onImageClick} />
            ))}
          </div>
        )}

        {msg.content && (
          <div className={`break-words ${hasAttachments ? 'px-2 pb-1 pt-2' : 'px-3 py-2'}`}>
            {msg.content}
          </div>
        )}

        {/* Timestamp - теперь с разными стилями */}
        <div className={`text-xs mt-1 text-right ${isImageOnly ? 'absolute bottom-1.5 right-1.5 bg-black bg-opacity-50 text-white px-1.5 py-0.5 rounded-lg pointer-events-none' : (isOwnMessage ? 'text-indigo-200' : 'text-gray-500')} ${!isImageOnly ? 'px-2 pb-1' : ''}`}>
          {msg.editedAt && !isDeleted && <span className="mr-1">(изм.)</span>}
          {new Date(msg.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Иконки действий (появляются при наведении на всю строку) */}
      {isOwnMessage && !isDeleted && isChatActive && (
        <div className="self-center flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button onClick={() => onEdit(msg)} title="Редактировать" className="p-1 text-gray-400 hover:text-gray-700">
            <PencilIcon className="h-4 w-4" />
          </button>
          <button onClick={() => onDelete(msg)} title="Удалить" className="p-1 text-gray-400 hover:text-red-500">
            <TrashIcon className="h-4 w-4" />
          </button>
    </div>
      )}
    </motion.div>
  );
};

const ChatPage = () => {
  const { id: requestId } = useParams();
  const { currentUser } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [requestDetails, setRequestDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [viewerFile, setViewerFile] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [hasSubmittedReview, setHasSubmittedReview] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [ratingContext, setRatingContext] = useState('complete'); // 'complete' или 'reopen'
  const [isArchived, setIsArchived] = useState(false); // Новое состояние для архива
  const [typingUsers, setTypingUsers] = useState({});
  const { checkAndShowModal, ReadOnlyModalComponent } = useReadOnlyCheck();

  // --- Стейты для полных профилей ---
  const [authorProfile, setAuthorProfile] = useState(null);
  const [helperProfile, setHelperProfile] = useState(null);

  // --- Эффект для подгрузки полных профилей ---
  useEffect(() => {
    const fetchFullUserData = async (user, setUserProfile) => {
      if (!user?._id) return;
      try {
        const res = await usersService.getUserById(user._id);
        setUserProfile(res.data);
      } catch (error) {
        console.error(`Failed to fetch full profile for ${user.username}`, error);
        setUserProfile(user); // Фоллбэк на неполные данные
      }
    };

    if (requestDetails?.author) {
      fetchFullUserData(requestDetails.author, setAuthorProfile);
    }
    if (requestDetails?.helper) {
      fetchFullUserData(requestDetails.helper, setHelperProfile);
    }
  }, [requestDetails]);

  // --- Настройка Dropzone (ВОЗВРАЩАЮ НА МЕСТО) ---
  const onDrop = useCallback((acceptedFiles) => {
    // Берем только первый файл
    const file = acceptedFiles[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10 MB лимит
        toast.error('Размер файла не должен превышать 10 МБ');
        return;
      }
      setAttachment(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true, 
    noKeyboard: true,
    disabled: !!editingMessage, // Отключаем, когда редактируем сообщение
  });

  const chatContainerRef = useRef(null);
  const previousScrollHeight = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Получаем первоначальные данные (инфо о запросе и старые сообщения)
  const fetchInitialData = useCallback(async () => {
    if (!requestId) return;
    setLoading(true);
    setError('');
    try {
      // Сначала получаем детали заявки, чтобы понять ее статус
      const detailsRes = await requestsService.getRequestById(requestId);
      setRequestDetails(detailsRes.data);

      // Теперь, в зависимости от статуса, пытаемся получить сообщения
      // Это предотвратит ошибку 403, если мы уже знаем, что чат заархивирован
      if (detailsRes.data.chatIsArchived) {
          setIsArchived(true);
          setLoading(false);
          return;
      }
      
      const messagesRes = await messagesService.getMessages(requestId);
      setMessages(messagesRes.data);

    } catch (err) {
      // Умная обработка ошибок: если 403, то это архив
      if (err.response && err.response.status === 403) {
        setIsArchived(true);
      } else {
        // Все остальные ошибки показываем как обычно
      setError('Произошла ошибка при загрузке чата.');
        console.error("Chat loading error:", err);
      }
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // --- НОВАЯ ЛОГИКА ДЛЯ ИНДИКАТОРА ПЕЧАТИ ---
  useEffect(() => {
    if (!socket || !requestId) return;

    // Слушаем, кто печатает
    const handleTypingBroadcast = ({ userId, username, isTyping, chatId }) => {
      if (chatId !== requestId) return;

      setTypingUsers(prev => {
        const newTypingUsers = { ...prev };
        if (isTyping) {
          // Добавляем или обновляем пользователя с таймером
          if (newTypingUsers[userId]) {
            clearTimeout(newTypingUsers[userId].timeoutId);
          }
          const timeoutId = setTimeout(() => {
            setTypingUsers(current => {
              const updated = { ...current };
              delete updated[userId];
              return updated;
            });
          }, 5000); // Удаляем, если нет активности 5 секунд
          newTypingUsers[userId] = { username, timeoutId };
        } else {
          // Удаляем пользователя, если он перестал печатать
          if (newTypingUsers[userId]) {
            clearTimeout(newTypingUsers[userId].timeoutId);
          }
          delete newTypingUsers[userId];
        }
        return newTypingUsers;
      });
    };
    
    socket.on('user:typing:broadcast', handleTypingBroadcast);

    return () => {
      socket.off('user:typing:broadcast', handleTypingBroadcast);
      // Очищаем все таймеры при размонтировании
      setTypingUsers(prev => {
        Object.values(prev).forEach(user => clearTimeout(user.timeoutId));
        return {};
      });
    };
  }, [socket, requestId]);
  
  // Отправляем событие, когда МЫ печатаем
  const handleTyping = () => {
    if (!socket || !requestId) return;
    
    // Сообщаем, что начали печатать
    socket.emit('user:typing', { chatId: requestId, isTyping: true });

    // Если уже есть таймер, сбрасываем его
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Устанавливаем новый таймер
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('user:typing', { chatId: requestId, isTyping: false });
    }, 3000); // 3 секунды бездействия
  };

  // Скролл чата и страницы вниз после загрузки
  useEffect(() => {
    if (!loading && chatContainerRef.current) {
      // Скроллим сам контейнер чата
      scrollToBottom('auto'); 
      // А также скроллим всю страницу, чтобы чат был в фокусе
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
    // Зависимость от `loading` гарантирует, что это выполнится один раз после загрузки
  }, [loading]);

  // НОВАЯ, НАДЕЖНАЯ ЛОГИКА СКРОЛЛА
  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (!chatContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = chatContainer;
      // Показываем кнопку, если пользователь отскроллил вверх больше чем на 300px
      setShowScrollDown(scrollHeight - scrollTop > clientHeight + 300);
    };

    chatContainer.addEventListener('scroll', handleScroll);
    return () => chatContainer.removeEventListener('scroll', handleScroll);
  }, []);

  // Эффект, который сохраняет позицию скролла при получении новых сообщений
  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (!chatContainer || previousScrollHeight.current === null) {
      previousScrollHeight.current = chatContainer?.scrollHeight;
      return;
    };

    const { scrollTop, scrollHeight, clientHeight } = chatContainer;

    // Проверяем, был ли пользователь внизу ПЕРЕД добавлением новых сообщений
    const wasScrolledToBottom = previousScrollHeight.current - scrollTop <= clientHeight + 10;

    if (wasScrolledToBottom) {
      // Если да - плавно скроллим к новому низу
      chatContainer.scrollTo({ top: scrollHeight, behavior: 'smooth' });
    }

    // Обновляем высоту для следующего рендера
    previousScrollHeight.current = scrollHeight;

  }, [messages]);

  // Настройка Socket.IO
  useEffect(() => {
    if (!socket) return; // Если сокет еще не подключен, выходим

    // Присоединяемся к комнате чата
    socket.emit('join_chat', requestId);

    // ПОМЕТКА СООБЩЕНИЙ КАК ПРОЧИТАННЫХ
    const markMessagesAsRead = async () => {
      try {
        await messagesService.markAsRead(requestId);
      } catch (err) {
        console.error('Ошибка при пометке сообщений как прочитанных:', err);
      }
    };
    markMessagesAsRead();
    
    // Слушаем новые сообщения
    const handleNewMessage = (message) => {
      if (message.requestId === requestId) {
        setMessages((prevMessages) => [...prevMessages, message]);
      }
    };

    // Слушаем ОБНОВЛЕНИЕ сообщения (реакция на редактирование/удаление)
    const handleUpdateMessage = (updatedMessage) => {
      if (updatedMessage.requestId === requestId) {
        setMessages((prevMessages) =>
          prevMessages.map(msg => msg._id === updatedMessage._id ? updatedMessage : msg)
        );
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_updated', handleUpdateMessage);
    
    // Обработка ошибок сокета (можно оставить, если есть специфичные для чата ошибки)
    const handleConnectError = (err) => {
      console.error('Socket connection error:', err.message);
      toast.error('Не удалось подключиться к чату.');
    };
    socket.on('connect_error', handleConnectError);

    // Отключаемся от слушателей при размонтировании компонента или смене сокета/requestId
    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_updated', handleUpdateMessage);
      socket.off('connect_error', handleConnectError);
      // Не нужно вызывать socket.disconnect() здесь, так как он глобальный
    };
  }, [socket, requestId]);
  
  const scrollToBottom = (behavior = 'smooth') => {
    const chatContainer = chatContainerRef.current;
    if (chatContainer) {
      chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: behavior,
      });
    }
  };
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (checkAndShowModal()) return;
    
    if ((!newMessage.trim() && !attachment) || !socket) return;

    // Перед отправкой гасим наш индикатор печати
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socket.emit('user:typing', { chatId: requestId, isTyping: false });

    try {
      if (attachment) {
        await messagesService.sendMessageWithAttachment(
          requestId,
          newMessage,
          attachment
        );
      } else {
      socket.emit('send_message', {
        requestId: requestId,
        content: newMessage,
      });
    }
    
    setNewMessage('');
    setAttachment(null);
    } catch (error) {
      toast.error('Ошибка при отправке сообщения');
      console.error("Failed to send message:", error);
    }

    setTimeout(() => scrollToBottom('auto'), 0);
  };

  const handleStartEdit = (message) => {
    setEditingMessage({ id: message._id, content: message.content });
    setNewMessage(message.content);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setNewMessage('');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingMessage || !newMessage.trim() || !socket) return;

    // Гасим индикатор печати
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socket.emit('user:typing', { chatId: requestId, isTyping: false });

    try {
      await messagesService.editMessage(editingMessage.id, newMessage);
      handleCancelEdit();
    } catch (err) {
      toast.error('Не удалось отредактировать сообщение');
      console.error("Edit failed:", err);
    }
  };

  const handleDeleteMessage = async () => {
    if (!messageToDelete) return;
    try {
      await messagesService.deleteMessage(messageToDelete._id);
      setMessageToDelete(null);
    } catch (err) {
      toast.error('Не удалось удалить сообщение');
      console.error("Delete failed:", err);
    }
  };

  const isParticipant = () => {
    if (!requestDetails || !currentUser) return false;
    
    return (
      requestDetails.author._id === currentUser._id || 
      (requestDetails.helper && requestDetails.helper._id === currentUser._id)
    );
  };
  
  // ЭТА ФУНКЦИЯ ТЕПЕРЬ ПРОСТО УТИЛИТА
  const handleUpdateRequestStatus = async (status) => {
    try {
      const res = await requestsService.updateRequestStatus(requestId, status);
      setRequestDetails(res.data); // Обновляем детали заявки свежими данными с бэка
      toast.success(`Статус заявки обновлен!`);
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Не удалось обновить статус заявки');
      console.error(err);
    }
  };

  const handleOpenResolveModal = () => {
    setIsResolveModalOpen(true);
  };

  // Вызывается при подтверждении, что заявка решена
  const handleConfirmResolved = () => {
    setIsResolveModalOpen(false);
    setRatingContext('complete'); // Устанавливаем контекст
    setIsRatingModalOpen(true);   // Открываем модалку для оценки
  };

  // Вызывается, если заявка НЕ решена
  const handleRejectResolved = () => {
    setIsResolveModalOpen(false);
    setRatingContext('reopen'); // Устанавливаем контекст
    setIsRatingModalOpen(true); // Все равно открываем модалку для оценки
  };

  // Шаг 3: Отправка отзыва и изменение статуса заявки
  const handleCompleteOrReopen = async (rating, comment) => {
    if (hasSubmittedReview) {
      toast.warn('Вы уже отправили отзыв.');
      return;
    }

    try {
      setHasSubmittedReview(true);
      
      const isResolved = ratingContext === 'complete';

      // 1. Отправляем отзыв через сервис, как и должно быть
      await reviewsService.createReview({ 
        requestId, 
        rating, 
        comment,
        isResolved
      });
      toast.success('Спасибо за ваш отзыв!');

      // 2. Меняем статус заявки в зависимости от контекста
      if (ratingContext === 'complete') {
        // Завершаем заявку
        await requestsService.updateRequestStatus(requestId, 'completed');
        toast.success('Заявка успешно завершена!');
        // Обновляем локально статус, чтобы UI стал неактивным
        setRequestDetails(prev => ({...prev, status: 'completed'}));
      } else { // 'reopen'
        const response = await requestsService.reopenRequest(requestId);
        toast.success(response.data.msg || 'Заявка снова в поиске!');
        navigate('/requests'); // Перенаправляем на страницу всех заявок
      }
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Произошла ошибка');
      console.error(err);
      setHasSubmittedReview(false); // Позволяем попробовать еще раз
    }
  };

  const isAuthor = currentUser?._id === requestDetails?.author._id;
  // ИСПРАВЛЕННАЯ ЛОГИКА: Чат активен, если есть хелпер и заявка не закрыта
  const isChatActive = requestDetails?.helper && ['assigned', 'in_progress'].includes(requestDetails?.status);

  const handleMessageChange = (e) => {
    setNewMessage(e.target.value);
    handleTyping();
  };

  // --- КОМПОНЕНТ ДЛЯ ОТОБРАЖЕНИЯ ПЕЧАТАЮЩИХ ---
  const TypingIndicator = () => {
    const users = Object.values(typingUsers).map(u => u.username);
    
    if (users.length === 0) return null;
    
    let text = '';
    if (users.length === 1) {
      text = `${users[0]} печатает...`;
    } else if (users.length > 1) {
      text = `${users.join(', ')} печатают...`;
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="text-sm text-gray-500 italic px-4 pb-2"
      >
        {text}
      </motion.div>
    );
  };

  if (isArchived) {
    return (
      <div className="container mx-auto px-4 py-12 mt-16 text-center">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 p-6 rounded-md shadow-md max-w-2xl mx-auto">
          <ArchiveBoxIcon className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
          <h2 className="text-2xl font-bold mb-2">Этот чат заархивирован</h2>
          <p className="mb-4">
            Вы решили найти другого помощника, поэтому этот диалог был закрыт.
            Ваша заявка снова активна и видна другим специалистам.
          </p>
          <Link
            to="/requests"
            className="inline-block px-6 py-2 bg-yellow-500 text-white font-semibold rounded-md hover:bg-yellow-600 transition-colors"
          >
            К списку заявок
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 mt-16">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12 mt-16">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-6">
          {error}
        </div>
        <div className="text-center mt-4">
          <Link 
            to="/chats"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Вернуться к списку чатов
          </Link>
        </div>
      </div>
    );
  }

  if (!requestDetails) {
    return (
      <div className="container mx-auto px-4 py-12 mt-16">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Запрос не найден</h2>
          <Link 
            to="/chats"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Вернуться к списку чатов
          </Link>
        </div>
      </div>
    );
  }
  
  if (!isParticipant()) {
    return (
      <div className="container mx-auto px-4 py-12 mt-16">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md p-4 mb-6">
          У вас нет доступа к этому чату
        </div>
        <div className="text-center mt-4">
          <Link 
            to="/chats"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Вернуться к списку чатов
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 mt-12 md:mt-16">
      <div className="mb-4">
        <Link to="/chats" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Вернуться к списку чатов
        </Link>
      </div>

      <div {...getRootProps()} className="bg-white rounded-lg shadow-md border border-gray-200 flex flex-col h-[85vh] relative focus:outline-none">
        <AnimatePresence>
          {isDragActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-indigo-500 bg-opacity-90 z-30 flex flex-col items-center justify-center rounded-lg"
            >
              <ArrowDownCircleIcon className="h-24 w-24 text-white animate-bounce" />
              <p className="mt-4 text-2xl font-bold text-white">Перетащите файл сюда</p>
            </motion.div>
          )}
        </AnimatePresence>

        <header className="bg-gray-50 p-4 border-b border-gray-200 rounded-t-lg">
          <div className="flex justify-between items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-800">{requestDetails.title}</h1>
              <p className="text-sm text-gray-500">
                {requestDetails.subject} • {requestDetails.grade} класс
              </p>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
            <Link 
              to={`/request/${requestId}`}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium hidden md:block"
            >
              К деталям запроса
            </Link>
              {isAuthor && isChatActive && (
                <button
                  onClick={handleOpenResolveModal}
                  className="w-full sm:w-auto flex-grow sm:flex-grow-0 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckBadgeIcon className="h-5 w-5" />
                  Завершить и оценить
                </button>
              )}
            </div>
          </div>
          <div className="mt-2 text-sm">
            <div className="flex items-center">
              <span className="font-medium text-gray-500 w-16 flex-shrink-0">Ученик:</span>
              <div className="flex items-center">
                <Link to={`/profile/${requestDetails.author.username}`} className="hover:underline">
                  {requestDetails.author.username}
                </Link>
                <div title={authorProfile?.roles?.admin ? "Администратор" : authorProfile?.roles?.moderator ? "Модератор" : ""}>
                  <RoleBadge user={authorProfile} />
                </div>
              </div>
            </div>
            {requestDetails.helper && (
              <div className="flex items-center mt-1">
                <span className="font-medium text-gray-500 w-16 flex-shrink-0">Хелпер:</span>
                <div className="flex items-center">
                    <Link to={`/profile/${requestDetails.helper.username}`} className="hover:underline">
                      {requestDetails.helper.username}
                    </Link>
                    <div title={helperProfile?.roles?.admin ? "Администратор" : helperProfile?.roles?.moderator ? "Модератор" : ""}>
                      <RoleBadge user={helperProfile} />
                    </div>
                </div>
              </div>
            )}
          </div>
        </header>

        <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-4">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <Message
                key={msg._id}
                msg={msg}
                isOwnMessage={currentUser && msg.sender._id === currentUser._id}
                onImageClick={setViewerFile}
                onEdit={handleStartEdit}
                onDelete={setMessageToDelete}
                isChatActive={isChatActive || requestDetails.status === 'open'}
              />
            ))}
          </AnimatePresence>

          <TypingIndicator />
        </main>

        <AnimatePresence>
          {showScrollDown && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => scrollToBottom()}
              className="absolute bottom-24 right-6 bg-indigo-600 text-white rounded-full p-2 shadow-lg z-20 hover:bg-indigo-700"
            >
              <ArrowDownCircleIcon className="h-7 w-7" />
            </motion.button>
          )}
        </AnimatePresence>

        {viewerFile && <AttachmentModal file={viewerFile} onClose={() => setViewerFile(null)} />}

        <footer className="bg-white border-t border-gray-200 rounded-b-lg">
          {(() => {
            // УДАЛЕНА ЛОГИКА ОЦЕНКИ ИЗ ФУТЕРА
            if (requestDetails.status === 'completed' || requestDetails.status === 'cancelled' || requestDetails.status === 'closed') {
                return (
                  <div className="p-4 text-center text-gray-500">
                    <LockClosedIcon className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                    <p className="font-semibold">Чат закрыт</p>
        </div>
                );
            }
            
            if (isChatActive || requestDetails.status === 'open') {
              return (
                <div className="p-4">
                  <div className="mx-auto max-w-4xl">
                    {attachment && !editingMessage && <AttachmentPreview file={attachment} onRemove={() => setAttachment(null)} />}

                    {editingMessage && (
                      <div className="mb-2 p-2 bg-yellow-100 border-l-4 border-yellow-400 text-yellow-800 rounded-r-lg flex justify-between items-center">
                        <div>
                          <p className="font-bold">Редактирование</p>
                          <p className="text-sm italic truncate">"{editingMessage.content}"</p>
            </div>
                        <button onClick={handleCancelEdit} title="Отменить редактирование">
                          <XCircleIcon className="h-6 w-6 text-yellow-600 hover:text-yellow-800" />
                        </button>
            </div>
          )}

                    <form onSubmit={editingMessage ? handleSaveEdit : handleSendMessage} className="flex items-center gap-3">
                      <input {...getInputProps()} />
                      <button
                        type="button"
                        onClick={open}
                        disabled={!!editingMessage || requestDetails.status === 'open'}
                        className={`cursor-pointer text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed disabled:text-gray-300`}
                      >
                        <PaperClipIcon className="h-6 w-6" />
                      </button>
                      <input
                        type="text"
                        value={newMessage}
                        onChange={handleMessageChange}
                        placeholder={requestDetails.status === 'open' ? "Хелпер еще не назначен..." : "Напишите сообщение..."}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoComplete="off"
                        disabled={requestDetails.status === 'open'}
                      />
                      <button
                        type="submit"
                        disabled={(!newMessage.trim() && !attachment) || requestDetails.status === 'open'}
                        className="bg-indigo-600 text-white rounded-full p-2 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
                      >
                        <ArrowUpCircleIcon className="h-6 w-6" />
                      </button>
                    </form>
                  </div>
                </div>
              );
            }

            return (
              <div className="p-4 text-center text-gray-500">
                <LockClosedIcon className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                <p>Отправка сообщений станет доступна, когда хелпер примет заявку.</p>
              </div>
            );
          })()}
        </footer>
      </div>

      {/* НОВОЕ МОДАЛЬНОЕ ОКНО ДЛЯ ОЦЕНКИ */}
      {isRatingModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
           <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
             <h2 className="text-2xl font-bold mb-4 text-center">Оцените помощь</h2>
             <p className="text-center text-gray-600 mb-6">
                Пожалуйста, оцените работу хелпера <span className="font-bold">{requestDetails?.helper?.username}</span>.
             </p>
            {/* Рендерим компонент оценки прямо здесь */}
            <Rating onSubmit={handleCompleteOrReopen} />
             <button
                onClick={() => setIsRatingModalOpen(false)}
                className="w-full mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
                Отмена
            </button>
          </div>
        </div>
      )}

      {messageToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <h3 className="text-lg font-bold">Удалить сообщение?</h3>
            <p className="my-2 text-gray-600">Это действие нельзя будет отменить.</p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setMessageToDelete(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Отмена
              </button>
              <button
                onClick={handleDeleteMessage}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      <ResolveConfirmationModal
        isOpen={isResolveModalOpen}
        onClose={() => setIsResolveModalOpen(false)}
        onConfirm={handleConfirmResolved}
        onReject={handleRejectResolved}
      />
      <ReadOnlyModalComponent />
    </div>
  );
};

const AttachmentPreview = ({ file, onRemove }) => {
  const [previewUrl, setPreviewUrl] = useState('');
  const isImage = file.type.startsWith('image/');

  useEffect(() => {
    if (isImage) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file, isImage]);

  return (
    <div className="relative mb-2 w-24">
      <div
        className="group relative w-24 h-24 bg-gray-100 rounded-lg p-1"
      >
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs px-3 py-1.5 bg-gray-800 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 whitespace-nowrap">
          <span className="truncate">{file.name}</span>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
        </div>

        {isImage ? (
          <img src={previewUrl} alt="Превью" className="w-full h-full object-cover rounded-md" />
        ) : (
          <div className="w-full h-full bg-gray-200 rounded-md flex items-center justify-center">
            {getFileIcon(file.type)}
          </div>
        )}
        <button
          onClick={onRemove}
          className="absolute -top-2 -right-2 text-gray-500 hover:text-red-500 transition-colors"
          title="Удалить вложение"
        >
          <XCircleIcon className="h-7 w-7 bg-white rounded-full" />
        </button>
      </div>
    </div>
  );
};

export default ChatPage; 