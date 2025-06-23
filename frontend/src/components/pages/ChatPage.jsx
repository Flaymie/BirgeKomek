import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { requestsService, messagesService } from '../../services/api';
import { formatAvatarUrl } from '../../services/avatarUtils';
import { toast } from 'react-toastify';
import { PaperClipIcon } from '@heroicons/react/24/solid';

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
    <div className={`flex items-end gap-3 mb-4 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
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
    </div>
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

  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const isScrolledToBottom = useRef(true);

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
    } catch (err) {
      setError('Произошла ошибка при загрузке чата.');
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Эффект для авто-прокрутки
  useEffect(() => {
    // Прокручиваем вниз только если пользователь уже был внизу,
    // чтобы не мешать ему читать историю.
    if (isScrolledToBottom.current) {
      scrollToBottom();
    }
  }, [messages]); // Запускается каждый раз при изменении сообщений

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
      if (message.requestId === requestId) { // Убедимся, что сообщение для этого чата
        if (chatContainerRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
          isScrolledToBottom.current = scrollHeight - scrollTop <= clientHeight + 10;
        }
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
  
  // Функция для плавной прокрутки вниз
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((newMessage.trim() || attachment) && socket) {
      socket.emit('send_message', {
        requestId: requestId,
        content: newMessage,
      });
    }
    
    setNewMessage('');
    setAttachment(null);
  };
  
  // Обработчик выбора файла
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Проверяем размер файла (максимум 10 МБ)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Размер файла не должен превышать 10 МБ');
        return;
      }
      setAttachment(file);
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
    <div className="container mx-auto px-4 py-8 mt-16">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        {/* Заголовок чата */}
        <div className="bg-gray-50 p-4 border-b border-gray-200 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold">{requestDetails.title}</h1>
              <p className="text-sm text-gray-500">
                {requestDetails.subject} • {requestDetails.grade} класс
              </p>
            </div>
            <Link 
              to={`/request/${requestId}`}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              К деталям запроса
            </Link>
          </div>
          <div className="flex items-center mt-2 text-sm text-gray-500">
            <span>Участники: </span>
            <span className="ml-1 font-medium">{requestDetails.author.username}</span>
            {requestDetails.helper && (
              <>
                <span className="mx-1">и</span>
                <span className="font-medium">{requestDetails.helper.username}</span>
              </>
            )}
          </div>
        </div>
        
        {/* Область сообщений */}
        <div ref={chatContainerRef} className="p-4 h-[60vh] overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
              </svg>
              <p className="text-gray-500">Здесь пока нет сообщений. Начните общение!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <Message key={message._id} msg={message} isOwnMessage={message.sender?._id === currentUser?._id} />
              ))}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>
        
        {/* Форма отправки сообщения */}
        <div className="p-4 border-t border-gray-200">
          <form onSubmit={handleSendMessage} className="flex flex-col space-y-2">
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => document.getElementById('attachment-input').click()}
                className="p-2 text-gray-500 hover:text-indigo-600"
                title="Прикрепить файл"
              >
                <PaperClipIcon className="w-5 h-5" />
              </button>
              <input
                type="file"
                id="attachment-input"
                onChange={handleFileChange}
                className="hidden"
              />
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Введите сообщение..."
                className="flex-1 border border-gray-300 rounded-l-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-r-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                disabled={!newMessage.trim() && !attachment}
              >
                Отправить
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatPage; 