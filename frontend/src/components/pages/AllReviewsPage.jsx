import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usersService } from '../../services/api';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import ReviewsBlock from '../shared/ReviewsBlock';

const AllReviewsPage = () => {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) {
        setError('User ID не найден.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const userRes = await usersService.getUserById(userId);
        setUser(userRes.data);
      } catch (err) {
        setError('Не удалось загрузить данные пользователя.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId]);

  if (loading) {
    return <div className="container mx-auto px-4 py-12 mt-16 text-center">Загрузка...</div>;
  }

  if (error) {
    return <div className="container mx-auto px-4 py-12 mt-16 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 mt-16">
      <div className="mb-6">
        <Link to={`/profile/${userId}`} className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-indigo-600">
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Вернуться в профиль {user?.username || ''}
        </Link>
      </div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Все отзывы о пользователе {user?.username}</h1>
      
      <ReviewsBlock userId={userId} showAll={true} />
    </div>
  );
};

export default AllReviewsPage; 