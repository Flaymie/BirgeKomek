import express from 'express';
import { body, validationResult, param, query } from 'express-validator'; // Добавил query
import User from '../models/User.js';
import { protect, isAdmin, isModOrAdmin } from '../middleware/auth.js';
import Request from '../models/Request.js';
import Message from '../models/Message.js';
import Review from '../models/Review.js';
import Notification from '../models/Notification.js';
import mongoose from 'mongoose';
import { createAndSendNotification } from './notifications.js';
import axios from 'axios'; // <--- Добавляю axios
import redis, { isRedisConnected } from '../config/redis.js'; // <-- ИМПОРТ REDIS
import { generalLimiter } from '../middleware/rateLimiters.js'; // <-- Импортируем

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
  router.put('/me', protect, generalLimiter, async (req, res) => {
    try {
      const { username, email, phone, location, bio, grade, subjects, currentPassword, newPassword } = req.body;
      const userId = req.user.id;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ msg: 'Пользователь не найден' });
      }
      const isEmailChanging = email && email !== user.email;
      if ((isEmailChanging || newPassword) && !currentPassword) {
        return res.status(400).json({ msg: 'Требуется текущий пароль для изменения email или пароля' });
      }
      if (currentPassword) {
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
          return res.status(401).json({ msg: 'Неверный текущий пароль' });
        }
      }
      if (username && username !== user.username) {
        const existingUser = await User.findOne({ username });
        if (existingUser && existingUser._id.toString() !== userId) {
          return res.status(400).json({ msg: 'Имя пользователя уже занято' });
        }
        user.username = username;
      }
      if (isEmailChanging) {
        const existingUser = await User.findOne({ email });
        if (existingUser && existingUser._id.toString() !== userId) {
          return res.status(400).json({ msg: 'Email уже занят' });
        }
        user.email = email;
      }
      if (newPassword) user.password = newPassword;
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

      // 1. "Освободить" заявки, где пользователь был хелпером
      await Request.updateMany(
        { helper: userId, status: { $in: ['assigned', 'in_progress'] } },
        { $set: { status: 'open' }, $unset: { helper: 1 } }
      );

      // 2. Найти и удалить все заявки, созданные пользователем
      const userRequests = await Request.find({ author: userId }).select('_id');
      const requestIds = userRequests.map(r => r._id);

      if (requestIds.length > 0) {
        // Удаляем связанные с этими заявками сообщения и отзывы
        await Message.deleteMany({ requestId: { $in: requestIds } });
        await Review.deleteMany({ requestId: { $in: requestIds } });
        // Удаляем сами заявки
        await Request.deleteMany({ _id: { $in: requestIds } });
      }

      // 3. Удалить отзывы, написанные пользователем о других
      await Review.deleteMany({ reviewerId: userId });
      
      // 4. Удалить все уведомления пользователя
      await Notification.deleteMany({ user: userId });

      // 5. Удалить самого пользователя
      await User.findByIdAndDelete(userId);

      // Можно также добавить логику для удаления аватара из хранилища, если он есть

      res.status(200).json({ msg: 'Аккаунт и все связанные данные были успешно удалены.' });

    } catch (err) {
      console.error('Ошибка при удалении аккаунта:', err);
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
   *     summary: Разбанить пользователя (для админов/модераторов)
   *     tags: [Users, Moderation]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: 'string' }
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
      
      res.json({ msg: 'Пользователь разбанен' });
    } catch (error) {
      console.error('Ошибка при разбане:', error);
      res.status(500).json({ msg: 'Ошибка сервера' });
    }
  });

  /**
   * @swagger
   * /api/users/by-telegram/{id}:
   *   get:
   *     summary: Найти пользователя по Telegram ID
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
   *         description: Информация о пользователе
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 exists:
   *                   type: boolean
   *                 user:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                     username:
   *                       type: string
   *       400:
   *         description: Неверный формат ID
   *       500:
   *         description: Внутренняя ошибка сервера
   */
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

  /**
   * @swagger
   * /api/users/{userId}/set-password:
   *   post:
   *     summary: Установить новый пароль для пользователя (только для админов)
   *     tags: [Users, Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema: { type: 'string' }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [password]
   *             properties:
   *               password: { type: 'string', minLength: 6 }
   *     responses:
   *       200: { description: 'Пароль успешно обновлен' }
   *       400: { description: 'Пароль слишком короткий' }
   *       403: { description: 'Недостаточно прав' }
   *       404: { description: 'Пользователь не найден' }
   */
  router.post('/:userId/set-password', protect, isAdmin, async (req, res) => {
    const { password } = req.body;
    const { userId } = req.params;

    if (!password || password.length < 6) {
      return res.status(400).json({ msg: 'Пароль должен содержать не менее 6 символов.' });
    }

    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ msg: 'Пользователь не найден.' });
      }

      user.password = password;
      user.hasPassword = true; // На случай, если пароля не было
      await user.save();

      res.json({ msg: `Пароль для пользователя ${user.username} успешно обновлен.` });

    } catch (error) {
      console.error('Ошибка при сбросе пароля админом:', error);
      res.status(500).json({ msg: 'Ошибка сервера' });
    }
  });

  return router;
};