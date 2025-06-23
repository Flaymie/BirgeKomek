import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { requestsService, messagesService } from '../../services/api';
import { formatAvatarUrl } from '../../services/avatarUtils';
import { toast } from 'react-toastify';
import { PaperClipIcon, ArrowLeftIcon, ArrowUpCircleIcon, ArrowDownCircleIcon } from '@heroicons/react/24/solid';
import { AnimatePresence, motion } from 'framer-motion';

// Новый, улучшенный компонент сообщения с аватаркой
const Message = ({ msg, isOwnMessage }) => {
  // Проверяем, является ли вложение картинкой
  const isImage = (attachmentUrl) => {
    return attachmentUrl && /\.(jpeg|jpg|gif|png)$/i.test(attachmentUrl);
  };

  // Защита от редких случаев, когда сообщение есть, а отправителя нет (например, при ошибке populate)
  if (!msg.sender) {
    return (
      <div className="text-center text-gray-400 text-sm my-2">Сообщение загружается...</div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`flex items-end gap-3 mb-4 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
    >
      <Link to={`/profile/${msg.sender._id}`} className="flex-shrink-0">
        <img
          src={formatAvatarUrl(msg.sender)}
          alt={msg.sender.username}
          className="w-8 h-8 rounded-full"
        />
      </Link>

      <div className={`rounded-lg px-4 py-2 max-w-sm md:max-w-md ${isOwnMessage ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
        {msg.attachment && (
          <div className="mb-2">
            {isImage(msg.attachment) ? (
              <img src={formatAvatarUrl(msg.attachment)} alt="Вложение" className="rounded-lg max-w-full h-auto" />
            ) : (
              <a href={formatAvatarUrl(msg.attachment)} target="_blank" rel="noopener noreferrer" className="flex items-center p-2 bg-gray-500 bg-opacity-30 rounded-lg hover:bg-opacity-50">
                <PaperClipIcon className="h-5 w-5 mr-2" />
                <span>{msg.attachment.split('/').pop()}</span>
              </a>
            )}
          </div>
        )}
        <p className="break-words">{msg.content}</p>
        <div className={`text-xs mt-1 ${isOwnMessage ? 'text-indigo-200' : 'text-gray-500'}`}>
          {new Date(msg.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
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
  const [attachment, setAttachment] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState('');
  const [showScrollDown, setShowScrollDown] = useState(false);

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

    socket.on('new_message', handleNewMessage);
    
    // Обработка ошибок сокета (можно оставить, если есть специфичные для чата ошибки)
    const handleConnectError = (err) => {
      console.error('Socket connection error:', err.message);
      toast.error('Не удалось подключиться к чату.');
    };
    socket.on('connect_error', handleConnectError);

    // Отключаемся от слушателей при размонтировании компонента или смене сокета/requestId
    return () => {
      socket.off('new_message', handleNewMessage);
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
  
  // Обработчик выбора файла
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Размер файла не должен превышать 10 МБ');
        return;
      }
      setAttachment(file);
      // Создаем превью для картинки
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setAttachmentPreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setAttachmentPreview(''); // Сбрасываем превью, если файл не картинка
      }
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !attachment) || !socket) return;
  
    try {
      if (attachment) {
        const formData = new FormData();
        formData.append('requestId', requestId);
        formData.append('content', newMessage);
        formData.append('attachment', attachment);
        
        // Вместо отправки через сокет, отправляем через API
        const res = await messagesService.sendMessageWithAttachment(
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
      setAttachmentPreview('');
    } catch (error) {
      toast.error('Ошибка при отправке сообщения');
      console.error("Failed to send message:", error);
    }
    
    // Принудительно и мгновенно скроллим вниз после СВОЕЙ отправки
    setTimeout(() => scrollToBottom('auto'), 0);
  };
  
  // Проверяем, является ли пользователь участником чата
  const isParticipant = () => {
    if (!requestDetails || !currentUser) return false;
    
    return (
      requestDetails.author._id === currentUser._id || 
      (requestDetails.helper && requestDetails.helper._id === currentUser._id)
    );
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
      <div className="bg-white rounded-lg shadow-md border border-gray-200 flex flex-col h-[85vh] relative">
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
              <Message key={msg._id} msg={msg} isOwnMessage={currentUser && msg.sender._id === currentUser._id} />
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

        {/* Форма ввода сообщения */}
        <footer className="bg-white border-t border-gray-200 p-4 rounded-b-lg">
          <div className="mx-auto max-w-4xl">
            {attachmentPreview && (
              <div className="mb-2 p-2 bg-gray-100 rounded-lg relative w-24 h-24">
                <img src={attachmentPreview} alt="Превью" className="w-full h-full object-cover rounded-md" />
                <button 
                  onClick={() => { setAttachment(null); setAttachmentPreview(''); }} 
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs"
                >&times;</button>
              </div>
            )}
            <form onSubmit={handleSendMessage} className="flex items-center gap-3">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileChange}
              />
              <label htmlFor="file-upload" className="cursor-pointer text-gray-500 hover:text-gray-700">
                <PaperClipIcon className="h-6 w-6" />
              </label>
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
        </footer>
      </div>
    </div>
  );
};

export default ChatPage;