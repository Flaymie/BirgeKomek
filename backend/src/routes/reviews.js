import express from 'express';
import { body, validationResult, param } from 'express-validator';
import Review from '../models/Review.js';
import Request from '../models/Request.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/reviews/helper/{helperId}:
 *   get:
 *     summary: Получить все отзывы о конкретном помощнике
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: helperId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID пользователя-помощника
 *     responses:
 *       200:
 *         description: Список отзывов о помощнике
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Review'
 *       500:
 *         description: Внутренняя ошибка сервера
 */
// получить отзывы для хелпера
router.get('/helper/:helperId', [
  param('helperId').isMongoId().withMessage('Неверный формат ID')
], async (req, res) => {
  try {
    // Проверяем результаты валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
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

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Создать новый отзыв о помощнике
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - requestId
 *               - rating
 *             properties:
 *               requestId:
 *                 type: string
 *                 description: ID заявки, по которой оставляется отзыв
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Оценка от 1 до 5
 *               comment:
 *                 type: string
 *                 description: Текстовый комментарий к отзыву (опционально)
 *     responses:
 *       201:
 *         description: Отзыв успешно создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Review'
 *       400:
 *         description: Некорректные данные или отзыв уже существует
 *       401:
 *         description: Требуется авторизация
 *       403:
 *         description: Нет прав на создание отзыва
 *       404:
 *         description: Заявка не найдена
 *       500:
 *         description: Внутренняя ошибка сервера
 */
// создать отзыв на хелпера
router.post('/', protect, [
  body('requestId')
    .notEmpty().withMessage('ID заявки обязателен')
    .isMongoId().withMessage('Неверный формат ID заявки'),
  
  body('rating')
    .isInt({ min: 1, max: 5 }).withMessage('Рейтинг должен быть от 1 до 5'),
  
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Комментарий не должен превышать 500 символов')
    .escape()
], async (req, res) => {
  try {
    // Проверяем результаты валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Извлекаем только нужные поля
    const { requestId, rating, comment } = req.body;
    
    // проверяем существование и статус заявки
    const request = await Request.findById(requestId);
    
    if (!request) {
      return res.status(404).json({ msg: 'Заявка не найдена' });
    }
    
    // Разрешаем оставлять отзыв для заявок в работе или завершенных
    const allowedStatuses = ['completed', 'assigned', 'in_progress'];
    if (!allowedStatuses.includes(request.status)) {
      return res.status(400).json({ msg: `Оставить отзыв можно только для заявок со статусом: ${allowedStatuses.join(', ')}` });
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