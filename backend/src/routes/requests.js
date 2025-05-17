import express from 'express';
import { body, validationResult, param, query } from 'express-validator';
import Request from '../models/Request.js';
import { protect, isHelper } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/requests:
 *   get:
 *     summary: Получить список заявок
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *         description: Фильтр по предмету
 *       - in: query
 *         name: grade
 *         schema:
 *           type: integer
 *         description: Фильтр по классу
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, assigned, completed, cancelled]
 *         description: Фильтр по статусу
 *     responses:
 *       200:
 *         description: Список заявок
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Request'
 *       401:
 *         description: Требуется авторизация
 *       500:
 *         description: Внутренняя ошибка сервера
 */
// получить все запросы
router.get('/', protect, [
  query('subject').optional().trim(),
  query('grade').optional().isInt({ min: 1, max: 11 }).withMessage('Класс должен быть от 1 до 11'),
  query('status').optional().isIn(['open', 'assigned', 'completed', 'cancelled']).withMessage('Недопустимый статус')
], async (req, res) => {
  try {
    // Проверяем результаты валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const filters = {};
    
    // фильтры из query
    if (req.query.subject) filters.subject = req.query.subject;
    if (req.query.grade) filters.grade = parseInt(req.query.grade);
    if (req.query.status) filters.status = req.query.status;
    
    // только открытые заявки по умолчанию
    if (!filters.status) {
      filters.status = 'open';
    }
    
    const requests = await Request.find(filters)
      .populate('author', 'username email rating')
      .sort({ createdAt: -1 });
    
    res.json(requests);
  } catch (err) {
    console.error('Ошибка при получении заявок:', err);
    res.status(500).json({ msg: 'Сломалось что-то на сервере' });
  }
});

/**
 * @swagger
 * /api/requests:
 *   post:
 *     summary: Создать новую заявку на помощь
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - subject
 *               - grade
 *             properties:
 *               title:
 *                 type: string
 *                 description: Заголовок заявки
 *               description:
 *                 type: string
 *                 description: Подробное описание проблемы
 *               subject:
 *                 type: string
 *                 description: Предмет
 *               grade:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 11
 *                 description: Класс
 *               topic:
 *                 type: string
 *                 description: Тема или раздел
 *               format:
 *                 type: string
 *                 enum: [text, call, chat, meet]
 *                 default: chat
 *                 description: Предпочитаемый формат помощи
 *               time:
 *                 type: object
 *                 properties:
 *                   start:
 *                     type: string
 *                     format: date-time
 *                   end:
 *                     type: string
 *                     format: date-time
 *               isUrgent:
 *                 type: boolean
 *                 default: false
 *                 description: Срочность заявки
 *     responses:
 *       201:
 *         description: Заявка успешно создана
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Request'
 *       400:
 *         description: Некорректные данные
 *       401:
 *         description: Требуется авторизация
 *       500:
 *         description: Внутренняя ошибка сервера
 */
// создать новую заявку
router.post('/', protect, [
  body('title')
    .trim()
    .not().isEmpty().withMessage('Заголовок обязателен')
    .isLength({ min: 5, max: 100 }).withMessage('Заголовок должен быть от 5 до 100 символов'),
  
  body('description')
    .trim()
    .not().isEmpty().withMessage('Описание обязательно')
    .isLength({ min: 10 }).withMessage('Описание должно быть минимум 10 символов'),
  
  body('subject')
    .trim()
    .not().isEmpty().withMessage('Предмет обязателен'),
  
  body('grade')
    .isInt({ min: 1, max: 11 }).withMessage('Класс должен быть от 1 до 11'),
  
  body('topic')
    .optional()
    .trim(),
  
  body('format')
    .optional()
    .isIn(['text', 'call', 'chat', 'meet']).withMessage('Недопустимый формат'),
  
  body('isUrgent')
    .optional()
    .isBoolean().withMessage('isUrgent должен быть булевым')
], async (req, res) => {
  try {
    // Проверяем результаты валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Извлекаем только нужные поля
    const { title, description, subject, grade, topic, format, time, isUrgent } = req.body;
    
    const request = new Request({
      title,
      description,
      subject,
      grade,
      topic,
      format,
      time,
      isUrgent,
      author: req.user._id
    });
    
    await request.save();
    
    res.status(201).json(request);
  } catch (err) {
    console.error('Ошибка при создании заявки:', err);
    res.status(500).json({ msg: 'Не удалось создать заявку' });
  }
});

/**
 * @swagger
 * /api/requests/{id}:
 *   get:
 *     summary: Получить детали заявки по ID
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID заявки
 *     responses:
 *       200:
 *         description: Детали заявки
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Request'
 *       401:
 *         description: Требуется авторизация
 *       404:
 *         description: Заявка не найдена
 *       500:
 *         description: Внутренняя ошибка сервера
 */
// получить заявку по ID
router.get('/:id', protect, [
  param('id').isMongoId().withMessage('Неверный формат ID')
], async (req, res) => {
  try {
    // Проверяем результаты валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const request = await Request.findById(req.params.id)
      .populate('author', 'username email rating')
      .populate('helper', 'username email rating');
    
    if (!request) {
      return res.status(404).json({ msg: 'Заявка не найдена' });
    }
    
    res.json(request);
  } catch (err) {
    console.error('Ошибка при получении заявки:', err);
    res.status(500).json({ msg: 'Что-то пошло не так' });
  }
});

/**
 * @swagger
 * /api/requests/{id}/apply:
 *   post:
 *     summary: Откликнуться на заявку (для помощников)
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID заявки
 *     responses:
 *       200:
 *         description: Успешно откликнулись на заявку
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Request'
 *       400:
 *         description: Заявка уже имеет помощника или закрыта
 *       401:
 *         description: Требуется авторизация
 *       403:
 *         description: Нет прав помощника
 *       404:
 *         description: Заявка не найдена
 *       500:
 *         description: Внутренняя ошибка сервера
 */
// откликнуться на заявку (хелпер)
router.post('/:id/apply', protect, isHelper, [
  param('id').isMongoId().withMessage('Неверный формат ID')
], async (req, res) => {
  try {
    // Проверяем результаты валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const request = await Request.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ msg: 'Заявка не найдена' });
    }
    
    if (request.status !== 'open') {
      return res.status(400).json({ msg: 'На эту заявку уже откликнулись' });
    }
    
    // обновляем заявку
    request.helper = req.user._id;
    request.status = 'assigned';
    
    await request.save();
    
    res.json(request);
  } catch (err) {
    console.error('Ошибка при отклике на заявку:', err);
    res.status(500).json({ msg: 'Не удалось откликнуться на заявку' });
  }
});

/**
 * @swagger
 * /api/requests/{id}/complete:
 *   post:
 *     summary: Завершить заявку
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID заявки
 *     responses:
 *       200:
 *         description: Заявка успешно завершена
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Request'
 *       400:
 *         description: Некорректный статус заявки
 *       401:
 *         description: Требуется авторизация
 *       403:
 *         description: Нет прав на изменение заявки
 *       404:
 *         description: Заявка не найдена
 *       500:
 *         description: Внутренняя ошибка сервера
 */
// завершить заявку
router.post('/:id/complete', protect, [
  param('id').isMongoId().withMessage('Неверный формат ID')
], async (req, res) => {
  try {
    // Проверяем результаты валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const request = await Request.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ msg: 'Заявка не найдена' });
    }
    
    // только автор или хелпер могут завершить
    if (
      request.author.toString() !== req.user._id.toString() && 
      request.helper.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ msg: 'Нет прав на изменение этой заявки' });
    }
    
    if (request.status !== 'assigned') {
      return res.status(400).json({ msg: 'Можно завершить только назначенную заявку' });
    }
    
    // меняем статус
    request.status = 'completed';
    
    await request.save();
    
    res.json(request);
  } catch (err) {
    console.error('Ошибка при завершении заявки:', err);
    res.status(500).json({ msg: 'Не удалось завершить заявку' });
  }
});

/**
 * @swagger
 * /api/requests/{id}/cancel:
 *   post:
 *     summary: Отменить заявку
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID заявки
 *     responses:
 *       200:
 *         description: Заявка успешно отменена
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Request'
 *       400:
 *         description: Некорректный статус заявки
 *       401:
 *         description: Требуется авторизация
 *       403:
 *         description: Нет прав на отмену заявки
 *       404:
 *         description: Заявка не найдена
 *       500:
 *         description: Внутренняя ошибка сервера
 */
// отменить заявку
router.post('/:id/cancel', protect, [
  param('id').isMongoId().withMessage('Неверный формат ID')
], async (req, res) => {
  try {
    // Проверяем результаты валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const request = await Request.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ msg: 'Заявка не найдена' });
    }
    
    // только автор может отменить
    if (request.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ msg: 'Только автор может отменить заявку' });
    }
    
    if (request.status === 'completed' || request.status === 'cancelled') {
      return res.status(400).json({ msg: 'Нельзя отменить завершенную или отмененную заявку' });
    }
    
    request.status = 'cancelled';
    
    await request.save();
    
    res.json(request);
  } catch (err) {
    console.error('Ошибка при отмене заявки:', err);
    res.status(500).json({ msg: 'Не удалось отменить заявку' });
  }
});

export default router; 