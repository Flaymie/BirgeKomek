import express from 'express';
import { body, validationResult, param, query } from 'express-validator'; // Добавил query
import User from '../models/User.js';
import { protect, isAdmin, isModOrAdmin, adminOrModerator } from '../middleware/auth.js';
import Request from '../models/Request.js';
import Message from '../models/Message.js';
import Review from '../models/Review.js';
import Notification from '../models/Notification.js';
import mongoose from 'mongoose';
import { createAndSendNotification } from './notifications.js';
import axios from 'axios'; // <--- Добавляю axios
import redis, { isRedisConnected } from '../config/redis.js'; // <-- ИМПОРТ REDIS
import { generalLimiter } from '../middleware/rateLimiters.js'; // <-- Импортируем
import tgRequired from '../middleware/tgRequired.js'; // ИМПОРТ
import crypto from 'crypto'; // <-- ИМПОРТ ДЛЯ ГЕНЕРАЦИИ КОДА
import { internalBotAuth } from '../middleware/internalAuth.js'; // <-- Импортируем новую мидлварь

const router = express.Router();

// --- НОВЫЙ ХЕЛПЕР ДЛЯ ОТПРАВКИ СООБЩЕНИЙ В TELEGRAM ---
const sendTelegramMessage = async (telegramId, message) => {
  if (!telegramId || !process.env.BOT_TOKEN) {
    console.log('Не удалось отправить сообщение в Telegram: отсутствует ID или токен бота.');
    return;
  }
  const url = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(url, {
      chat_id: telegramId,
      text: message,
      parse_mode: 'Markdown',
    });
  } catch (error) {
    console.error('Ошибка при отправке сообщения в Telegram:', error.response ? error.response.data : error.message);
  }
};

export default ({ sseConnections, io }) => {
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
  router.get('/me', protect, generalLimiter, async (req, res) => {
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
  router.put('/me', protect, generalLimiter, tgRequired, [
    body('username').optional().trim().isLength({ min: 3, max: 20 }).withMessage('Никнейм должен быть от 3 до 20 символов.')
      .matches(/^[a-zA-Z0-9_]+$/).withMessage('Никнейм может содержать только латинские буквы, цифры и знак подчеркивания.'),
    body('email').optional().isEmail().withMessage('Неверный формат email'),
    body('phone').optional().isMobilePhone().withMessage('Неверный формат номера телефона'),
    body('location').optional().isLength({ max: 100 }).withMessage('Город не может превышать 100 символов'),
    body('bio').optional().isLength({ max: 500 }).withMessage('Текст биографии не может превышать 500 символов'),
    body('grade').optional().isInt({ min: 1, max: 11 }).withMessage('Неверный формат класса'),
    body('subjects').optional().isArray().withMessage('Неверный формат списка предметов'),
    body('newPassword').optional().isLength({ min: 6 }).withMessage('Новый пароль должен быть минимум 6 символов'),
    body('currentPassword').optional().isString(),
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { username, email, phone, location, bio, grade, subjects, currentPassword, newPassword } = req.body;
      const userId = req.user.id;
      const user = await User.findById(userId).select('+password');

      if (!user) {
        return res.status(404).json({ msg: 'Пользователь не найден' });
      }

      const isEmailChanging = email && email.toLowerCase() !== user.email;

      // --- НОВАЯ, ПРАВИЛЬНАЯ ПРОВЕРКА ПАРОЛЯ ---
      if (isEmailChanging || newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ 
            errors: [{ msg: 'Текущий пароль обязателен для смены email или установки нового пароля.' }] 
          });
        }
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
          return res.status(401).json({ errors: [{ msg: 'Неверный текущий пароль.' }] });
        }
      }
      
      // --- НОВАЯ ЛОГИКА СМЕНЫ НИКНЕЙМА ---
      if (username && username.toLowerCase() !== user.username) {
          // 1. Проверка на уникальность (без учета регистра)
          const existingUser = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
          if (existingUser && existingUser._id.toString() !== userId) {
              return res.status(400).json({ msg: 'Этот никнейм уже занят.' });
          }

          // 2. Проверка на время смены
          const lastChange = user.lastUsernameChange;
          const now = new Date();
          const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

          if (lastChange && (now.getTime() - lastChange.getTime()) < thirtyDaysInMs) {
              const nextDate = new Date(lastChange.getTime() + thirtyDaysInMs);
              return res.status(400).json({
                  msg: `Вы сможете изменить никнейм только после ${nextDate.toLocaleDateString('ru-RU')}.`
              });
          }

          user.username = username;
          user.lastUsernameChange = now;
      }

      // --- ЛОГИКА ОБНОВЛЕНИЯ ПОЛЕЙ ---
      if (isEmailChanging) {
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser && existingUser._id.toString() !== userId) {
          return res.status(400).json({ msg: 'Email уже занят' });
        }
        user.email = email.toLowerCase();
      }
      if (newPassword) {
        user.password = newPassword;
        user.hasPassword = true;
      }
      if (phone !== undefined) user.phone = phone;
      if (location !== undefined) user.location = location;
      if (bio !== undefined) user.bio = bio;
      if (grade !== undefined) user.grade = grade;
      if (subjects !== undefined && Array.isArray(subjects) && user.roles?.helper) {
        user.subjects = subjects;
      }

      await user.save();
      const updatedUser = user.toObject();
      delete updatedUser.password;
      res.json(updatedUser);

    } catch (err) {
      console.error('Ошибка при обновлении пользователя:', err);
      if (err.name === 'ValidationError') {
          const messages = Object.values(err.errors).map(val => val.message);
          return res.status(400).json({ msg: messages.join(', ') });
      }
      res.status(500).json({ msg: 'Ошибка сервера' });
    }
  });

  /**
   * @swagger
   * /api/users/{identifier}:
   *   get:
   *     summary: Получить публичный профиль пользователя по ID или username
   *     tags: [Users]
   *     parameters:
   *       - in: path
   *         name: identifier
   *         required: true
   *         schema:
   *           type: string
   *         description: ID или username пользователя
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
   *         description: Неверный формат идентификатора
   *       404:
   *         description: Пользователь не найден
   *       500:
   *         description: Внутренняя ошибка сервера
   */
  router.get('/:identifier', [
    param('identifier').notEmpty().withMessage('Необходим идентификатор пользователя').trim()
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { identifier } = req.params;
      let user;

      // Сначала пытаемся найти по ID, если это валидный ObjectId
      if (mongoose.Types.ObjectId.isValid(identifier)) {
        user = await User.findById(identifier).select('-password').lean();
      }

      // Если по ID не нашли или это был не ObjectId, ищем по username
      if (!user) {
        user = await User.findOne({ username: identifier }).select('-password').lean();
      }

      if (!user) {
        return res.status(404).json({ msg: 'Пользователь не найден' });
      }
      
      // --- НОВАЯ ПРОВЕРКА ОНЛАЙН-СТАТУСА ЧЕРЕЗ REDIS ---
      let isOnline = false;
      if (isRedisConnected()) {
        const onlineKey = `online:${user._id.toString()}`;
        const result = await redis.exists(onlineKey);
        isOnline = result === 1;
      }
      
      const createdRequests = await Request.countDocuments({ author: user._id });
      const completedRequests = await Request.countDocuments({ helper: user._id, status: 'completed' });
      const publicProfile = {
        ...user,
        isOnline: isOnline,
        createdRequests,
        completedRequests
      };
      res.json(publicProfile);
    } catch (err) {
      console.error('Ошибка при получении профиля пользователя:', err.message);
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
        // ИСПРАВЛЕНО: Ищем по полю 'subjects'
        queryOptions.subjects = { $in: [new RegExp(subject, 'i')] };
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
        .select('_id username rating points subjects roles.helper') // ИСПРАВЛЕНО: Выбираем 'subjects'
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
      
      // Уведомление о смене пароля
      await createAndSendNotification(req.app.locals.sseConnections, {
        user: req.user.id,
        type: 'security_alert',
        title: 'Ваш пароль был изменен',
        message: 'Ваш пароль был изменен. Если это были не вы, немедленно свяжитесь с поддержкой!',
        link: '/profile/me'
      });

      res.json({ msg: 'Пароль успешно обновлен' });
    } catch (err) {
      console.error('Ошибка при обновлении пароля:', err.message);
      res.status(500).json({ msg: 'Ошибка сервера' });
    }
  });

  /**
   * @swagger
   * /api/users/me:
   *   delete:
   *     summary: Удалить аккаунт текущего пользователя
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Аккаунт успешно удален
   *       401:
   *         description: Не авторизован
   *       404:
   *         description: Пользователь не найден
   *       500:
   *         description: Внутренняя ошибка сервера
   */
  router.delete('/me', protect, generalLimiter, async (req, res) => {
    try {
      const userId = req.user._id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ msg: 'Пользователь не найден' });
      }

      // Если нет Telegram ID, удаление через этот эндпоинт невозможно
      if (!user.telegramId) {
        return res.status(400).json({ msg: 'Для удаления аккаунта необходимо привязать Telegram для подтверждения.' });
      }

      // Генерация 6-значного кода
      const confirmationCode = crypto.randomInt(100000, 999999).toString();
      const redisKey = `delete-confirm:${userId}`;

      // Сохраняем код в Redis на 5 минут
      await redis.set(redisKey, confirmationCode, 'EX', 300);

      // Отправляем сообщение в Telegram
      const telegramMessage = `❗️ *Подтверждение удаления аккаунта* ❗️\n\nВы запросили удаление вашего аккаунта на платформе Бірге Көмек. Это действие необратимо.\n\nДля подтверждения введите этот код на сайте:\n\n*Код: \`${confirmationCode}\`*\n\nКод действителен 5 минут. Если это были не вы, просто проигнорируйте это сообщение.`;
      await sendTelegramMessage(user.telegramId, telegramMessage);

      // Отвечаем фронтенду, что требуется подтверждение
      res.status(202).json({
        status: 'pending_confirmation',
        message: 'Код подтверждения отправлен в ваш Telegram.'
      });

    } catch (err) {
      console.error('Ошибка при запросе на удаление аккаунта:', err);
      res.status(500).json({ msg: 'Ошибка сервера при запросе на удаление аккаунта.' });
    }
  });
  
  // НОВЫЙ ЭНДПОИНТ: ЭТАП 2 - Подтверждение и удаление
  router.post('/me/delete', protect, generalLimiter, [
      body('confirmationCode').notEmpty().isLength({ min: 6, max: 6 }).withMessage('Код подтверждения должен состоять из 6 цифр.'),
  ], async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
      }

      try {
          const userId = req.user._id;
          const { confirmationCode } = req.body;
          const redisKey = `delete-confirm:${userId}`;

          const storedCode = await redis.get(redisKey);

          if (!storedCode) {
              return res.status(400).json({ msg: 'Код подтверждения истек или не был запрошен. Попробуйте снова.' });
          }

          if (storedCode !== confirmationCode) {
              return res.status(400).json({ msg: 'Неверный код подтверждения.' });
          }
          
          // --- СЮДА ПЕРЕНЕСЕНА ВСЯ ЛОГИКА УДАЛЕНИЯ ---
          await Request.updateMany(
            { helper: userId, status: { $in: ['assigned', 'in_progress'] } },
            { $set: { status: 'open' }, $unset: { helper: 1 } }
          );
          const userRequests = await Request.find({ author: userId }).select('_id');
          const requestIds = userRequests.map(r => r._id);
          if (requestIds.length > 0) {
            await Message.deleteMany({ requestId: { $in: requestIds } });
            await Review.deleteMany({ requestId: { $in: requestIds } });
            await Request.deleteMany({ _id: { $in: requestIds } });
          }
          await Review.deleteMany({ reviewerId: userId });
          await Notification.deleteMany({ user: userId });
          await User.findByIdAndDelete(userId);
          // --- КОНЕЦ ЛОГИКИ УДАЛЕНИЯ ---

          await redis.del(redisKey); // Удаляем код после успешного использования

          res.status(200).json({ msg: 'Аккаунт и все связанные данные были успешно удалены.' });

      } catch (err) {
          console.error('Ошибка при подтверждении удаления аккаунта:', err);
          res.status(500).json({ msg: 'Ошибка сервера при удалении аккаунта.' });
      }
  });

  /**
   * @swagger
   * /api/users/{id}/ban:
   *   post:
   *     summary: Забанить пользователя
   *     tags: [Users, Moderation]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: 'string' }
   *         description: ID пользователя для бана
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               reason:
   *                 type: string
   *                 description: Причина бана
   *               duration:
   *                 type: number
   *                 description: Длительность бана в часах (оставить пустым для перманентного)
   *             required:
   *               - reason
   *     responses:
   *       200: { description: 'Пользователь успешно забанен' }
   *       400: { description: 'Некорректные данные' }
   *       403: { description: 'Недостаточно прав' }
   *       404: { description: 'Пользователь не найден' }
   */
  router.post('/:id/ban', protect, isModOrAdmin, generalLimiter, [
    param('id').isMongoId().withMessage('Неверный ID пользователя'),
    body('reason').notEmpty().withMessage('Причина бана обязательна').trim(),
    body('duration').optional().isInt({ min: 1 }).withMessage('Длительность должна быть целым числом'),
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userToBan = await User.findById(req.params.id);
      if (!userToBan) return res.status(404).json({ msg: 'Пользователь не найден' });
      if (userToBan.roles.admin) return res.status(403).json({ msg: 'Нельзя забанить администратора' });

      const { reason, duration } = req.body;
      const moderator = req.user;

      userToBan.banDetails.isBanned = true;
      userToBan.banDetails.reason = reason;
      userToBan.banDetails.bannedAt = new Date();
      userToBan.banDetails.expiresAt = duration ? new Date(Date.now() + duration * 60 * 60 * 1000) : null;

      // --- НОВОЕ УСЛОВИЕ ---
      // Применяем каскадные изменения только для банов дольше 2 дней (48 часов) или перманентных
      const isLongTermBan = !duration || duration > 48;

      if (isLongTermBan) {
        console.log(`[Ban Logic] Применяются каскадные изменения для ${userToBan.username} (бан > 48 часов или перманентный).`);
        
        // --- ЛОГИКА ПОСЛЕДСТВИЙ БАНА ---
        // Если забаненный - хелпер, снимаем его с активных заявок
        if (userToBan.roles.helper) {
          const helperRequests = await Request.find({ helper: userToBan._id, status: 'in_progress' });
          for (const request of helperRequests) {
            request.status = 'open';
            request.helper = null;
            request.assignedAt = null;
            await request.save();
            // Уведомляем автора заявки
            await createAndSendNotification(sseConnections, {
              user: request.author,
              type: 'request_updated',
              title: 'Изменения в вашей заявке',
              message: `Помощник ${userToBan.username} был снят с вашей заявки "${request.title}". Заявка снова открыта для откликов.`,
              link: `/request/${request._id}`,
            });
          }
        }

        // Если забаненный - ученик, отменяем все его активные заявки
        if (userToBan.roles.student) {
          const studentRequests = await Request.find({ author: userToBan._id, status: { $in: ['open', 'in_progress'] } });
          for (const request of studentRequests) {
            request.status = 'cancelled';
            request.cancellationReason = 'Аккаунт автора был заблокирован.';
            await request.save();
            // Если у заявки был хелпер, уведомляем его
            if (request.helper) {
              await createAndSendNotification(sseConnections, {
                user: request.helper,
                type: 'request_cancelled',
                title: 'Заявка была отменена',
                message: `Заявка "${request.title}" была отменена, так как аккаунт ее автора был заблокирован.`,
              });
            }
          }
        }
      }

      await userToBan.save();

      // --- ОТПРАВКА УВЕДОМЛЕНИЯ В TELEGRAM ---
      const banExpiryText = userToBan.banDetails.expiresAt
        ? `*Срок окончания бана:* ${new Date(userToBan.banDetails.expiresAt).toLocaleString('ru-RU')}`
        : '*Срок окончания бана:* навсегда';

      const telegramMessage = `🚫 *Ваш аккаунт был заблокирован* на платформе Бірге Көмек.\n\n*Модератор:* ${moderator.username}\n*Причина:* ${reason}\n${banExpiryText}`;
      await sendTelegramMessage(userToBan.telegramId, telegramMessage);

      res.json({ msg: `Пользователь ${userToBan.username} успешно забанен`, user: userToBan });

    } catch (err) {
      console.error('Ошибка при бане пользователя:', err);
      res.status(500).send('Ошибка сервера');
    }
  });

  /**
   * @swagger
   * /api/users/{id}/unban:
   *   post:
   *     summary: Разбанить пользователя
   *     tags: [Users, Moderation]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: 'string' }
   *         description: ID пользователя для разбана
   *     responses:
   *       200: { description: 'Пользователь успешно разбанен' }
   *       403: { description: 'Недостаточно прав' }
   *       404: { description: 'Пользователь не найден' }
   */
  router.post('/:id/unban', protect, isModOrAdmin, generalLimiter, [
    param('id').isMongoId().withMessage('Неверный ID пользователя'),
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userToUnban = await User.findById(req.params.id);
      if (!userToUnban) return res.status(404).json({ msg: 'Пользователь не найден' });
      
      userToUnban.banDetails.isBanned = false;
      userToUnban.banDetails.reason = null;
      userToUnban.banDetails.bannedAt = null;
      userToUnban.banDetails.expiresAt = null;
      await userToUnban.save();

      // --- ОТПРАВКА УВЕДОМЛЕНИЯ В TELEGRAM ---
      const telegramMessage = `✅ *Ваш аккаунт был разблокирован.*\n\nТеперь вы снова можете пользоваться платформой Бірге Көмек.`;
      await sendTelegramMessage(userToUnban.telegramId, telegramMessage);
      
      res.json({ msg: `Пользователь ${userToUnban.username} успешно разбанен`, user: userToUnban });
    } catch (err) {
      console.error('Ошибка при разбане пользователя:', err);
      res.status(500).send('Ошибка сервера');
    }
  });

  // @route   GET /api/users/by-telegram/:id
  // @desc    Найти пользователя по Telegram ID
  // @access  Internal (для бота)
  router.get('/by-telegram/:id', async (req, res) => {
    try {
      const user = await User.findOne({ telegramId: req.params.id });
      if (!user) {
        // Это не ошибка, просто пользователя нет. Отправляем exists: false
        return res.json({ exists: false });
      }
      res.json({ exists: true, user: { id: user._id, username: user.username } });
    } catch (error) {
      console.error('Ошибка поиска по Telegram ID:', error);
      res.status(500).json({ msg: 'Ошибка сервера' });
    }
  });

  // --- Настройки пользователя для Telegram-бота ---

  // Получить текущие настройки уведомлений
  router.get('/by-telegram/:telegramId/settings', async (req, res) => {
    try {
      const { telegramId } = req.params;
      const user = await User.findOne({ telegramId });

      if (!user) {
        return res.status(404).json({ msg: 'Пользователь с таким Telegram ID не найден' });
      }

      res.json({
        telegramNotificationsEnabled: user.telegramNotificationsEnabled,
      });
    } catch (error) {
      console.error('Ошибка при получении настроек для бота:', error);
      res.status(500).json({ msg: 'Ошибка сервера' });
    }
  });

  // Переключить настройку уведомлений
  router.post('/by-telegram/:telegramId/toggle-notifications', async (req, res) => {
    try {
      const { telegramId } = req.params;
      const user = await User.findOne({ telegramId });

      if (!user) {
        return res.status(404).json({ msg: 'Пользователь с таким Telegram ID не найден' });
      }

      user.telegramNotificationsEnabled = !user.telegramNotificationsEnabled;
      await user.save();

      res.json({
        telegramNotificationsEnabled: user.telegramNotificationsEnabled,
      });
    } catch (error) {
      console.error('Ошибка при переключении настроек для бота:', error);
      res.status(500).json({ msg: 'Ошибка сервера' });
    }
  });

  // --- НОВЫЙ РОУТ ДЛЯ ИНИЦИАЦИИ БАНА ---
  router.post('/:id/initiate-ban', protect, adminOrModerator, [
    param('id').isMongoId().withMessage('Неверный ID пользователя.'),
    body('reason').isString().trim().notEmpty().withMessage('Причина обязательна.'),
    body('duration').optional({ nullable: true }).isNumeric().withMessage('Длительность должна быть числом.'),
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id: targetUserId } = req.params;
    const { reason, duration } = req.body;
    const moderator = req.user;

    try {
      const targetUser = await User.findById(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ msg: 'Пользователь не найден' });
      }

      if (!moderator.telegramId) {
        return res.status(400).json({ msg: 'Ваш аккаунт не привязан к Telegram. Подтверждение невозможно.' });
      }

      const token = crypto.randomBytes(20).toString('hex');
      const actionDetails = {
        action: 'ban_user',
        moderatorId: moderator._id.toString(),
        targetUserId: targetUserId,
        reason,
        duration
      };

      // Сохраняем детали в Redis на 5 минут
      await redis.set(`moderator_action:${token}`, JSON.stringify(actionDetails), 'EX', 300);

      // --- ОТПРАВКА СООБЩЕНИЯ В TELEGRAM ---
      const bot = req.app.get('telegramBot');
      if (!bot) {
        return res.status(500).json({ msg: 'Ошибка сервера: бот не инициализирован.' });
      }

      const text = `Вы действительно хотите забанить пользователя *${targetUser.username}*?\n\n*Причина:* ${reason}\n*Срок:* ${duration ? `${duration} ч.` : 'навсегда'}`;
      const inlineKeyboard = {
        inline_keyboard: [
          [
            { text: '✅ Подтвердить бан', callback_data: `confirm_action:${token}` },
            { text: '❌ Отклонить', callback_data: `deny_action:${token}` }
          ]
        ]
      };

      await bot.sendMessage(moderator.telegramId, text, {
        parse_mode: 'Markdown',
        reply_markup: inlineKeyboard
      });

      res.status(202).json({ msg: 'Запрос на бан отправлен. Ожидается подтверждение в Telegram.' });

    } catch (error) {
      console.error('Ошибка при инициации бана:', error);
      res.status(500).json({ msg: 'Внутренняя ошибка сервера' });
    }
  });

  // --- НОВЫЙ ВНУТРЕННИЙ РОУТ ДЛЯ БАНА (ИСПОЛЬЗУЕТСЯ БОТОМ) ---
  router.post('/:id/ban', internalBotAuth, [
    param('id').isMongoId(),
    body('reason').isString().notEmpty(),
    body('duration').optional({ nullable: true }).isNumeric(),
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ msg: 'Пользователь не найден' });
      }

      user.isBanned = true;
      user.banReason = req.body.reason;
      user.banExpires = req.body.duration ? new Date(Date.now() + req.body.duration * 60 * 60 * 1000) : null;
      
      await user.save();
      res.status(200).json({ msg: `Пользователь ${user.username} забанен.` });
    } catch (error) {
      console.error('Ошибка при бане пользователя (внутренний роут):', error);
      res.status(500).json({ msg: 'Внутренняя ошибка сервера' });
    }
  });

  // --- НОВЫЙ ВНУТРЕННИЙ РОУТ ДЛЯ ПОЛУЧЕНИЯ ДАННЫХ ЮЗЕРА (ИСПОЛЬЗУЕТСЯ БОТОМ) ---
  router.get('/id/:id', internalBotAuth, [
    param('id').isMongoId()
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.params.id).select('username');
      if (!user) {
        return res.status(404).json({ msg: 'Пользователь не найден' });
      }
      res.json(user);
    } catch (error) {
      console.error('Ошибка при получении пользователя по ID (внутренний роут):', error);
      res.status(500).json({ msg: 'Внутренняя ошибка сервера' });
    }
  });

  return router;
};