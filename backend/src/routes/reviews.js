import express from 'express';
import { body, validationResult, param } from 'express-validator';
import Review from '../models/Review.js';
import Request from '../models/Request.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { createAndSendNotification } from './notifications.js';

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
    const newReview = new Review({
      requestId: requestId,
      reviewerId: req.user.id,
      helperId: request.helper,
      rating,
      comment
    });
    
    await newReview.save();
    
    // Пересчитываем средний рейтинг хелпера
    await User.updateAverageRating(request.helper);

    // --- УВЕДОМЛЕНИЕ ХЕЛПЕРУ О НОВОМ ОТЗЫВЕ ---
    const populatedReview = await Review.findById(newReview._id).populate('reviewerId', 'username');
    
    await createAndSendNotification(req.app.locals.sseConnections, {
      user: request.helper,
      type: 'new_review_for_you',
      title: 'Вам оставили новый отзыв!',
      message: `Пользователь ${populatedReview.reviewerId.username} оставил вам отзыв по заявке "${request.title}".`,
      link: `/profile/${request.helper}`
    });

    res.status(201).json(newReview);
  } catch (err) {
    console.error('Ошибка при создании отзыва:', err);
    res.status(500).json({ msg: 'Не получилось создать отзыв' });
  }
});

/**
 * @swagger
 * /api/reviews/user/{userId}:
 *   get:
 *     summary: Получить все отзывы о пользователе
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID пользователя
 *     responses:
 *       200:
 *         description: Список отзывов о пользователе
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Review'
 *       500:
 *         description: Внутренняя ошибка сервера
 */
// получить отзывы для пользователя
router.get('/user/:userId', [
  param('userId').isMongoId().withMessage('Неверный формат ID пользователя')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { userId } = req.params;
    
    const reviews = await Review.find({ helperId: userId })
      .populate('reviewerId', 'username avatar')
      .populate('requestId', 'title')
      .sort({ createdAt: -1 })
      .lean();

    // Фильтруем и форматируем данные для клиента
    const reviewsForClient = reviews
      .filter(review => review.reviewerId && review.requestId) // Убираем отзывы с удаленными авторами или заявками
      .map(review => {
        return {
          _id: review._id,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.createdAt,
          author: review.reviewerId, // Переименовываем 'reviewerId' в 'author'
          request: review.requestId, // Переименовываем 'requestId' в 'request'
        };
      });
    
    res.json(reviewsForClient);
  } catch (err) {
    console.error('Ошибка при получении отзывов:', err);
    res.status(500).json({ msg: 'Что-то пошло не так' });
  }
});

export default router; 