import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { requestsService, messagesService, reviewsService, serverURL } from '../../services/api';
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
import CloseRequestModal from '../modals/CloseRequestModal';
import Rating from './Rating';
import { downloadFile } from '../../services/downloadService';

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
          <ArrowDownCircleIcon className="h-6 w-6"/>
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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`group flex items-end gap-2 mb-4 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
    >
      <Link to={`/profile/${msg.sender._id}`} className="flex-shrink-0 self-end">
        <img src={formatAvatarUrl(msg.sender)} alt={msg.sender.username} className="w-8 h-8 rounded-full" />
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
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [hasSubmittedReview, setHasSubmittedReview] = useState(false);

  // --- 2. Настройка Dropzone ---
  const onDrop = useCallback((acceptedFiles) => {
    // Берем только первый файл, т.к. логика под один аттач
    const file = acceptedFiles[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Размер файла не должен превышать 10 МБ');
        return;
      }
      setAttachment(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true, // Отключаем открытие диалога по клику на dropzone
    noKeyboard: true,
    disabled: !!editingMessage, // Отключаем, когда редактируем сообщение
  });

  const chatContainerRef = useRef(null);
  const previousScrollHeight = useRef(null);

  // Получаем первоначальные данные (инфо о запросе и старые сообщения)
  const fetchInitialData = useCallback(async () => {
    if (!requestId) return;
    setLoading(true);
    setError('');
    try {
      const [detailsRes, messagesRes] = await Promise.all([
        requestsService.getRequestById(requestId),
        messagesService.getMessages(requestId)
      ]);
      setRequestDetails(detailsRes.data);
      setMessages(messagesRes.data);
      // После первой загрузки сразу скроллим в самый низ
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 0);
    } catch (err) {
      setError('Произошла ошибка при загрузке чата.');
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Скролл всей страницы вниз после загрузки
  useEffect(() => {
    if (!loading) {
      // Плавный скролл всей страницы вниз после загрузки данных
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
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
  
  // Обработчик выбора файла (оставляем для кнопки-скрепки)
  /* // Эта функция пока не используется, но может понадобиться, если вернется кнопка-скрепка для мобильных
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Размер файла не должен превышать 10 МБ');
        return;
      }
      setAttachment(file);
    }
  };
  */
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !attachment) || !socket) return;
  
    try {
      if (attachment) {
        // const formData = new FormData();
        // formData.append('requestId', requestId);
        // formData.append('content', newMessage);
        // formData.append('attachment', attachment);
        
        // Вместо отправки через сокет, отправляем через API
        /* const res = */ await messagesService.sendMessageWithAttachment(
          requestId,
          newMessage,
          attachment
        );
  
        // После успешной отправки через API, можно опционально
        // эмитить событие через сокет, чтобы другие клиенты обновились,
        // если бэкенд не делает этого сам.
        // Но обычно бэкенд после сохранения сам рассылает сообщение всем в комнату.

      } else {
        // Отправка простого текстового сообщения через сокет
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
    
    // Принудительно и мгновенно скроллим вниз после СВОЕЙ отправки
    setTimeout(() => scrollToBottom('auto'), 0);
  };
  
  // --- Новые хендлеры для редактирования/удаления ---

  const handleStartEdit = (message) => {
    setEditingMessage({ id: message._id, content: message.content });
    setNewMessage(message.content); // Заполняем поле ввода для редактирования
  };
  
  const handleCancelEdit = () => {
    setEditingMessage(null);
    setNewMessage(''); // Очищаем поле ввода
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingMessage || !newMessage.trim()) return;
    try {
      await messagesService.editMessage(editingMessage.id, newMessage);
      // Обновление в UI придет через сокет
      handleCancelEdit(); // Сбрасываем режим редактирования
    } catch (err) {
      toast.error('Не удалось отредактировать сообщение');
      console.error("Edit failed:", err);
    }
  };
  
  const handleDeleteMessage = async () => {
    if (!messageToDelete) return;
    try {
      await messagesService.deleteMessage(messageToDelete._id);
       // Обновление в UI придет через сокет
      setMessageToDelete(null);
    } catch (err) {
       toast.error('Не удалось удалить сообщение');
       console.error("Delete failed:", err);
    }
  };
  
  // Проверяем, является ли пользователь участником чата
  const isParticipant = () => {
    if (!requestDetails || !currentUser) return false;
    
    return (
      requestDetails.author._id === currentUser._id || 
      (requestDetails.helper && requestDetails.helper._id === currentUser._id)
    );
  };

  // --- Новые хендлеры для закрытия и оценки ---

  const handleUpdateRequestStatus = async (status) => {
    try {
      const res = await requestsService.updateRequestStatus(requestId, status);
      setRequestDetails(res.data); // Обновляем детали заявки свежими данными с бэка
      toast.success(`Статус заявки обновлен!`);
      setIsCloseModalOpen(false);

      if (status === 'open') {
        // Если "не решено", перекидываем автора на страницу его запросов
        toast.info('Помощник откреплен. Вы можете выбрать другого откликнувшегося.');
        navigate('/requests');
      }

    } catch (err) {
      toast.error(err.response?.data?.msg || 'Не удалось обновить статус заявки');
      console.error(err);
    }
  };

  const handleRatingSubmit = async (rating, comment) => {
    try {
      await reviewsService.createReview(requestId, rating, comment);
      toast.success('Спасибо за ваш отзыв!');
      setHasSubmittedReview(true); // Прячем форму после успешной отправки
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Не удалось отправить отзыв');
      console.error(err);
      // Не выключаем isSubmitting в компоненте Rating, чтобы юзер не мог спамить
    }
  };

  // Проверяем, является ли пользователь автором
  const isAuthor = currentUser?._id === requestDetails?.author._id;
  // Проверяем, активен ли чат
  const isChatActive = requestDetails?.status === 'in_progress';

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
  
  // Если пользователь не является участником чата
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
        {/* --- 3. Оверлей для Drag-n-Drop --- */}
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

        {/* Шапка чата */}
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
              {/* --- Новая кнопка завершения --- */}
              {isAuthor && isChatActive && (
                <button
                  onClick={() => setIsCloseModalOpen(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm font-semibold rounded-md hover:bg-green-700 transition-colors"
                >
                  <CheckBadgeIcon className="h-5 w-5" />
                  <span>Завершить</span>
                </button>
              )}
            </div>
          </div>
          <div className="mt-2 text-sm">
            <div className="flex items-center">
              <span className="font-medium text-gray-500 w-16 flex-shrink-0">Ученик:</span>
              <span className="font-semibold text-gray-800 truncate">{requestDetails.author.username}</span>
            </div>
            {requestDetails.helper && (
              <div className="flex items-center mt-1">
                <span className="font-medium text-gray-500 w-16 flex-shrink-0">Хелпер:</span>
                <span className="font-semibold text-gray-800 truncate">{requestDetails.helper.username}</span>
              </div>
            )}
          </div>
        </header>
        
        {/* Основная область чата */}
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
                isChatActive={isChatActive}
              />
            ))}
          </AnimatePresence>
        </main>

        {/* Кнопка "Вниз" */}
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

        {/* --- Полностью переработанный футер чата --- */}
        <footer className="bg-white border-t border-gray-200 rounded-b-lg">
          {(() => {
            // 1. Заявка выполнена, автор должен поставить оценку
            if (isAuthor && requestDetails.status === 'completed' && !hasSubmittedReview) {
              return <Rating onSubmit={handleRatingSubmit} />;
            }

            // 2. Заявка выполнена и оценена, или просто выполнена (для хелпера)
            if (requestDetails.status === 'completed') {
              return (
                <div className="p-4 text-center text-gray-500">
                  <LockClosedIcon className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                  <p className="font-semibold">Чат завершен</p>
                  <p className="text-sm">Спасибо за участие!</p>
                </div>
              );
            }

            // 3. Заявка отменена
            if (['cancelled', 'closed'].includes(requestDetails.status)) {
              return (
                 <div className="p-4 text-center text-gray-500">
                  <LockClosedIcon className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                  <p className="font-semibold">Чат закрыт</p>
                </div>
              );
            }

            // 4. Чат активен (статус 'in_progress'), показываем форму ввода
            if (isChatActive) {
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
                            <XCircleIcon className="h-6 w-6 text-yellow-600 hover:text-yellow-800"/>
                          </button>
                        </div>
                      )}

                    <form onSubmit={editingMessage ? handleSaveEdit : handleSendMessage} className="flex items-center gap-3">
                      <input {...getInputProps()} />
              <button
                type="button"
                        onClick={open} 
                        disabled={!!editingMessage}
                        className={`cursor-pointer text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed disabled:text-gray-300`}
                      >
                        <PaperClipIcon className="h-6 w-6" />
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Напишите сообщение..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoComplete="off"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() && !attachment}
                        className="bg-indigo-600 text-white rounded-full p-2 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
                      >
                        <ArrowUpCircleIcon className="h-6 w-6" />
                      </button>
                    </form>
                  </div>
                </div>
              );
            }
            
            // 5. По умолчанию (статус 'open', нет хелпера) показываем заглушку
            return (
              <div className="p-4 text-center text-gray-500">
                <LockClosedIcon className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                <p>Отправка сообщений станет доступна, когда хелпер примет заявку.</p>
              </div>
            );
          })()}
        </footer>
      </div>
      
      {/* --- Модальное окно завершения --- */}
      <CloseRequestModal 
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        onConfirm={() => handleUpdateRequestStatus('completed')}
        onReject={() => handleUpdateRequestStatus('open')}
      />

      {/* Модальное окно подтверждения удаления */}
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
    </div>
  );
};

// Новый компонент для превью вложения перед отправкой
const AttachmentPreview = ({ file, onRemove }) => {
  const [previewUrl, setPreviewUrl] = useState('');
  const isImage = file.type.startsWith('image/');

  useEffect(() => {
    if (isImage) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      // Освобождаем память при размонтировании
      return () => URL.revokeObjectURL(url);
    }
  }, [file, isImage]);

  return (
    <div className="relative mb-2 w-24"> {/* Обертка для позиционирования подсказки */}
      <div 
        className="group relative w-24 h-24 bg-gray-100 rounded-lg p-1"
      >
        {/* Кастомная подсказка */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs px-3 py-1.5 bg-gray-800 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 whitespace-nowrap">
          <span className="truncate">{file.name}</span>
          {/* Маленький треугольник снизу */}
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