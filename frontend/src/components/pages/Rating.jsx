import React, { useState } from 'react';
import { StarIcon } from '@heroicons/react/24/solid';

const Rating = ({ onSubmit }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) return;
    setIsSubmitting(true);
    await onSubmit(rating, comment);
    // isSubmitting останется true, т.к. компонент исчезнет
  };

  return (
    <div className="bg-indigo-50 border-t-2 border-indigo-200 p-4 rounded-b-lg">
      <form onSubmit={handleSubmit}>
        <div className="text-center mb-3">
          <p className="font-semibold text-indigo-800">Оцените помощь</p>
          <p className="text-sm text-indigo-600">Ваша оценка очень важна для нас.</p>
        </div>
        
        <div className="flex justify-center items-center gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <StarIcon
              key={star}
              className={`h-9 w-9 cursor-pointer transition-colors ${
                (hoverRating || rating) >= star ? 'text-yellow-400' : 'text-gray-300'
              }`}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
            />
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Хотите оставить комментарий? (необязательно)"
          rows="2"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          maxLength="500"
        />

        <div className="mt-3 text-center">
           <button
            type="submit"
            disabled={rating === 0 || isSubmitting}
            className="w-full sm:w-auto bg-indigo-600 text-white rounded-md px-6 py-2 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors font-semibold"
          >
            {isSubmitting ? 'Отправка...' : 'Отправить оценку'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Rating; 