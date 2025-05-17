import express from 'express';
import Review from '../models/Review.js';
import Request from '../models/Request.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// получить отзывы для хелпера
router.get('/helper/:helperId', async (req, res) => {
  try {
    const { helperId } = req.params;
    
    const reviews = await Review.find({ helperId })
      .populate('reviewerId', 'username')
      .populate('requestId', 'title')
      .sort({ createdAt: -1 });
    
    res.json(reviews);
  } catch (err) {
    console.error('Ошибка при получении отзывов:', err);
    res.status(500).json({ msg: 'Что-то пошло не так' });
  }
});

// создать отзыв на хелпера
router.post('/', protect, async (req, res) => {
  try {
    const { requestId, rating, comment } = req.body;
    
    if (!requestId || !rating) {
      return res.status(400).json({ msg: 'Не все поля заполнены' });
    }
    
    // проверяем существование и статус заявки
    const request = await Request.findById(requestId);
    
    if (!request) {
      return res.status(404).json({ msg: 'Заявка не найдена' });
    }
    
    if (request.status !== 'completed') {
      return res.status(400).json({ msg: 'Можно оставлять отзывы только для завершенных заявок' });
    }
    
    if (!request.helper) {
      return res.status(400).json({ msg: 'У этой заявки нет помощника' });
    }
    
    // проверяем, что отзыв оставляет автор заявки
    if (request.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ msg: 'Только автор заявки может оставить отзыв' });
    }
    
    // проверяем, что отзыв еще не оставлен
    const existingReview = await Review.findOne({ 
      requestId, 
      reviewerId: req.user._id 
    });
    
    if (existingReview) {
      return res.status(400).json({ msg: 'Вы уже оставили отзыв на эту заявку' });
    }
    
    // создаем отзыв
    const review = new Review({
      requestId,
      reviewerId: req.user._id,
      helperId: request.helper,
      rating,
      comment
    });
    
    await review.save();
    
    // обновляем рейтинг хелпера
    const helperReviews = await Review.find({ helperId: request.helper });
    
    if (helperReviews.length > 0) {
      const totalRating = helperReviews.reduce((sum, rev) => sum + rev.rating, 0);
      const avgRating = totalRating / helperReviews.length;
      
      await User.findByIdAndUpdate(request.helper, { 
        rating: Number(avgRating.toFixed(1))
      });
    }
    
    // начисляем баллы хелперу (за завершенную заявку с отзывом)
    await User.findByIdAndUpdate(
      request.helper,
      { $inc: { points: 10 } }
    );
    
    // получаем с данными отправителя
    const populatedReview = await Review.findById(review._id)
      .populate('reviewerId', 'username')
      .populate('requestId', 'title');
    
    res.status(201).json(populatedReview);
  } catch (err) {
    console.error('Ошибка при создании отзыва:', err);
    res.status(500).json({ msg: 'Не получилось создать отзыв' });
  }
});

export default router; 