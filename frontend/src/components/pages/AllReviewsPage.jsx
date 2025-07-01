import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { reviewsService, usersService } from '../../services/api';
import { formatAvatarUrl } from '../../services/avatarUtils';
import DefaultAvatarIcon from '../shared/DefaultAvatarIcon';
import { StarIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';
import RoleBadge from '../shared/RoleBadge';

const StarRating = ({ rating }) => (
  <div className="flex items-center">
    {[...Array(5)].map((_, i) => (
      <StarIcon key={i} className={`h-5 w-5 ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`} />
    ))}
  </div>
);

const ReviewItem = ({ review }) => {
  const avatarUrl = formatAvatarUrl(review.author);
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-start gap-4">
      <Link to={`/profile/${review.author._id}`}>
        {avatarUrl ? (
          <img src={avatarUrl} alt={review.author.username} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            <DefaultAvatarIcon className="w-6 h-6 text-gray-500" />
          </div>
        )}
      </Link>
      <div className="flex-1">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-800">{review.author.username}</p>
                <RoleBadge user={review.author} />
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
              <span>по заявке</span>
              <Link to={`/request/${review.request._id}`} className="text-indigo-600 hover:underline">{review.request.title}</Link>
              {review.isResolved !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  review.isResolved
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {review.isResolved ? 'Решено' : 'Не решено'}
                </span>
              )}
            </div>
          </div>
          <StarRating rating={review.rating} />
        </div>
        {review.comment && <p className="mt-2 text-gray-700 bg-gray-50 p-3 rounded-md">{review.comment}</p>}
      </div>
    </div>
  );
};

const AllReviewsPage = () => {
  const { userId } = useParams();
  const [reviews, setReviews] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;
      try {
        setLoading(true);
        const [reviewsRes, userRes] = await Promise.all([
          reviewsService.getReviewsForUser(userId),
          usersService.getUserById(userId)
        ]);
        setReviews(reviewsRes.data);
        setUser(userRes.data);
      } catch (err) {
        setError('Не удалось загрузить данные.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
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
      
      {reviews.length === 0 ? (
        <p>Отзывов пока нет.</p>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => (
            <ReviewItem key={review._id} review={review} />
          ))}
        </div>
      )}
    </div>
  );
};

export default AllReviewsPage; 