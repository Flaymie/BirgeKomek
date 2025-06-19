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
 *               location:
 *                 type: string
 *                 description: Новый город проживания (опционально, максимум 100 символов)
 *               bio:
 *                 type: string
 *                 description: Новый текст биографии (опционально, максимум 500 символов)
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
router.put('/me', protect, async (req, res) => {
  try {
    const { username, email, phone, location, bio, grade, helperSubjects, currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'Пользователь не найден' });
    }

    // Проверяем, меняется ли email
    const isEmailChanging = email && email !== user.email;
    
    // Требуем пароль только если меняется email или устанавливается новый пароль
    if ((isEmailChanging || newPassword) && !currentPassword) {
      return res.status(400).json({ msg: 'Требуется текущий пароль для изменения email или пароля' });
    }

    // Проверяем пароль только если он предоставлен
    if (currentPassword) {
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({ msg: 'Неверный текущий пароль' });
      }
    }

    // Обновляем имя пользователя, если оно изменилось
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser && existingUser._id.toString() !== userId) {
        return res.status(400).json({ msg: 'Имя пользователя уже занято' });
      }
      user.username = username;
    }
    
    // Обновляем email, если он изменился
    if (isEmailChanging) {
      const existingUser = await User.findOne({ email });
      if (existingUser && existingUser._id.toString() !== userId) {
        return res.status(400).json({ msg: 'Email уже занят' });
      }
      user.email = email;
    }

    // Обновляем пароль, если предоставлен новый
    if (newPassword) {
      user.password = newPassword;
    }

    // Обновляем другие поля профиля
    if (phone !== undefined) user.phone = phone;
    if (location !== undefined) user.location = location;
    if (bio !== undefined) user.bio = bio;
    if (grade !== undefined) user.grade = grade;
    if (helperSubjects !== undefined) user.helperSubjects = helperSubjects;

    await user.save();

    // Создаем объект с обновленными данными для ответа, исключая пароль
    const updatedUser = {
      _id: user._id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      location: user.location,
      bio: user.bio,
      grade: user.grade,
      helperSubjects: user.helperSubjects,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.json(updatedUser);
  } catch (err) {
    console.error('Ошибка при обновлении пользователя:', err);
    res.status(500).json({ msg: 'Ошибка сервера' });
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

/**
 * @swagger
 * /api/users/password:
 *   put:
 *     summary: Обновить пароль пользователя
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
 *               currentPassword:
 *                 type: string
 *                 description: Текущий пароль пользователя
 *               newPassword:
 *                 type: string
 *                 description: Новый пароль пользователя
 *     responses:
 *       200:
 *         description: Пароль успешно обновлен
 *       400:
 *         description: Некорректные данные или ошибка валидации
 *       401:
 *         description: Не авторизован или неверный текущий пароль
 *       404:
 *         description: Пользователь не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.put('/password', protect, [
  body('currentPassword')
    .notEmpty().withMessage('Текущий пароль обязателен'),
  body('newPassword')
    .notEmpty().withMessage('Новый пароль обязателен')
    .isLength({ min: 6 }).withMessage('Новый пароль должен быть минимум 6 символов')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'Пользователь не найден' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ msg: 'Неверный текущий пароль' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ msg: 'Пароль успешно обновлен' });
  } catch (err) {
    console.error('Ошибка при обновлении пароля:', err.message);
    res.status(500).send('Ошибка сервера');
  }
});

export default router;