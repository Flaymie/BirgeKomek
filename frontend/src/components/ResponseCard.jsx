import React from 'react';
import { Link } from 'react-router-dom';
import { responsesService } from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { formatAvatarUrl } from '../services/avatarUtils';
import RoleBadge from './shared/RoleBadge';

const ResponseCard = ({ response, isAuthor, onResponseAction, fullHelperProfile }) => {
  const { currentUser } = useAuth();
  const helper = fullHelperProfile || response.helper;
  const { comment, createdAt } = response;

  const handleAccept = async () => {
    try {
      await responsesService.acceptResponse(response._id);
      toast.success('Отклик принят! Создан чат с помощником');
      if (onResponseAction) onResponseAction('accepted', response._id);
    } catch (err) {
      console.error('Ошибка при принятии отклика:', err);
      toast.error(err.response?.data?.msg || 'Произошла ошибка при принятии отклика');
    }
  };
  
  const handleReject = async () => {
    try {
      await responsesService.rejectResponse(response._id);
      toast.info('Отклик отклонен');
      if (onResponseAction) onResponseAction('rejected', response._id);
    } catch (err) {
      console.error('Ошибка при отклонении отклика:', err);
      toast.error(err.response?.data?.msg || 'Произошла ошибка при отклонении отклика');
    }
  };
  
  if (!helper) {
    return (
       <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50 shadow-sm">
         <div className="flex items-center mb-2">
            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
              <span className="text-gray-500 font-bold">?</span>
            </div>
            <span className="text-gray-500 italic">Пользователь удален</span>
         </div>
         <div className="text-gray-500 italic whitespace-pre-line">
           {response.message}
         </div>
         <div className="mt-2 text-xs text-gray-400">
           {new Date(response.createdAt).toLocaleString('ru-RU')}
         </div>
       </div>
    )
  }
  
  const getStatusBadge = () => {
    if (response.status === 'pending') {
      return null;
    } else if (response.status === 'accepted') {
      return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Принят</span>;
    } else if (response.status === 'rejected') {
      return <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Отклонен</span>;
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3">
        <div className="flex items-center mb-2 sm:mb-0">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3 overflow-hidden">
            {helper.avatar ? (
              <img 
                src={`${process.env.REACT_APP_API_URL}${helper.avatar}`} 
                alt={helper.username}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-blue-700 font-bold">
                {helper.username.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <Link 
            to={`/profile/${helper._id}`} 
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            {helper.username}
          </Link>
          <RoleBadge user={helper} />
          {getStatusBadge() && <div className="ml-3">{getStatusBadge()}</div>}
        </div>
        
        {isAuthor && response.status === 'pending' && (
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={handleAccept}
              className="flex-1 sm:flex-none px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm transition-colors"
            >
              Принять
            </button>
            <button
              onClick={handleReject}
              className="flex-1 sm:flex-none px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm transition-colors"
            >
              Отклонить
            </button>
          </div>
        )}
      </div>
      
      <div className="text-gray-700 whitespace-pre-line">
        {response.message}
      </div>
      
      <div className="mt-2 text-xs text-gray-500">
        {new Date(response.createdAt).toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </div>
    </div>
  );
};

export default ResponseCard;