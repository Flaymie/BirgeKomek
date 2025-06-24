import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { requestsService, messagesService, serverURL } from '../../services/api';
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
  TrashIcon
} from '@heroicons/react/24/solid';
import { AnimatePresence, motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { downloadFile } from '../../services/downloadService';
// --- 1. Импорты для галереи и превью-слайдера ---
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
// --- Конец импортов ---

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

// --- 1. Новый компонент превью перед отправкой (замена AttachmentPreview) ---
const FilePreviewItem = ({ file, onRemove }) => {
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
    <div className="relative w-20 h-20 rounded-lg overflow-hidden group">
      {isImage ? (
        <img src={previewUrl} alt="Превью" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gray-200 flex items-center justify-center">{getFileIcon(file.type)}</div>
      )}
      <button
        onClick={onRemove}
        className="absolute top-0 right-0 m-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <XCircleIcon className="h-5 w-5" />
      </button>
    </div>
  );
};

// --- Улучшенная сетка вложений в сообщении ---
const AttachmentsGrid = ({ attachments, onImageClick }) => {
  if (!attachments || attachments.length === 0) return null;

  const images = attachments.filter(a => a.fileType.startsWith('image/'));
  const files = attachments.filter(a => !a.fileType.startsWith('image/'));

  const renderImageGrid = () => {
    // Логика для разной сетки в зависимости от количества
    // ...
    return (
      <div className="grid grid-cols-2 gap-1">
        {images.map((img, index) => (
          <div key={index} className="aspect-square bg-gray-200" onClick={() => onImageClick(images, index)}>
             <img src={`${serverURL}${img.fileUrl}`} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    )
  };

  const renderFile = (file) => (
    <div key={file.fileUrl} className="p-2 bg-gray-200 rounded-lg flex items-center gap-3">
       {/* ... (логика для рендера обычного файла) ... */}
    </div>
  );
  
  return (
    <div className="flex flex-col gap-2">
      {images.length > 0 && renderImageGrid()}
      {files.map(renderFile)}
    </div>
  );
};

// Новый компонент сообщения
const Message = ({ msg, isOwnMessage, onImageClick, onEdit, onDelete }) => {
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
            <AttachmentsGrid attachments={msg.attachments} onImageClick={onImageClick} />
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
      {isOwnMessage && !isDeleted && (
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
  const socket = useSocket();
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [requestDetails, setRequestDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [viewerFile, setViewerFile] = useState(null); // Для модалки просмотра картинок
  const [editingMessage, setEditingMessage] = useState(null); // { id, content }
  const [messageToDelete, setMessageToDelete] = useState(null); // { id }
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSlides, setLightboxSlides] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // --- 3. Обновленная логика Dropzone и отправки ---
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const newAttachments = [...attachments, ...acceptedFiles].slice(0, 10); // Ограничение в 10 файлов
      setAttachments(newAttachments);
    }
  }, [attachments]);

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
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Размер файла не должен превышать 10 МБ');
        return;
      }
      setAttachments([file]);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && attachments.length === 0) || !socket) return;
  
    try {
      if (attachments.length > 0) {
        await messagesService.sendMessageWithAttachment(
          requestId,
          newMessage,
          attachments // Отправляем массив
        );
      } else {
        // Отправка простого текстового сообщения через сокет
        socket.emit('send_message', {
          requestId: requestId,
          content: newMessage,
        });
      }
      setNewMessage('');
      setAttachments([]); // Очищаем массив
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

  const handleOpenLightbox = (images, index) => {
    setLightboxSlides(images.map(img => ({ src: `${serverURL}${img.fileUrl}` })));
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleRemoveAttachment = (indexToRemove) => {
    setAttachments(attachments.filter((_, index) => index !== indexToRemove));
  };

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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-800">{requestDetails.title}</h1>
              <p className="text-sm text-gray-500">
                {requestDetails.subject} • {requestDetails.grade} класс
              </p>
            </div>
            <Link 
              to={`/request/${requestId}`}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium hidden md:block"
            >
              К деталям запроса
            </Link>
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
                onImageClick={handleOpenLightbox}
                onEdit={handleStartEdit}
                onDelete={setMessageToDelete}
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
        
        {/* --- 4. Новый футер с превью-слайдером --- */}
        <footer className="bg-white border-t border-gray-200 p-4 rounded-b-lg">
          <div className="mx-auto max-w-4xl">
            {attachments.length > 0 && (
              <div className="mb-2 p-2 bg-gray-100 rounded-lg">
                <Swiper slidesPerView={'auto'} spaceBetween={10} className="attachment-swiper">
                  {attachments.map((file, index) => (
                    <SwiperSlide key={index} style={{ width: '80px', height: '80px' }}>
                      <FilePreviewItem file={file} onRemove={() => handleRemoveAttachment(index)} />
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            )}
            
            {/* Панель редактирования */}
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
                disabled={!newMessage.trim() && attachments.length === 0}
                className="bg-indigo-600 text-white rounded-full p-2 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowUpCircleIcon className="h-6 w-6" />
              </button>
            </form>
          </div>
        </footer>
      </div>

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

      {/* --- 5. Компонент лайтбокса --- */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={lightboxSlides}
        index={lightboxIndex}
        plugins={[Thumbnails, Zoom]}
      />
    </div>
  );
};

export default ChatPage; 