import express from 'express';
import { body, validationResult, param, query } from 'express-validator'; // Добавил query
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
 *       404:
 *         description: Пользователь не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/me', protect, async (req, res) => {
  try {
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
 *               helperSubjects:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Список предметов, по которым пользователь готов помогать (опционально, для хелперов)
 *               currentPassword:
 *                 type: string
 *                 description: Текущий пароль (обязателен для смены email или пароля)
 *               newPassword:
 *                 type: string
 *                 description: Новый пароль (опционально, для смены пароля)
 *     responses:
 *       200:
 *         description: Профиль успешно обновлен
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
    .matches(/^\+?[0-9]{10,15}$/).withMessage('Некорректный формат телефона (например, +77001234567)'),
  body('grade')
    .optional()
    .isInt({ min: 1, max: 11 }).withMessage('Класс должен быть от 1 до 11'),
  body('helperSubjects')
    .optional()
    .isArray().withMessage('helperSubjects должен быть массивом')
    .custom((subjects) => subjects.every(subject => typeof subject === 'string' && subject.trim() !== ''))
    .withMessage('Все предметы в helperSubjects должны быть непустыми строками'),
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
    const { username, email, phone, grade, helperSubjects, currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'Пользователь не найден' });
    }

    if (email || newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ msg: 'Требуется текущий пароль для изменения email или пароля' });
      }
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({ msg: 'Неверный текущий пароль' });
      }
    }

    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ msg: 'Имя пользователя уже занято' });
      }
      user.username = username;
    }
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ msg: 'Email уже занят' });
      }
      user.email = email;
    }
    if (phone) user.phone = phone;
    if (grade) user.grade = grade;
    if (newPassword) user.password = newPassword; 

    if (helperSubjects) {
        if (user.roles && user.roles.helper) { // Обновляем предметы только если пользователь - хелпер
            user.helperSubjects = helperSubjects.map(s => s.trim()).filter(s => s);
        } else if (helperSubjects.length > 0) {
            // Если пользователь не хелпер, но пытается указать предметы, можно вернуть ошибку
            // или просто проигнорировать, или автоматически сделать его хелпером (требует обсуждения)
             return res.status(400).json({ msg: 'Пользователь не является хелпером. Нельзя обновить helperSubjects.' });
        }
    }


    const updatedUser = await user.save();
    const userResponse = updatedUser.toObject();
    delete userResponse.password;

    res.json(userResponse);
  } catch (err) {
    console.error('Ошибка при обновлении профиля:', err.message);
    if (err.code === 11000) { // Ошибка дублирования ключа MongoDB
        const field = Object.keys(err.keyValue)[0];
        return res.status(400).json({ msg: `Значение '${err.keyValue[field]}' для поля '${field}' уже занято.` });
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
 *                 helperSubjects:
 *                    type: array
 *                    items: { type: 'string' }
 *                 completedRequests:
 *                    type: integer
 *                 createdAt:
 *                    type: string
 *                    format: date-time
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
    const user = await User.findById(req.params.id).select('-password -email -phone -reviews'); 

    if (!user) {
      return res.status(404).json({ msg: 'Пользователь не найден' });
    }
    
    const userObject = user.toObject();
    userObject.completedRequests = 0; // Инициализируем

    if (user.roles && user.roles.helper) {
      userObject.completedRequests = await Request.countDocuments({ helper: user._id, status: 'completed' });
    } else {
      // Если не хелпер, возможно, не стоит показывать helperSubjects или установить в null/undefined
      delete userObject.helperSubjects; 
    }

    res.json(userObject);
  } catch (err) {
    console.error('Ошибка при получении публичного профиля:', err.message);
    if (err.kind === 'ObjectId') {
        return res.status(400).json({ msg: 'Неверный формат ID пользователя' });
    }
    res.status(500).send('Ошибка сервера');
  }
});

/**
 * @swagger
 * /api/users/helpers:
 *   get:
 *     summary: Поиск помощников (хелперов)
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
 *           enum: [rating_desc, rating_asc, points_desc, points_asc, createdAt_desc, createdAt_asc]
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
 *           maximum: 100
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
 *                 totalPages: { type: 'integer' }
 *                 currentPage: { type: 'integer' }
 *                 totalHelpers: { type: 'integer' }
 *       400:
 *         description: Некорректные параметры запроса
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/helpers', [ // Изменено с router.get('/helpers', protect, [ на router.get('/helpers', [ так как этот эндпоинт публичный
  query('subject').optional().trim().escape(),
  query('minRating').optional().isFloat({ min: 0, max: 5 }).toFloat(),
  query('sortBy').optional().isIn(['rating_desc', 'rating_asc', 'points_desc', 'points_asc', 'createdAt_desc', 'createdAt_asc']),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { subject, minRating, sortBy = 'rating_desc', page = 1, limit = 10 } = req.query;

    const queryOptions = { 'roles.helper': true };

    if (subject) {
      queryOptions.helperSubjects = { $in: [new RegExp(subject, 'i')] };
    }
    if (minRating !== undefined) {
      queryOptions.rating = { $gte: minRating };
    }

    const sortParams = {};
    if (sortBy) {
        const parts = sortBy.split('_');
        sortParams[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    }


    const helpers = await User.find(queryOptions)
      .select('_id username rating points helperSubjects roles.helper') 
      .sort(sortParams)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(); 
      
    const totalHelpers = await User.countDocuments(queryOptions);

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
      currentPage: page,
      totalHelpers,
    });

  } catch (err) {
    console.error('Ошибка при поиске помощников:', err.message);
    res.status(500).send('Ошибка сервера');
  }
});

export default router;