import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { requestsService, messagesService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

const ChatPage = () => {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Функция для загрузки данных запроса
  const fetchRequestDetails = async () => {
    try {
      const response = await requestsService.getRequestById(id);
      setRequest(response.data);
    } catch (err) {
      console.error('Ошибка при получении данных запроса:', err);
      setError(err.response?.data?.msg || 'Произошла ошибка при загрузке данных запроса');
    }
  };
  
  // Функция для загрузки сообщений
  const fetchMessages = async () => {
    try {
      const response = await messagesService.getMessages(id);
      setMessages(response.data);
      // Отмечаем сообщения как прочитанные
      await messagesService.markAsRead(id);
    } catch (err) {
      console.error('Ошибка при получении сообщений:', err);
      setError(err.response?.data?.msg || 'Произошла ошибка при загрузке сообщений');
    } finally {
      setLoading(false);
    }
  };

  // Загружаем данные при монтировании компонента
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchRequestDetails();
      await fetchMessages();
    };
    
    loadData();
    
    // Настраиваем интервал для периодической проверки новых сообщений
    const interval = setInterval(fetchMessages, 5000);
    
    return () => clearInterval(interval);
  }, [id]);
  
  // Прокручиваем к последнему сообщению при загрузке или добавлении новых
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Функция для отправки сообщения
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() && !selectedFile) {
      toast.error('Введите сообщение или выберите файл');
      return;
    }
    
    setSending(true);
    
    try {
      if (selectedFile) {
        // Отправка сообщения с вложением
        await messagesService.sendMessageWithAttachment(id, newMessage, selectedFile);
      } else {
        // Отправка обычного текстового сообщения
        await messagesService.sendMessage(id, newMessage);
      }
      
      setNewMessage('');
      setSelectedFile(null);
      
      // Обновляем список сообщений
      await fetchMessages();
    } catch (err) {
      console.error('Ошибка при отправке сообщения:', err);
      toast.error('Не удалось отправить сообщение. Пожалуйста, попробуйте еще раз.');
    } finally {
      setSending(false);
    }
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
      setSelectedFile(file);
    }
  };
  
  // Функция для форматирования даты
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // Проверяем, является ли пользователь участником чата
  const isParticipant = () => {
    if (!request || !currentUser) return false;
    
    return (
      request.author._id === currentUser._id || 
      (request.helper && request.helper._id === currentUser._id)
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

  if (!request) {
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
              <h1 className="text-xl font-bold">{request.title}</h1>
              <p className="text-sm text-gray-500">
                {request.subject} • {request.grade} класс
              </p>
            </div>
            <Link 
              to={`/request/${id}`}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              К деталям запроса
            </Link>
          </div>
          <div className="flex items-center mt-2 text-sm text-gray-500">
            <span>Участники: </span>
            <span className="ml-1 font-medium">{request.author.username}</span>
            {request.helper && (
              <>
                <span className="mx-1">и</span>
                <span className="font-medium">{request.helper.username}</span>
              </>
            )}
          </div>
        </div>
        
        {/* Область сообщений */}
        <div className="p-4 h-[60vh] overflow-y-auto">
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
                <div 
                  key={message._id} 
                  className={`flex ${message.sender._id === currentUser._id ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[70%] rounded-lg p-3 ${
                      message.sender._id === currentUser._id 
                        ? 'bg-indigo-100 text-indigo-900' 
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="flex items-center mb-1">
                      <span className="font-medium text-sm">
                        {message.sender.username}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        {formatDate(message.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2">
                        {message.attachments.map((attachment, index) => {
                          // Определяем тип файла по расширению
                          const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment);
                          
                          return isImage ? (
                            <img 
                              key={index}
                              src={attachment} 
                              alt="Вложение" 
                              className="max-w-full max-h-40 rounded-md cursor-pointer"
                              onClick={() => window.open(attachment, '_blank')}
                            />
                          ) : (
                            <a 
                              key={index}
                              href={attachment} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="flex items-center text-indigo-600 hover:text-indigo-800"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                              </svg>
                              Скачать файл
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {/* Форма отправки сообщения */}
        <div className="p-4 border-t border-gray-200">
          <form onSubmit={handleSendMessage} className="flex flex-col space-y-2">
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                className="p-2 text-gray-500 hover:text-indigo-600"
                title="Прикрепить файл"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
                </svg>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Введите сообщение..."
                className="flex-1 border border-gray-300 rounded-l-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={sending}
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-r-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                disabled={sending || (!newMessage.trim() && !selectedFile)}
              >
                {sending ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  </div>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                  </svg>
                )}
              </button>
            </div>
            
            {/* Показываем выбранный файл */}
            {selectedFile && (
              <div className="flex items-center bg-gray-50 p-2 rounded-md">
                <span className="text-sm text-gray-700 truncate flex-1">
                  {selectedFile.name}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatPage; 