import express from 'express';
import { body, validationResult, param } from 'express-validator';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import Request from '../models/Request.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Управление профилями пользователей
 */

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Получить профиль текущего пользователя
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Профиль пользователя
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/me', protect, async (req, res) => {
  try {
    // req.user добавляется middleware protect
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ msg: 'Пользователь не найден' });
    }
    res.json(user);
  } catch (err) {
    console.error('Ошибка при получении профиля:', err.message);
    res.status(500).send('Ошибка сервера');
  }
});

/**
 * @swagger
 * /api/users/me:
 *   put:
 *     summary: Обновить профиль текущего пользователя
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: Новое имя пользователя (опционально)
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Новый email (опционально, требует осторожности, т.к. уникален)
 *               phone:
 *                 type: string
 *                 description: Новый номер телефона (опционально)
 *               grade:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 11
 *                 description: Новый класс ученика (опционально)
 *               currentPassword:
 *                 type: string
 *                 description: Текущий пароль (обязателен для смены email или пароля)
 *               newPassword:
 *                 type: string
 *                 description: Новый пароль (опционально, для смены пароля)
 *     responses:
 *       200:
 *         description: Профиль успешно обновлен
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Некорректные данные или ошибка валидации
 *       401:
 *         description: Не авторизован или неверный текущий пароль
 *       404:
 *         description: Пользователь не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.put('/me', protect, [
  // Валидация (опциональные поля)
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage('Имя пользователя должно быть от 3 до 30 символов')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Имя пользователя может содержать только буквы, цифры и подчеркивания'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Введите корректный email')
    .normalizeEmail(),
  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[0-9]{10,15}$/).withMessage('Некорректный формат телефона'),
  body('grade')
    .optional()
    .isInt({ min: 1, max: 11 }).withMessage('Класс должен быть от 1 до 11'),
  body('newPassword')
    .optional()
    .trim()
    .isLength({ min: 6 }).withMessage('Новый пароль должен быть минимум 6 символов')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { username, email, phone, grade, currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'Пользователь не найден' });
    }

    // Если изменяется email или пароль, нужен текущий пароль
    if (email || newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ msg: 'Требуется текущий пароль для изменения email или пароля' });
      }
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({ msg: 'Неверный текущий пароль' });
      }
    }

    // Обновление полей
    if (username) {
      // Проверка на уникальность нового username, если он меняется
      if (username !== user.username) {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
          return res.status(400).json({ msg: 'Имя пользователя уже занято' });
        }
        user.username = username;
      }
    }
    if (email) {
      // Проверка на уникальность нового email, если он меняется
      if (email !== user.email) {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return res.status(400).json({ msg: 'Email уже занят' });
        }
        user.email = email;
      }
    }
    if (phone) user.phone = phone;
    if (grade) user.grade = grade;
    if (newPassword) user.password = newPassword; // Пароль будет захеширован pre-save хуком

    const updatedUser = await user.save();
    updatedUser.password = undefined; // Не возвращаем пароль

    res.json(updatedUser);
  } catch (err) {
    console.error('Ошибка при обновлении профиля:', err.message);
    // Дополнительная проверка на ошибки дублирования от MongoDB (для email/username)
    if (err.code === 11000) {
        return res.status(400).json({ msg: 'Имя пользователя или email уже заняты.' });
    }
    res.status(500).send('Ошибка сервера');
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Получить публичный профиль пользователя по ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID пользователя
 *     responses:
 *       200:
 *         description: Публичный профиль пользователя
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 username:
 *                   type: string
 *                 roles:
 *                   type: object
 *                 grade:
 *                   type: integer
 *                 points:
 *                    type: integer
 *                 rating:
 *                    type: number
 *                 createdAt:
 *                    type: string
 *                    format: date-time
 *                 // Можно добавить другие публичные поля, например, количество выполненных заявок
 *       400:
 *         description: Неверный формат ID
 *       404:
 *         description: Пользователь не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/:id', [
  param('id').isMongoId().withMessage('Неверный формат ID пользователя')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const user = await User.findById(req.params.id).select('-password -email -phone -reviews'); // Исключаем приватные данные

    if (!user) {
      return res.status(404).json({ msg: 'Пользователь не найден' });
    }

    // Подсчет количества выполненных заявок, если это хелпер
    let completedRequestsCount = 0;
    if (user.roles && user.roles.helper) {
      completedRequestsCount = await Request.countDocuments({ helper: user._id, status: 'completed' });
    }
    
    // Преобразуем пользователя в объект, чтобы добавить новое поле
    const userObject = user.toObject();
    userObject.completedRequests = completedRequestsCount;

    res.json(userObject);
  } catch (err) {
    console.error('Ошибка при получении публичного профиля:', err.message);
    res.status(500).send('Ошибка сервера');
  }
});

/**
 * @swagger
 * /api/users/helpers:
 *   get:
 *     summary: Поиск помощников
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *         description: Фильтр по предмету, в котором помощник компетентен
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: number
 *           format: float
 *           minimum: 0
 *           maximum: 5
 *         description: Фильтр по минимальному рейтингу
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [rating_desc, rating_asc, points_desc, points_asc]
 *           default: rating_desc
 *         description: Поле и направление сортировки
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Номер страницы для пагинации
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Количество результатов на странице
 *     responses:
 *       200:
 *         description: Список помощников
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 helpers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id: { type: 'string' }
 *                       username: { type: 'string' }
 *                       rating: { type: 'number' }
 *                       points: { type: 'integer' }
 *                       helperSubjects: { type: 'array', items: { type: 'string' } }
 *                       completedRequests: { type: 'integer' }
 *                       // Можно добавить еще публичные поля при необходимости
 *                 totalPages: { type: 'integer' }
 *                 currentPage: { type: 'integer' }
 *                 totalHelpers: { type: 'integer' }
 *       400:
 *         description: Некорректные параметры запроса
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/helpers', [
  // Валидация параметров запроса
  param('subject').optional().trim().isString(),
  param('minRating').optional().isFloat({ min: 0, max: 5 }),
  param('sortBy').optional().isIn(['rating_desc', 'rating_asc', 'points_desc', 'points_asc']),
  param('page').optional().isInt({ min: 1 }),
  param('limit').optional().isInt({ min: 1, max: 100 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { subject, minRating, sortBy, page = 1, limit = 10 } = req.query;

    const query = { 'roles.helper': true };

    if (subject) {
      query.helperSubjects = { $in: [new RegExp(subject, 'i')] }; // Поиск без учета регистра
    }
    if (minRating) {
      query.rating = { $gte: parseFloat(minRating) };
    }

    let sortOption = { rating: -1 }; // По умолчанию сортировка по убыванию рейтинга
    if (sortBy) {
      const parts = sortBy.split('_');
      sortOption = { [parts[0]]: parts[1] === 'desc' ? -1 : 1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const helpersQuery = User.find(query)
      .select('_id username rating points helperSubjects roles') // Выбираем только нужные поля
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const helpers = await helpersQuery.lean(); // .lean() для производительности и возможности добавлять поля
    const totalHelpers = await User.countDocuments(query);

    // Добавляем количество выполненных заявок для каждого хелпера
    const helpersWithStats = await Promise.all(helpers.map(async (helper) => {
      const completedRequestsCount = await Request.countDocuments({ helper: helper._id, status: 'completed' });
      return {
        ...helper,
        completedRequests: completedRequestsCount,
      };
    }));

    res.json({
      helpers: helpersWithStats,
      totalPages: Math.ceil(totalHelpers / limit),
      currentPage: parseInt(page),
      totalHelpers,
    });

  } catch (err) {
    console.error('Ошибка при поиске помощников:', err.message);
    res.status(500).send('Ошибка сервера');
  }
});

export default router; 