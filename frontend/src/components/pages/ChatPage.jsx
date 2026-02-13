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
  LockClosedIcon,
  ClockIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/solid';
import { LuArrowDown } from 'react-icons/lu';
import { SafeAnimatePresence, SafeMotionDiv } from '../shared/SafeMotion';
import { useDropzone } from 'react-dropzone';
import AttachmentModal from '../modals/AttachmentModal';
import Rating from './Rating';
import { downloadFile } from '../../services/downloadService';
import ResolveConfirmationModal from '../modals/ResolveConfirmationModal';
import Loader from '../shared/Loader';
import DefaultAvatarIcon from '../shared/DefaultAvatarIcon';
import axios from 'axios';
import { useReadOnlyCheck } from '../../hooks/useReadOnlyCheck';
import RoleBadge from '../shared/RoleBadge';
import StatusBadge from '../shared/StatusBadge';
import { isSameDay, formatDateSeparator } from '../../utils/dateHelpers';
import classNames from 'classnames';


// Создаем инстанс api прямо здесь
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
  const fileUrl = file.fileUrl.startsWith('http') ? file.fileUrl : `${serverURL}${file.fileUrl}`;

  const [isDownloading, setIsDownloading] = useState(false);

  const handleFileDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    await downloadFile(file);
    setIsDownloading(false);
  };

  if (isImage) {
    return (
      <div onClick={(e) => { e.stopPropagation(); onImageClick(file); }} className="cursor-pointer max-w-[280px] rounded-lg overflow-hidden">
        <img
          src={fileUrl}
          alt={file.fileName}
          loading="lazy"
          className="w-full h-auto object-cover"
        />
      </div>
    );
  }

  // Логика для обычных файлов (с индикатором загрузки)
  const attachmentBg = isOwnMessage ? 'bg-indigo-400' : 'bg-gray-300';
  const textColor = isOwnMessage ? 'text-indigo-100' : 'text-gray-600';

  return (
    <div className={`p-2 rounded-lg flex items-center gap-3 max-w-[280px] ${attachmentBg}`}>
      <button
        onClick={(e) => { e.stopPropagation(); handleFileDownload(); }}
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

// Новый компонент для рендера текста сообщения с поддержкой "Читать далее"
const MessageContent = ({ text, isOwnMessage }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Простое определение, нужно ли скрывать часть текста
  // Считаем и по строкам, и по общей длине
  const lineCount = (text.match(/\n/g) || []).length + 1;
  const isLong = lineCount > 7 || text.length > 500;

  if (!isLong || isExpanded) {
    return (
      <div className="whitespace-pre-wrap">
        {text}
        {isLong && (
          <button
            onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
            className={`ml-2 text-sm font-semibold hover:underline ${isOwnMessage ? 'text-indigo-200' : 'text-indigo-600'}`}
          >
            Свернуть
          </button>
        )}
      </div>
    );
  }

  const truncatedText = text.split('\n').slice(0, 7).join('\n');

  return (
    <div>
      <div className="whitespace-pre-wrap">
        {truncatedText + '...'}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
        className={`mt-1 text-sm font-semibold hover:underline ${isOwnMessage ? 'text-indigo-200' : 'text-gray-600'}`}
      >
        Показать полностью
      </button>
    </div>
  );
};

// Новый компонент сообщения
const Message = ({ msg, isOwnMessage, onImageClick, onEdit, onDelete, isChatActive, isSenderOnline, isSelected, onToggleSelect }) => {
  const hasAttachments = msg.attachments && msg.attachments.length > 0;
  const isDeleted = msg.content === 'Сообщение удалено';
  const isImageOnly = hasAttachments && !msg.content && msg.attachments.length === 1 && msg.attachments[0].fileType.startsWith('image/');
  const avatarUrl = formatAvatarUrl(msg.sender);
  const touchStartRef = useRef(null);
  const isDraggingRef = useRef(false);

  return (
    <SafeMotionDiv
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`group flex items-end gap-2 mb-4 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
    >
      <div className="relative flex-shrink-0 self-end">
        <Link to={`/profile/${msg.sender._id}`}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={msg.sender.username} className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <DefaultAvatarIcon className="w-5 h-5 text-gray-500" />
            </div>
          )}
        </Link>
        {isSenderOnline !== undefined && (
          <span
            className={classNames(
              'absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full border-2 border-white',
              isSenderOnline ? 'bg-green-500' : 'bg-gray-400'
            )}
            title={isSenderOnline ? 'Онлайн' : 'Офлайн'}
          />
        )}
      </div>

      {/* Основной пузырь сообщения или просто картинка */}
      <div
        onTouchStart={(e) => {
          touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          isDraggingRef.current = false;
        }}
        onTouchMove={(e) => {
          if (!touchStartRef.current) return;
          const xDiff = Math.abs(e.touches[0].clientX - touchStartRef.current.x);
          const yDiff = Math.abs(e.touches[0].clientY - touchStartRef.current.y);
          if (xDiff > 5 || yDiff > 5) {
            isDraggingRef.current = true;
          }
        }}
        onClick={(e) => {
          if (isDraggingRef.current) return;
          onToggleSelect && onToggleSelect();
        }}
        className={`relative ${isDeleted ? 'italic' : ''} ${!isImageOnly ? `rounded-lg max-w-sm md:max-w-md ${isOwnMessage ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-800'}` : ''}`}
      >

        {hasAttachments && !isDeleted && (
          <div className={!isImageOnly ? (msg.content ? 'pt-1 px-1' : 'p-1') : ''}>
            {msg.attachments.map((file, index) => (
              <Attachment key={index} file={file} isOwnMessage={isOwnMessage} onImageClick={onImageClick} />
            ))}
          </div>
        )}

        {msg.content && (
          <div className={`break-words ${hasAttachments ? 'px-2 pb-1 pt-2' : 'px-3 py-2'}`}>
            <MessageContent text={msg.content} isOwnMessage={isOwnMessage} />
          </div>
        )}

        {/* Timestamp - теперь с разными стилями */}
        <div className={`text-xs mt-1 text-right ${isImageOnly ? 'absolute bottom-1.5 right-1.5 bg-black bg-opacity-50 text-white px-1.5 py-0.5 rounded-lg pointer-events-none' : (isOwnMessage ? 'text-indigo-200' : 'text-gray-500')} ${!isImageOnly ? 'px-2 pb-1' : ''} flex items-center justify-end gap-1`}>
          {msg.status === 'sending' && <ClockIcon className="w-3 h-3" />}
          {msg.status === 'failed' && <ExclamationCircleIcon className="w-3 h-3 text-red-500" />}
          {msg.editedAt && !isDeleted && <span className="mr-1">(изм.)</span>}
          {new Date(msg.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Иконки действий (появляются при наведении на всю строку) */}
      {isOwnMessage && !isDeleted && isChatActive && (
        <div className={`self-center flex items-center transition-opacity duration-200 ${isSelected ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'}`}>
          <button onClick={() => onEdit(msg)} title="Редактировать" className="p-1 text-gray-400 hover:text-gray-700">
            <PencilIcon className="h-4 w-4" />
          </button>
          <button onClick={() => onDelete(msg)} title="Удалить" className="p-1 text-gray-400 hover:text-red-500">
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      )}
    </SafeMotionDiv>
  );
};

const ChatPage = () => {
  const { id: requestId } = useParams();
  const { currentUser } = useAuth();
  const { socket, markAsReadByEntity, joinRoom, leaveRoom, joinChat, leaveChat, isConnected } = useSocket();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [requestDetails, setRequestDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [oldestMessageId, setOldestMessageId] = useState(null);
  const [error, setError] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [viewerFile, setViewerFile] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [hasSubmittedReview, setHasSubmittedReview] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [ratingContext, setRatingContext] = useState('complete');
  const [isArchived, setIsArchived] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [isSending, setIsSending] = useState(false);
  const { checkAndShowModal, ReadOnlyModalComponent } = useReadOnlyCheck();

  const fileInputRef = useRef(null);
  const footerRef = useRef(null);

  const chatContainerRef = useRef(null);
  const previousScrollHeight = useRef(null);
  const typingTimeoutRef = useRef(null);
  const loadMoreObserverRef = useRef(null);
  const firstMessageRef = useRef(null);

  const handleScroll = useCallback(() => {
    const chatContainer = chatContainerRef.current;
    if (!chatContainer) return;
    const nearBottom = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 100;
    setShowScrollDown(!nearBottom);
  }, []);

  const [authorProfile, setAuthorProfile] = useState(null);
  const [helperProfile, setHelperProfile] = useState(null);

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

  const handleFileAdded = useCallback((file) => {
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Размер файла не должен превышать 10 МБ');
        return;
      }
      setAttachment(file);
    }
  }, []);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    handleFileAdded(file);
  }, [handleFileAdded]);

  const dropzoneDisabled = !!editingMessage || (requestDetails && requestDetails.status === 'open');

  const { getRootProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true, // ВАЖНО: Клик по чату НЕ должен открывать диалог
    noKeyboard: true,
    disabled: dropzoneDisabled,
  });

  // Получаем первоначальные данные (инфо о запросе и старые сообщения)
  const fetchInitialData = useCallback(async () => {
    if (!requestId) {
      return;
    };
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
      // Новый формат ответа с пагинацией
      if (messagesRes.data.messages) {
        setMessages(messagesRes.data.messages);
        setHasMore(messagesRes.data.hasMore);
        setOldestMessageId(messagesRes.data.oldestMessageId);
      } else {
        // Обратная совместимость со старым форматом
        setMessages(messagesRes.data);
      }

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

  // Функция для подгрузки старых сообщений
  const loadMoreMessages = useCallback(async () => {
    if (loadingMore || !hasMore || !oldestMessageId) return;

    setLoadingMore(true);
    try {
      const messagesRes = await messagesService.getMessages(requestId, { before: oldestMessageId });

      if (messagesRes.data.messages) {
        setMessages(prev => [...messagesRes.data.messages, ...prev]);
        setHasMore(messagesRes.data.hasMore);
        setOldestMessageId(messagesRes.data.oldestMessageId);
      }
    } catch (err) {
      console.error('Ошибка загрузки старых сообщений:', err);
      toast.error('Не удалось загрузить старые сообщения');
    } finally {
      setLoadingMore(false);
    }
  }, [requestId, loadingMore, hasMore, oldestMessageId]);

  // IntersectionObserver для автоматической подгрузки при скролле вверх
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMoreMessages();
        }
      },
      { threshold: 0.1 }
    );

    if (firstMessageRef.current) {
      observer.observe(firstMessageRef.current);
    }

    loadMoreObserverRef.current = observer;

    return () => {
      if (loadMoreObserverRef.current) {
        loadMoreObserverRef.current.disconnect();
      }
    };
  }, [hasMore, loadingMore, loadMoreMessages]);

  const handleNewMessage = useCallback((message) => {
    if (message.requestId === requestId) {
      setMessages((prevMessages) => {
        // Optimistic UI reconciliation
        const isMyMessage = message.sender._id === currentUser?._id;
        if (isMyMessage) {
          // Find pending message with same content
          const pendingIndex = prevMessages.findIndex(m => m.status === 'sending' && m.content === message.content);
          if (pendingIndex !== -1) {
            const newMsgs = [...prevMessages];
            newMsgs[pendingIndex] = message; // Replace pending with real
            return newMsgs;
          }
        }
        // Check for duplicates just in case
        if (prevMessages.some(m => m._id === message._id)) return prevMessages;

        return [...prevMessages, message];
      });
    }
  }, [requestId, currentUser]);

  const handleUpdateMessage = useCallback((updatedMessage) => {
    if (updatedMessage.requestId === requestId) {
      setMessages((prevMessages) =>
        prevMessages.map(msg => msg._id === updatedMessage._id ? updatedMessage : msg)
      );
    }
  }, [requestId]);

  const handleTypingBroadcast = useCallback(({ userId, username, isTyping, chatId }) => {
    if (chatId !== requestId || userId === currentUser?._id) return;
    setTypingUsers(prev => {
      const newTypingUsers = { ...prev };
      if (isTyping) {
        newTypingUsers[username] = true;
      } else {
        delete newTypingUsers[username];
      }
      return newTypingUsers;
    });
  }, [requestId, currentUser]);

  useEffect(() => {
    if (requestId) {
      if (isConnected) {
        joinRoom(requestId); // For status updates
        joinChat(requestId); // For chat messages
        markAsReadByEntity(requestId); // Автоматически читаем уведомления
      }
    }

    return () => {
      leaveRoom();
      leaveChat();
    };
  }, [requestId, isConnected, joinRoom, leaveRoom, joinChat, leaveChat, markAsReadByEntity]);

  const handleConnectError = useCallback((err) => {
    console.error('Socket connection error:', err.message);
    toast.error('Не удалось подключиться к чату.');
  }, []);

  useEffect(() => {
    if (!socket || !requestId) return;

    // join_chat отправляется через joinChat в другом эффекте, 
    // но если мы хотим быть уверены, что слушатели навешиваются всегда:
    // joinChat(requestId); // Убрали отсюда, чтобы не дублировать


    const markMessagesAsRead = async () => {
      try {
        await messagesService.markAsRead(requestId);
      } catch (err) {
        console.error('Ошибка при пометке сообщений как прочитанных:', err);
      }
    };
    markMessagesAsRead();

    // Обработчик обновления статуса заявки
    const handleRequestUpdate = (updatedRequest) => {
      if (updatedRequest._id === requestId) {
        setRequestDetails(updatedRequest);
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_updated', handleUpdateMessage);
    socket.on('typing_started', handleTypingBroadcast);
    socket.on('typing_stopped', handleTypingBroadcast);
    socket.on('connect_error', handleConnectError);
    socket.on('request_updated', handleRequestUpdate);

    return () => {
      // leave_chat вызывается в другом эффекте


      socket.off('new_message', handleNewMessage);
      socket.off('message_updated', handleUpdateMessage);
      socket.off('typing_started', handleTypingBroadcast);
      socket.off('typing_stopped', handleTypingBroadcast);
      socket.off('connect_error', handleConnectError);
      socket.off('request_updated', handleRequestUpdate);
    };
  }, [socket, requestId, currentUser, handleNewMessage, handleUpdateMessage, handleTypingBroadcast, handleConnectError]);

  useEffect(() => {
    if (!loading) {
      setTimeout(() => {
        scrollToBottom('auto');
        footerRef.current?.scrollIntoView({ behavior: "auto" });
      }, 0);
    }
  }, [loading, messages]);

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
    // Проверяем наличие `e`, так как функция может быть вызвана без него
    if (e) e.preventDefault();

    if (checkAndShowModal()) return;

    if ((!newMessage.trim() && !attachment) || !socket || isSending) return;

    // Перед отправкой гасим наш индикатор печати
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    socket.emit('typing_stopped', { chatId: requestId, userId: currentUser._id, username: currentUser.username });

    const tempId = Date.now().toString();
    // Optimistic Message
    if (!attachment) {
      const tempMessage = {
        _id: tempId,
        content: newMessage,
        sender: currentUser,
        createdAt: new Date().toISOString(),
        requestId: requestId,
        status: 'sending'
      };
      setMessages(prev => [...prev, tempMessage]);
      setNewMessage('');
      setTimeout(() => scrollToBottom('auto'), 0);
    }

    try {
      if (attachment) {
        setIsSending(true);
        await messagesService.sendMessageWithAttachment(
          requestId,
          newMessage,
          attachment
        );
        setIsSending(false);
        setNewMessage('');
        setAttachment(null);
      } else {
        socket.emit('send_message', {
          requestId: requestId,
          content: newMessage, // Используем значение из замыкания, т.к. стейт уже очистили (но здесь он еще старый? Нет, здесь мы используем переменную из closure если бы она была const, но newMessage - это стейт. 
          // Стоп. Если мы сделали setNewMessage(''), то newMessage в следующем рендере будет пуст.
          // Но в этом запуске функции newMessage все еще содержит текст.
        });
      }
    } catch (error) {
      setIsSending(false);
      toast.error('Ошибка при отправке сообщения');
      console.error("Failed to send message:", error);
      if (!attachment) {
        setMessages(prev => prev.map(m => m._id === tempId ? { ...m, status: 'failed' } : m));
      }
    }

    if (attachment) {
      setTimeout(() => scrollToBottom('auto'), 0);
    }
  };

  const handleStartEdit = (message) => {
    setEditingMessage({ id: message._id, content: message.content });
    setNewMessage(message.content);
    setSelectedMessageId(null); // Скрываем меню действий
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
      typingTimeoutRef.current = null;
    }
    // ИСПРАВЛЕННОЕ СОБЫТИЕ
    socket.emit('typing_stopped', { chatId: requestId, userId: currentUser._id, username: currentUser.username });

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

  // Отправка отзыва и изменение статуса заявки
  const handleCompleteOrReopen = async (rating, comment) => {
    if (hasSubmittedReview) {
      toast.warn('Вы уже отправили отзыв.');
      return;
    }

    try {
      setHasSubmittedReview(true);

      const isResolved = ratingContext === 'complete';

      await reviewsService.createReview({
        requestId,
        rating,
        comment,
        isResolved
      });
      toast.success('Спасибо за ваш отзыв!');

      if (ratingContext === 'complete') {
        await requestsService.updateRequestStatus(requestId, 'completed');
        toast.success('Заявка успешно завершена!');
        setRequestDetails(prev => ({ ...prev, status: 'completed' }));
        window.location.reload();
      } else {
        const response = await requestsService.reopenRequest(requestId);
        toast.success(response.data.msg || 'Заявка снова в поиске!');
        navigate('/requests');
      }
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Произошла ошибка');
      console.error(err);
      setHasSubmittedReview(false);
    }
  };

  const isAuthor = currentUser?._id === requestDetails?.author._id;
  // ИСПРАВЛЕННАЯ ЛОГИКА: Чат активен, если есть хелпер и заявка не закрыта
  const isChatActive = requestDetails?.helper && ['assigned', 'in_progress'].includes(requestDetails?.status);

  const textareaRef = useRef(null);

  // Эффект для авто-ресайза textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto'; // Сначала сбрасываем
      const scrollHeight = textarea.scrollHeight;
      // Устанавливаем максимальную высоту, например, 200px
      const maxHeight = 200;
      textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
      // Если контент больше, показываем скролл
      textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
    }
  }, [newMessage]);

  const handleMessageChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);

    if (!socket) return;

    if (value) {
      // Отправляем 'typing_started' только если еще не отправляли (нет активного таймаута)
      if (!typingTimeoutRef.current) {
        socket.emit('typing_started', { chatId: requestId, userId: currentUser._id, username: currentUser.username });
      }

      // Сбрасываем предыдущий таймаут, чтобы начать отсчет заново
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Устанавливаем новый таймаут для 'typing_stopped'
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing_stopped', { chatId: requestId, userId: currentUser._id, username: currentUser.username });
        typingTimeoutRef.current = null;
      }, 2000);
    } else {
      // Если поле очистили, немедленно отправляем 'stopped' и сбрасываем таймаут
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      socket.emit('typing_stopped', { chatId: requestId, userId: currentUser._id, username: currentUser.username });
    }
  };

  const handleKeyDown = (e) => {
    // Для Shift+Enter просто ничего не делаем, позволяя создать новую строку
    if (e.key === 'Enter' && e.shiftKey) {
      return;
    }

    // Для обычного Enter - отправляем
    if (e.key === 'Enter') {
      e.preventDefault(); // Предотвращаем создание новой строки в любом случае
      if (editingMessage) {
        handleSaveEdit(e); // ПРОКИДЫВАЕМ СОБЫТИЕ
      } else {
        handleSendMessage(e); // ПРОКИДЫВАЕМ СОБЫТИЕ
      }
    }
  };

  const TypingIndicator = () => {
    const users = Object.keys(typingUsers);

    if (users.length === 0) return null;

    let text = '';
    if (users.length === 1) {
      text = `${users[0]} печатает...`;
    } else if (users.length > 1) {
      text = `${users.join(', ')} печатают...`;
    }

    return (
      <SafeMotionDiv
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="text-sm text-gray-500 italic px-4 pb-2"
      >
        {text}
      </SafeMotionDiv>
    );
  };

  if (isArchived) {
    const isAuthorViewing = currentUser?._id === requestDetails?.author?._id;

    return (
      <div className="container mx-auto px-4 py-12 mt-16 text-center">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 p-6 rounded-md shadow-md max-w-2xl mx-auto">
          <ArchiveBoxIcon className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
          <h2 className="text-2xl font-bold mb-2">Этот чат заархивирован</h2>
          <p className="mb-4">
            {isAuthorViewing ? (
              <>
                Вы решили найти другого помощника, поэтому этот диалог был закрыт.
                Ваша заявка снова активна и видна другим специалистам.
              </>
            ) : (
              <>
                Автор заявки решил найти другого помощника, поэтому этот диалог был закрыт.
                Заявка снова активна и видна другим специалистам.
              </>
            )}
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
    <div className="flex flex-col flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6">
      <div className="mb-4 flex-shrink-0">
        <Link to="/chats" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Вернуться к списку чатов
        </Link>
      </div>

      <div {...getRootProps()} className="bg-white rounded-lg shadow-md border border-gray-200 flex flex-col h-[85vh] relative focus:outline-none">
        <SafeAnimatePresence>
          {isDragActive && (
            <SafeMotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-indigo-500 bg-opacity-90 z-30 flex flex-col items-center justify-center rounded-lg"
            >
              <ArrowDownCircleIcon className="h-24 w-24 text-white animate-bounce" />
              <p className="mt-4 text-2xl font-bold text-white">Перетащите файл сюда</p>
            </SafeMotionDiv>
          )}
        </SafeAnimatePresence>

        <header className="bg-gray-50 p-4 border-b border-gray-200 rounded-t-lg flex-shrink-0">
          <div className="flex flex-col items-start gap-y-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-800">{requestDetails.title}</h1>
              <div className="flex items-center gap-3 mt-1">
                <StatusBadge status={requestDetails.status} />
                <p className="text-sm text-gray-500">
                  {requestDetails.subject} • {requestDetails.grade} класс
                </p>
              </div>
            </div>
            <div className="flex w-full flex-col items-end gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
              <Link
                to={`/request/${requestId}`}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium whitespace-nowrap"
              >
                К деталям запроса
              </Link>
              {isAuthor && isChatActive && (
                <button
                  onClick={handleOpenResolveModal}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
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
                <RoleBadge user={authorProfile} />
              </div>
            </div>
            {requestDetails.helper && (
              <div className="flex items-center mt-1">
                <span className="font-medium text-gray-500 w-16 flex-shrink-0">Хелпер:</span>
                <div className="flex items-center">
                  <Link to={`/profile/${requestDetails.helper.username}`} className="hover:underline">
                    {requestDetails.helper.username}
                  </Link>
                  <RoleBadge user={helperProfile} />
                </div>
              </div>
            )}
          </div>
        </header>

        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4"
          onScroll={handleScroll}
        >
          {loadingMore && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          )}
          <SafeAnimatePresence initial={false}>
            {messages.map((msg, index) => {
              const prevMsg = messages[index - 1];
              const showDateSeparator = index === 0 || !isSameDay(msg.createdAt, prevMsg.createdAt);

              let isSenderOnline;
              if (authorProfile && msg.sender._id === authorProfile._id) {
                isSenderOnline = authorProfile.isOnline;
              } else if (helperProfile && msg.sender._id === helperProfile._id) {
                isSenderOnline = helperProfile.isOnline;
              }

              return (
                <React.Fragment key={msg._id}>
                  {showDateSeparator && (
                    <div className="relative my-5">
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-gray-200" />
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-gray-50 px-3 text-sm font-medium text-gray-500">
                          {formatDateSeparator(msg.createdAt)}
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={index === 0 ? firstMessageRef : null}>
                    <Message
                      msg={msg}
                      isOwnMessage={currentUser && msg.sender._id === currentUser._id}
                      onImageClick={setViewerFile}
                      onEdit={handleStartEdit}
                      onDelete={setMessageToDelete}
                      isChatActive={isChatActive || requestDetails.status === 'open'}
                      isSenderOnline={isSenderOnline}
                      isSelected={selectedMessageId === msg._id}
                      onToggleSelect={() => setSelectedMessageId(prev => prev === msg._id ? null : msg._id)}
                    />
                  </div>
                </React.Fragment>
              );
            })}
          </SafeAnimatePresence>

          <TypingIndicator />
        </div>

        {viewerFile && <AttachmentModal file={viewerFile} onClose={() => setViewerFile(null)} />}

        <footer ref={footerRef} className="relative bg-white border-t border-gray-200 rounded-b-lg">
          <SafeAnimatePresence>
            {showScrollDown && (
              <SafeMotionDiv
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10"
              >
                <button
                  onClick={() => scrollToBottom()}
                  className="bg-black/60 backdrop-blur-sm text-white rounded-full p-2 shadow-lg hover:bg-black/80 transition-all"
                  title="Прокрутить вниз"
                >
                  <LuArrowDown className="h-6 w-6" />
                </button>
              </SafeMotionDiv>
            )}
          </SafeAnimatePresence>
          {(() => {
            if (requestDetails.status === 'completed' || requestDetails.status === 'cancelled' || requestDetails.status === 'closed' || requestDetails.chatIsArchived) {
              return (
                <div className="p-4 text-center text-gray-500">
                  <LockClosedIcon className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                  <p className="font-semibold">Чат закрыт</p>
                </div>
              );
            }

            const handleAttachmentButtonClick = () => {
              if (!dropzoneDisabled) {
                fileInputRef.current?.click();
              } else {

              }
            };

            const handleFileSelect = (e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleFileAdded(file);
              }
              // Сбрасываем значение, чтобы можно было выбрать тот же файл снова
              if (e.target) e.target.value = null;
            };

            if ((isChatActive || requestDetails.status === 'open') && !requestDetails.chatIsArchived) {
              return (
                <div className="p-4">
                  <div className="mx-auto max-w-4xl">
                    {attachment && !editingMessage && <AttachmentPreview file={attachment} onRemove={() => setAttachment(null)} />}

                    {editingMessage && (
                      <div className="mb-2 p-2 bg-yellow-100 border-l-4 border-yellow-400 text-yellow-800 rounded-r-lg flex justify-between items-center">
                        <div>
                          <p className="font-bold text-xs uppercase text-yellow-800 mb-0.5">Редактирование</p>
                          <div className="text-sm italic text-yellow-900 overflow-hidden whitespace-nowrap" style={{ maxWidth: '150px' }}>
                            "{editingMessage.content.length > 20 ? editingMessage.content.substring(0, 20) + '...' : editingMessage.content}"
                          </div>
                        </div>
                        <button onClick={handleCancelEdit} title="Отменить редактирование">
                          <XCircleIcon className="h-6 w-6 text-yellow-600 hover:text-yellow-800" />
                        </button>
                      </div>
                    )}

                    <form onSubmit={editingMessage ? handleSaveEdit : handleSendMessage} className="flex items-end gap-3">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                        accept="image/*,application/pdf,.zip,.rar,.7z,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      />
                      <button
                        type="button"
                        onClick={handleAttachmentButtonClick}
                        disabled={dropzoneDisabled || isSending}
                        className={`p-2 cursor-pointer text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed disabled:text-gray-300 self-end mb-1`}
                      >
                        <PaperClipIcon className="h-6 w-6" />
                      </button>
                      <textarea
                        ref={textareaRef}
                        rows={1}
                        value={newMessage}
                        onChange={handleMessageChange}
                        onKeyDown={handleKeyDown}
                        placeholder={isSending ? "Отправка..." : (requestDetails.status === 'open' ? "Хелпер еще не назначен..." : "Напишите сообщение...")}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        autoComplete="off"
                        disabled={requestDetails.status === 'open' || isSending}
                      />
                      <button
                        type="submit"
                        disabled={isSending || (editingMessage ? !newMessage.trim() : ((!newMessage.trim() && !attachment) || dropzoneDisabled))}
                        className="bg-indigo-600 text-white rounded-full p-2 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors self-end relative"
                      >
                        {isSending ? (
                          <Loader size="h-6 w-6" color="text-white" />
                        ) : (
                          editingMessage ? <CheckBadgeIcon className="h-6 w-6" /> : <ArrowUpCircleIcon className="h-6 w-6" />
                        )}
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

      {isRatingModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-center">Оцените помощь</h2>
            <p className="text-center text-gray-600 mb-6">
              Пожалуйста, оцените работу хелпера <span className="font-bold">{requestDetails?.helper?.username}</span>.
            </p>
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