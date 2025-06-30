import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { reviewsService, usersService } from '../../services/api';
import { formatAvatarUrl } from '../../services/avatarUtils';
import DefaultAvatarIcon from '../shared/DefaultAvatarIcon';
import { StarIcon } from '@heroicons/react/24/solid';
import { AnimatePresence, motion } from 'framer-motion';
import Rating from '../pages/Rating';
import RoleBadge from './RoleBadge';

const StarRating = ({ rating }) => (
  <div className="flex items-center">
    {[...Array(5)].map((_, i) => (
      <StarIcon
        key={i}
        className={`h-5 w-5 ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}
      />
    ))}
  </div>
);

const ReviewItem = ({ review, fullAuthorProfile }) => {
  if (!review || !review.author || !review.request) {
    return null;
  }
  
  const author = fullAuthorProfile || review.author;
  const avatarUrl = formatAvatarUrl(author);

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-white p-4 rounded-lg border border-gray-200"
    >
      <div className="flex items-start gap-4">
        <Link to={`/profile/${author._id}`}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={author.username} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
              <DefaultAvatarIcon className="w-6 h-6 text-gray-500" />
            </div>
          )}
        </Link>
        <div className="flex-1">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center">
                <Link to={`/profile/${author.username}`} className="font-semibold text-gray-800 hover:underline">
                  {author.username}
                </Link>
                <RoleBadge user={author} />
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
          {review.comment && (
            <p className="mt-2 text-gray-700 bg-gray-50 p-3 rounded-md">{review.comment}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const ReviewsBlock = ({ userId }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authorProfiles, setAuthorProfiles] = useState({});

  useEffect(() => {
    const fetchReviewsAndProfiles = async () => {
      if (!userId) return;
      try {
        setLoading(true);
        const res = await reviewsService.getReviewsForUser(userId);
        const reviewsData = res.data;
        setReviews(reviewsData);

        if (reviewsData.length === 0) return;

        const authorIds = [...new Set(reviewsData.map(r => r.author._id))];
        
        const profilePromises = authorIds.map(id => usersService.getUserById(id));
        const profileResponses = await Promise.all(profilePromises);

        const profilesMap = profileResponses.reduce((acc, profileRes) => {
          acc[profileRes.data._id] = profileRes.data;
          return acc;
        }, {});
        setAuthorProfiles(profilesMap);

      } catch (err) {
        setError('Не удалось загрузить отзывы.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReviewsAndProfiles();
  }, [userId]);

  if (loading) {
    return (
      <div className="mt-8 text-center">
        <p>Загрузка отзывов...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 p-4 bg-red-50 text-red-700 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Отзывы</h2>
      {reviews.length === 0 ? (
        <div className="bg-gray-50 p-6 rounded-lg text-center text-gray-500">
          <p>У этого помощника пока нет отзывов.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {reviews.slice(0, 3).map(review => (
              <ReviewItem
                key={review._id}
                review={review}
                fullAuthorProfile={authorProfiles[review.author._id]}
              />
            ))}
          </AnimatePresence>
          {reviews.length > 3 && (
            <div className="text-center pt-4">
              <Link
                to={`/reviews/${userId}`}
                className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors"
              >
                Посмотреть все отзывы ({reviews.length})
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReviewsBlock; 