import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { notificationsService } from '../../services/api';
import Loader from '../shared/Loader';

const NotificationDetailPage = () => {
  const { id } = useParams();
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchNotification = async () => {
      try {
        const res = await notificationsService.getNotificationById(id);
        setNotification(res.data);
      } catch (err) {
        setError(err.response?.data?.msg || 'Не удалось загрузить уведомление.');
      } finally {
        setLoading(false);
      }
    };
    fetchNotification();
  }, [id]);

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Ошибка</h2>
        <p>{error}</p>
        <Link to="/" className="text-blue-500 hover:underline mt-4 inline-block">На главную</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-2xl">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{notification.title}</h1>
        <p className="text-sm text-gray-500 mb-6">
          {new Date(notification.createdAt).toLocaleString('ru-RU')}
        </p>
        <div className="prose max-w-none text-gray-700">
          {notification.message}
        </div>
        <div className="text-center mt-8">
            <Link to="/notifications" className="text-indigo-600 hover:text-indigo-800 transition-colors">
                &larr; Все уведомления
            </Link>
        </div>
      </div>
    </div>
  );
};

export default NotificationDetailPage; 