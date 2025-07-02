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
import tgRequired from '../middleware/tgRequired.js'; // ИМПОРТ
import crypto from 'crypto'; // <-- ИМПОРТ ДЛЯ ГЕНЕРАЦИИ КОДА

const router = express.Router();

// --- НОВЫЙ ХЕЛПЕР ДЛЯ ОТПРАВКИ СООБЩЕНИЙ В TELEGRAM ---
export const sendTelegramMessage = async (telegramId, message) => {
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
      const user = await User.findById(req.user.id)
        .select('-password')
        .populate('banDetails.bannedBy', 'username');
        
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
   *                 description: Текущий пароль (обязателен для смены пароля)
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
      const { username, phone, location, bio, grade, subjects, currentPassword, newPassword } = req.body;
      const userId = req.user.id;
      const user = await User.findById(userId).select('+password');

      if (!user) {
        return res.status(404).json({ msg: 'Пользователь не найден' });
      }

      // --- НОВАЯ, ПРАВИЛЬНАЯ ПРОВЕРКА ПАРОЛЯ ---
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ 
            errors: [{ msg: 'Текущий пароль обязателен для установки нового пароля.' }] 
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
   * /api/users/me/customization:
   *   put:
   *     summary: Обновить настройки кастомизации профиля
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
   *               colors:
   *                 type: object
   *               icon:
   *                 type: object
   *     responses:
   *       200:
   *         description: Настройки успешно обновлены
   *       400:
   *         description: Некорректные данные
   *       401:
   *         description: Не авторизован
   *       403:
   *         description: Доступ запрещен (не админ/модератор)
   */
  router.put('/me/customization', protect, isModOrAdmin, async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ msg: 'Пользователь не найден' });
      }

      const { colors, icon } = req.body;

      // Обновляем только те поля, которые были переданы
      if (colors) {
        user.profileCustomization.colors = {
          ...user.profileCustomization.colors,
          ...colors
        };
      }
      if (icon) {
        user.profileCustomization.icon = {
          ...user.profileCustomization.icon,
          ...icon
        };
      }
      
      await user.save();
      
      const updatedUser = user.toObject();
      delete updatedUser.password;

      res.json(updatedUser);

    } catch (err) {
      console.error('Ошибка при обновлении кастомизации профиля:', err);
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
   *     summary: Забанить пользователя (для модераторов и администраторов)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               reason:
   *                 type: string
   *               duration:
   *                 type: string
   *                 description: "Срок бана, например '7d', '1M', 'permanent'"
   *               confirmationCode:
   *                 type: string
   *                 description: "6-значный код подтверждения из Telegram (если требуется)"
   *     responses:
   *       200:
   *         description: Пользователь успешно забанен
   *       400:
   *         description: "Неверный запрос, или требуется код подтверждения"
   *       403:
   *         description: "Нет прав, или попытка забанить админа"
   */
  router.post('/:id/ban', protect, isModOrAdmin, [
    param('id').isMongoId().withMessage('Неверный ID пользователя.'),
    body('reason').notEmpty().withMessage('Причина бана обязательна.'),
    body('duration').notEmpty().withMessage('Срок бана обязателен.'),
    body('confirmationCode').optional().isString().isLength({ min: 6, max: 6 }),
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { reason, duration, confirmationCode } = req.body;
      const targetUserId = req.params.id;
      const moderator = req.user; // Это наш модератор или админ из токена

      const userToBan = await User.findById(targetUserId);
      if (!userToBan) {
        return res.status(404).json({ msg: 'Пользователь не найден.' });
      }

      // --- ИСПРАВЛЕННАЯ ЛОГИКА ПРОВЕРКИ ПРАВ ---
      const isModeratorAdmin = moderator.roles && moderator.roles.admin;
      const isTargetAdmin = userToBan.roles && userToBan.roles.admin;
      const isTargetModerator = userToBan.roles && userToBan.roles.moderator;

      // 1. Никто не может забанить админа
      if (isTargetAdmin) {
        return res.status(403).json({ msg: 'Администраторов нельзя заблокировать.' });
      }
      // 2. Модератор не может забанить другого модератора. Только админ может.
      if (isTargetModerator && !isModeratorAdmin) {
        return res.status(403).json({ msg: 'Модератор не может заблокировать другого модератора.' });
      }
      
      // --- НОВАЯ ЛОГИКА 2FA ---
      
      // Админы могут банить без 2FA
      if (!isModeratorAdmin) {
        if (!moderator.telegramId) {
            return res.status(403).json({ msg: 'Для выполнения этого действия ваш аккаунт должен быть привязан к Telegram.' });
        }
        
        const redisKey = `mod-action:ban:${moderator.id}:${targetUserId}`;
        
        if (!confirmationCode) {
            // Этап 1: Кода нет, генерируем и отправляем
            const code = crypto.randomInt(100000, 999999).toString();
            await redis.set(redisKey, code, 'EX', 300); // Код живет 5 минут

            const message = `Для подтверждения бана пользователя **${userToBan.username}** введите этот код:\n\n` +
                            `\`${code}\`\n\n` +
                            `Если это были не вы, срочно смените пароль и обратитесь к администрации.`;
            await sendTelegramMessage(moderator.telegramId, message);

            return res.status(400).json({ 
                confirmationRequired: true,
                message: 'Требуется подтверждение. Код отправлен вам в Telegram.' 
            });
        } else {
            // Этап 2: Код есть, проверяем
            const storedCode = await redis.get(redisKey);
            if (storedCode !== confirmationCode) {
                return res.status(400).json({ msg: 'Неверный код подтверждения.' });
            }
            // Код верный, удаляем его, чтобы нельзя было использовать повторно
            await redis.del(redisKey);
        }
      }

      // --- ОСНОВНАЯ ЛОГИКА БАНА ---
      userToBan.banDetails.isBanned = true;
      userToBan.banDetails.reason = reason;
      userToBan.banDetails.bannedBy = moderator.id;
      
      let expiresAt = null;
      if (duration !== 'permanent') {
        const durationStr = String(duration).trim();
        const unit = durationStr.slice(-1);
        const isLetter = /[a-zA-Z]/.test(unit);
        
        const date = new Date();
        let value;
        let finalUnit;

        if (isLetter) {
            value = parseInt(durationStr.slice(0, -1), 10);
            finalUnit = unit;
        } else {
            value = parseInt(durationStr, 10);
            finalUnit = 'd'; // По умолчанию дни, если пришло просто число
        }

        if (isNaN(value) || value <= 0) {
          return res.status(400).json({ msg: 'Неверный формат или значение срока блокировки. Укажите положительное число.' });
        }

        switch (finalUnit) {
          case 'h':
            date.setHours(date.getHours() + value);
            break;
          case 'd':
            date.setDate(date.getDate() + value);
            break;
          case 'M':
            date.setMonth(date.getMonth() + value);
            break;
          case 'y':
            date.setFullYear(date.getFullYear() + value);
            break;
          default:
            return res.status(400).json({ msg: `Неизвестная единица измерения: '${finalUnit}'. Используйте h, d, M, y.` });
        }
        expiresAt = date;
      }
      userToBan.banDetails.expiresAt = expiresAt;
      userToBan.banDetails.bannedAt = new Date();

      await userToBan.save();

      // Отправляем уведомление забаненному
      await createAndSendNotification(
          req.app.locals.sseConnections, // Передаем sseConnections
          userToBan._id,
          'account_banned',
          `Ваш аккаунт был заблокирован. Причина: ${reason}. Срок: ${duration === 'permanent' ? 'навсегда' : expiresAt.toLocaleDateString('ru-RU')}.`,
          `/profile/${userToBan.username}`
      );

      res.json({ msg: `Пользователь ${userToBan.username} успешно забанен.` });

    } catch (err) {
      console.error(err.message);
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

  return router;
};