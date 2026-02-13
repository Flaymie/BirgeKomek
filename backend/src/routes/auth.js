import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import uploadAvatar from '../middleware/uploadMiddleware.js';
import crypto from 'crypto';
import { protect } from '../middleware/auth.js';
import { generalLimiter, registrationLimiter } from '../middleware/rateLimiters.js';
import axios from 'axios';
import { createAndSendNotification } from './notifications.js';
import { generateAvatar } from '../utils/avatarGenerator.js';
import LinkToken from '../models/LinkToken.js';
import { analyzeIp } from '../services/ipAnalysisService.js';
import { calculateRegistrationScore } from '../services/scoringService.js';
import SystemReport from '../models/SystemReport.js';
import BlockedIP from '../models/BlockedIP.js';
import { uploadToCloudinary } from '../utils/cloudinaryUpload.js';
import {
  isIPTrusted,
  addTrustedIP,
  generateVerificationCode,
  saveVerificationCode,
  verifyCode,
  isIPBlocked,
  canResendCode,
  incrementResendCount,
  clearBlockedIPsCache
} from '../utils/sessionManager.js';
import { sendTelegramMessage } from './users.js';
import checkBlockedIP from '../middleware/checkIP.js';

const router = express.Router();

// Список запрещенных имен пользователей
const RESERVED_USERNAMES = [
  'admin', 'administrator', 'moderator', 'moder', 'support', 'root', 'system', 'api', 'backend', 'auth', 'login', 'logout', 'register',
  'info', 'contact', 'help', 'api', 'bot', 'owner', 'creator', 'sudo', 'undefined', 'NaN', 'true', 'false', 'me', 'profile', 'user',
  'birge', 'komek', 'birgekomek', 'guest', 'user', 'dev', 'developer', 'sysadmin', 'telegram', 'tg_bot', 'null', 'test', 'anonymous',
  'хелпер', 'админ', 'модератор', 'саппорт', 'поддержка', 'помощь'
];

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Регистрация нового пользователя
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Уникальное имя пользователя
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Пароль пользователя (мин. 6 символов)
 *               roles:
 *                 type: object
 *                 properties:
 *                   student:
 *                     type: boolean
 *                     default: true
 *                   helper:
 *                     type: boolean
 *                     default: false
 *               grade:
 *                 type: integer
 *                 minimum: 7
 *                 maximum: 11
 *                 description: Класс ученика (7-11)
 *               avatar:
 *                 type: string
 *                 description: URL аватара пользователя (опционально)
 *     responses:
 *       201:
 *         description: Пользователь успешно зарегистрирован
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT токен для авторизации
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *       400:
 *         description: Некорректные данные или пользователь уже существует
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post('/register', checkBlockedIP, registrationLimiter,
  uploadAvatar,
  [
    body('username')
      .trim()
      .not().isEmpty().withMessage('Имя пользователя обязательно')
      .isLength({ min: 3, max: 10 }).withMessage('Имя пользователя должно быть от 3 до 10 символов')
      .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Имя пользователя может содержать только латинские буквы, цифры, дефис и подчеркивания')
      .custom(value => {
        const lowerCaseValue = value.toLowerCase();
        // Проверяем точное совпадение с зарезервированными именами
        const isReserved = RESERVED_USERNAMES.includes(lowerCaseValue);
        if (isReserved) {
          return Promise.reject('Это имя пользователя зарезервировано системой.');
        }
        return true;
      }),

    body('password')
      .trim()
      .isLength({ min: 6 }).withMessage('Пароль должен быть минимум 6 символов'),

    body('grade')
      .optional()
      .isIn(['7', '8', '9', '10', '11', 'student', 'adult'])
      .withMessage('Класс/статус должен быть: 7-11, student или adult'),
    body('helperSubjects')
      .optional()
      .isArray().withMessage('helperSubjects должен быть массивом')
      .custom((subjects) => !subjects.some(s => typeof s !== 'string' || s.trim() === ''))
      .withMessage('Все предметы в helperSubjects должны быть непустыми строками'),
    body('role', 'Роль обязательна').isIn(['student', 'helper']),
    body('subjects').optional().custom((value) => {
      try {
        const subjects = JSON.parse(value);
        if (!Array.isArray(subjects) || subjects.some(s => typeof s !== 'string')) {
          throw new Error('Предметы должны быть массивом строк.');
        }
        return true;
      } catch (e) {
        if (Array.isArray(value)) return true;
        throw new Error('Некорректный формат предметов.');
      }
    }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, grade, role } = req.body;
    let { subjects } = req.body;

    if (subjects && typeof subjects === 'string') {
      try {
        subjects = JSON.parse(subjects);
      } catch (e) {
        return res.status(400).json({ msg: 'Некорректный формат предметов (ошибка JSON)' });
      }
    }

    try {
      const lowerCaseUsername = username.toLowerCase();

      // --- ПЕРЕНОСИМ ПРОВЕРКИ В НАЧАЛО ---
      let user = await User.findOne({ username: lowerCaseUsername });
      if (user) {
        return res.status(400).json({ msg: 'Пользователь с таким именем уже существует' });
      }
      // Тут можно добавить и другие проверки, например, на схожесть имен и т.д.
      // --- КОНЕЦ ПРОВЕРОК ---

      let avatarUrl = '';
      if (req.file) {
        // Загружаем файл в Cloudinary
        const cloudinaryResult = await uploadToCloudinary(req.file.path, 'birgekomek/avatars', 'image');
        avatarUrl = cloudinaryResult.url;
      } else {
        avatarUrl = generateAvatar(username);
      }

      const newUser = {
        username,
        password,
        hasPassword: true,
        roles: {
          student: role === 'student',
          helper: role === 'helper',
        },
        avatar: avatarUrl,
      };

      if (role === 'student') {
        if (!grade) {
          return res.status(400).json({ msg: 'Класс обязателен для ученика' });
        }
        newUser.grade = grade;
      }

      if (role === 'helper') {
        if (grade) {
          newUser.grade = grade;
        }
        if (subjects && subjects.length > 0) {
          newUser.subjects = subjects;
        } else {
          newUser.subjects = [];
        }
      }

      user = new User(newUser);

      const ip = req.headers['x-test-ip'] || req.ip;
      const ipInfo = await analyzeIp(ip);

      if (ipInfo) {
        user.registrationDetails = {
          ip: ip,
          ipInfo: {
            country: ipInfo.country,
            city: ipInfo.city,
            isHosting: ipInfo.hosting,
            isProxy: ipInfo.proxy,
          }
        };
      }

      const { score, log } = calculateRegistrationScore(user);

      if (score > 0) {
        user.suspicionScore = score;
        user.suspicionLog = log;
      }

      await user.save(); // Первичное сохранение со всеми данными

      if (score >= 51) {
        const banExpires = new Date();
        banExpires.setDate(banExpires.getDate() + 7);

        user.banDetails = {
          isBanned: true,
          reason: 'Автоматический бан: высокий уровень подозрительности при регистрации.',
          bannedAt: new Date(),
          expiresAt: banExpires,
          bannedBy: null,
        };

        await user.save();

        return res.status(403).json({
          msg: 'Ваша регистрация не может быть завершена из-за срабатывания автоматической системы защиты. Пожалуйста, свяжитесь с поддержкой.',
          code: 'AUTO_BAN_ON_REGISTRATION'
        });
      }

      if (score >= 21) {
        await SystemReport.create({
          targetUser: user._id, // Теперь user._id 100% существует
          type: 'suspicion_registration',
          details: {
            score,
            log,
            ip: user.registrationDetails.ip
          }
        });
      }

      // Повторное сохранение не нужно, так как репорт не меняет юзера
      // await user.save();

      const payload = {
        user: {
          id: user.id,
          roles: user.roles
        }
      };

      const token = jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Получаем полные данные пользователя без пароля
      const userWithoutPassword = await User.findById(user._id).select('-password');

      res.status(201).json({
        token,
        user: userWithoutPassword
      });

    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: 'Что-то сломалось при регистрации' });
    }
  }
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Авторизация пользователя
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Имя пользователя
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Успешная авторизация
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT токен для авторизации
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *       401:
 *         description: Неверные учетные данные
 *       500:
 *         description: Внутренняя ошибка сервера
 */
// логин
router.post('/login', checkBlockedIP, generalLimiter, [
  body('username', 'Введите имя пользователя').not().isEmpty(),
  body('password', 'Пароль обязателен').exists(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;

  try {
    const identifier = username.toLowerCase();

    let user = await User.findOne({ username: identifier }).select('+password +hasPassword');

    if (!user) {
      return res.status(400).json({ msg: 'Неверные учетные данные' });
    }

    if (!user.hasPassword) {
      return res.status(400).json({
        msg: 'У вас не установлен пароль. Возможно, вы регистрировались через Telegram? Пожалуйста, войдите через Telegram или воспользуйтесь функцией "Забыли пароль", чтобы установить его.',
        noPasswordSet: true,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ msg: 'Неверные учетные данные' });
    }

    // Пользователь аутентифицирован, теперь генерируем токен
    const payload = {
      user: {
        id: user.id,
        roles: user.roles,
      },
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Обновляем lastSeen
    user.lastSeen = Date.now();

    // Проверяем IP и добавляем в доверенные если нужно
    const currentIP = req.headers['x-test-ip'] || req.ip;
    const userAgent = req.headers['user-agent'] || '';

    // Если это первый вход (основной IP при регистрации)
    if (user.registrationDetails?.ip && !user.trustedIPs) {
      user.trustedIPs = [];
    }

    // Проверяем, доверенный ли IP
    let isTrusted = isIPTrusted(user, currentIP);

    // Если у пользователя НЕТ Telegram, автоматически доверяем IP
    if (!user.telegramId && !isTrusted) {
      user.trustedIPs.push({
        ip: currentIP,
        userAgent: userAgent,
        addedAt: new Date()
      });
      isTrusted = true;
    }

    // Если IP новый И есть Telegram - отправляем КОД подтверждения
    if (!isTrusted && user.telegramId) {
      const ipInfo = await analyzeIp(currentIP);
      const location = ipInfo ? `${ipInfo.city}, ${ipInfo.country}` : 'Unknown';

      // Генерируем код подтверждения
      const code = generateVerificationCode();
      saveVerificationCode(user._id.toString(), currentIP, code, true); // true = новый вход, сбрасываем таймеры

      const message = `🔐 *Подтверждение нового IP адреса*\n\n` +
        `Обнаружен вход с нового IP: \`${currentIP}\`\n` +
        `Локация: ${location}\n\n` +
        `Ваш код подтверждения: \`${code}\`\n\n` +
        `⚠️ Никому не сообщайте этот код!\n` +
        `Если это были не вы, срочно смените пароль!`;

      try {
        await sendTelegramMessage(user.telegramId, message);
      } catch (err) {
        console.error('Ошибка отправки кода:', err);
      }
    }

    await user.save();

    // Получаем полные данные пользователя без пароля
    const userWithoutPassword = await User.findById(user._id).select('-password');

    res.json({
      token,
      user: userWithoutPassword,
      requireIPVerification: !isTrusted,
      currentIP
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Ошибка сервера');
  }
});

/**
 * @swagger
 * /api/auth/check-username:
 *   post:
 *     summary: Проверить доступность имени пользователя
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username: { type: 'string' }
 *     responses:
 *       200:
 *         description: Возвращает true, если имя доступно
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 available: { type: 'boolean' }
 */
router.post('/check-username', [
  body('username').trim().notEmpty().withMessage('Имя пользователя не может быть пустым')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const username = req.body.username.toLowerCase();

    // Проверяем точное совпадение с зарезервированными именами
    const isReserved = RESERVED_USERNAMES.includes(username);
    if (isReserved) {
      return res.json({ available: false, message: 'Это имя пользователя зарезервировано системой.' });
    }

    const user = await User.findOne({ username });
    res.json({ available: !user });
  } catch (e) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /api/auth/telegram/generate-token:
 *   post:
 *     summary: Сгенерировать временный токен для входа через Telegram
 *     description: Создает уникальный токен, который можно использовать для генерации QR-кода или ссылки для входа через Telegram.
 *     tags: [Telegram]
 *     responses:
 *       200:
 *         description: Успешно сгенерированный токен.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 loginToken:
 *                   type: string
 *                   example: "a1b2c3d4e5f6..."
 *       500:
 *         description: Ошибка сервера при генерации токена.
 */
router.post('/telegram/generate-token', checkBlockedIP, generalLimiter, (req, res) => {
  try {
    const token = crypto.randomBytes(20).toString('hex');

    const { loginTokens } = req.app.locals;
    loginTokens.set(token, { status: 'pending', userId: null, expires: Date.now() + 3 * 60 * 1000 });

    res.json({ loginToken: token });
  } catch (error) {
    console.error('Ошибка генерации токена для входа:', error);
    res.status(500).send('Ошибка сервера');
  }
});

/**
 * @swagger
 * /api/auth/telegram/check-token/{token}:
 *   get:
 *     summary: Проверить статус токена для входа (для поллинга)
 *     description: Позволяет фронтенду периодически проверять, был ли токен активирован в Telegram.
 *     tags: [Telegram]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Токен для входа, полученный от /generate-token.
 *     responses:
 *       200:
 *         description: Статус токена. Если 'completed', то в ответе также будут JWT-токен и данные пользователя.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [pending, completed, error]
 *                 token:
 *                   type: string
 *                   description: "JWT-токен (только при status: 'completed')."
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       404:
 *         description: Токен не найден.
 *       410:
 *         description: Срок действия токена истек.
 *       500:
 *         description: Внутренняя ошибка сервера.
 */
router.get('/telegram/check-token/:token', generalLimiter, async (req, res) => {
  const { token } = req.params;
  const { loginTokens } = req.app.locals;
  const tokenData = loginTokens.get(token);

  if (!tokenData) {
    return res.status(404).json({ status: 'invalid', message: 'Токен не найден или истек' });
  }

  if (Date.now() > tokenData.expires) {
    loginTokens.delete(token);
    return res.status(410).json({ status: 'expired', message: 'Срок действия токена истек' });
  }

  if (tokenData.status === 'completed' && tokenData.userId) {
    try {
      const user = await User.findById(tokenData.userId).select('-password');
      if (!user) {
        return res.status(404).json({ status: 'error', message: 'Пользователь не найден' });
      }

      // Если это первый вход после регистрации через Telegram (IP = 'telegram-bot'), обновляем IP
      if (user.registrationDetails?.ip === 'telegram-bot') {
        const ip = req.headers['x-test-ip'] || req.ip;
        const { analyzeIp } = await import('../services/ipAnalysisService.js');
        const ipInfo = await analyzeIp(ip);

        if (ipInfo) {
          user.registrationDetails.ip = ip;
          user.registrationDetails.ipInfo = {
            country: ipInfo.country,
            city: ipInfo.city,
            isHosting: ipInfo.hosting,
            isProxy: ipInfo.proxy,
          };

          // Пересчитываем suspicion score с реальным IP
          const { calculateRegistrationScore } = await import('../services/scoringService.js');
          const { score, log } = calculateRegistrationScore(user);
          user.suspicionScore = score;
          user.suspicionLog = log;
        }
      }

      // --- ФИКС ДЛЯ 403 ERROR --- 
      // Поскольку вход через Telegram считается подтвержденным (2FA), 
      // мы должны ДОВЕРИТЬ текущему IP, с которого происходит поллинг (браузер клиента).
      const currentIP = req.headers['x-test-ip'] || req.ip;
      const { isIPTrusted, addTrustedIP } = await import('../utils/sessionManager.js'); // Динамический импорт, чтобы избежать циклов, если они есть, или просто использовать утилиту

      // Если IP еще не доверенный, добавляем его
      if (!isIPTrusted(user, currentIP)) {
        const userAgent = req.headers['user-agent'] || '';
        // Можно попробовать определить локацию, но это асинхронно и может занять время. 
        // Для скорости просто добавим Unknown или попробуем быстро определить.
        // Лучше использовать существующую утилиту addTrustedIP (она сама сохраняет user)
        await addTrustedIP(user, currentIP, userAgent, 'Verified via Telegram Login');
      } else {
        // Если IP доверенный, но мы всё равно хотим обновить lastSeen или что-то такое, можно просто save.
        // Но addTrustedIP делает save внутри. 
        // Если не вызывали addTrustedIP, то сохраним изменения (если были выше)
        await user.save();
      }

      const jwtToken = jwt.sign(
        {
          user: {
            id: user._id,
            roles: user.roles
          }
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      loginTokens.delete(token);

      return res.json({ status: 'completed', token: jwtToken, user });

    } catch (error) {
      console.error('Ошибка при поиске пользователя или генерации JWT:', error);
      return res.status(500).json({ status: 'error', message: 'Внутренняя ошибка сервера' });
    }
  }

  res.json({ status: tokenData.status });
});

/**
 * @swagger
 * /api/auth/telegram/register:
 *   post:
 *     summary: Регистрация или вход пользователя через Telegram-бота (внутренний)
 *     description: "ВНИМАНИЕ: Этот эндпоинт предназначен для вызова только вашим Telegram-ботом. Он не должен быть доступен публично. Убедитесь, что вы защитили его, например, секретным ключом в заголовках."
 *     tags: [Telegram, Internal]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role: { type: 'string', enum: ['student', 'helper'] }
 *               grade: { type: 'integer' }
 *               subjects: { type: 'array', items: { type: 'string' } }
 *               phone: { type: 'string', description: 'Номер телефона, полученный от Telegram' }
 *               telegramId: { type: 'number' }
 *               username: { type: 'string' }
 *               firstName: { type: 'string' }
 *               lastName: { type: 'string' }
 *     responses:
 *       200:
 *         description: Пользователь с таким Telegram ID уже существует.
 *       201:
 *         description: Новый пользователь успешно создан.
 *       400:
 *         description: Некорректные данные или email/username уже заняты.
 *       500:
 *         description: Ошибка сервера.
 */
router.post('/telegram/register', checkBlockedIP, async (req, res) => {
  try {
    const {
      role,
      grade,
      subjects,
      phone,
      telegramId,
      username,
      firstName,
      lastName
    } = req.body;
    // Логика регистрации через тг бота


    // 1. Проверяем, что ID телеграма есть
    if (!telegramId) {
      return res.status(400).json({ msg: 'Необходим ID пользователя Telegram' });
    }

    // 2. ИЩЕМ ПОЛЬЗОВАТЕЛЯ ПО TELEGRAM ID
    const existingUserByTgId = await User.findOne({ telegramId });
    if (existingUserByTgId) {
      // Если юзер уже есть - просто возвращаем его ID, НИЧЕГО НЕ МЕНЯЕМ
      return res.status(200).json({ userId: existingUserByTgId._id, message: 'Пользователь уже существует.' });
    }

    // 3. Проверяем, что все нужные данные для НОВОГО юзера есть
    if (!role || !username) {
      return res.status(400).json({ msg: 'Не хватает данных для регистрации нового пользователя.' });
    }

    // 4. Проверяем, не занят ли username
    const existingUserByUsername = await User.findOne({ username: username.toLowerCase() });
    if (existingUserByUsername) {
      return res.status(400).json({ msg: `Имя пользователя '${username}' уже занято.` });
    }

    // 5. Создаем нового пользователя
    const newUser = new User({
      username,
      phone,
      firstName,
      lastName,
      telegramId,
      telegramUsername: username,
      hasPassword: false,
      roles: {
        student: role === 'student',
        helper: role === 'helper',
      },
      grade: grade || undefined,
      subjects: subjects || [],
      isVerified: true, // Считаем верифицированным, раз пришел из телеги
      registrationDetails: {
        ip: 'telegram-bot',
        ipInfo: {
          country: 'Unknown',
          city: 'Telegram Registration',
          isHosting: false,
          isProxy: false,
        }
      },
      suspicionScore: 0,
      suspicionLog: [{
        reason: 'Регистрация через Telegram бота',
        points: 0,
        timestamp: new Date()
      }]
    });

    await newUser.save();

    // 7. Генерируем JWT токен для авто-логина (он здесь не используется ботом, но почему бы и да)
    const jwtToken = jwt.sign(
      {
        user: {
          id: newUser._id,
          roles: newUser.roles
        }
      },
      process.env.JWT_SECRET,
      { expiresIn: '5m' }
    );

    // Отправляем ID нового юзера, чтобы бот мог его использовать
    res.status(201).json({ userId: newUser._id, token: jwtToken });

  } catch (error) {
    console.error('Ошибка регистрации через Telegram:', error.message);
    if (error.code === 11000) {
      return res.status(400).json({ msg: `Имя пользователя уже занято.` });
    }
    res.status(500).json({ msg: 'Ошибка на сервере' });
  }
});

/**
 * @swagger
 * /api/auth/telegram/complete-login:
 *   post:
 *     summary: Связать токен входа с пользователем из Telegram (внутренний)
 *     description: "ВНИМАНИЕ: Этот эндпоинт предназначен для вызова только Telegram-ботом и только после того, как пользователь подтвердил вход."
 *     tags: [Telegram, Internal]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [loginToken, telegramId]
 *             properties:
 *               loginToken: { type: 'string' }
 *               telegramId: { type: 'number' }
 *               userId: { type: 'string', description: 'ID пользователя в MongoDB (если он уже известен боту)' }
 *     responses:
 *       200:
 *         description: Аккаунт успешно привязан к сессии входа.
 *       400:
 *         description: Отсутствует токен или ID.
 *       404:
 *         description: Сессия входа или пользователь не найдены.
 *       500:
 *         description: Ошибка сервера.
 */
router.post('/telegram/complete-login', async (req, res) => {
  const { loginToken, telegramId, userId } = req.body;
  const { loginTokens } = req.app.locals;

  if (!loginToken || !telegramId) {
    return res.status(400).json({ msg: 'Отсутствует токен или ID телеграма' });
  }

  const tokenData = loginTokens.get(loginToken);
  if (!tokenData) {
    return res.status(404).json({ msg: 'Сессия для входа не найдена или истекла.' });
  }

  try {
    let finalUserId = userId;

    if (!finalUserId) {
      const user = await User.findOne({ telegramId });
      if (!user) {
        // Если пользователь не найден, отправляем команду на регистрацию
        return res.status(404).json({
          action: 'register',
          msg: 'Вы не зарегистрированы. Давайте начнем регистрацию прямо здесь!'
        });
      }
      finalUserId = user._id;
    }

    tokenData.status = 'completed';
    tokenData.userId = finalUserId;
    loginTokens.set(loginToken, tokenData);

    res.status(200).json({ msg: 'Вход подтвержден! Можете возвращаться на сайт, вы уже вошли в систему.' });

  } catch (error) {
    console.error('Ошибка при завершении входа через Telegram:', error);
    res.status(500).json({ msg: 'Ошибка сервера' });
  }
});
/**
 * @swagger
 * /api/auth/generate-link-token:
 *   post:
 *     summary: Создать токен для привязки Telegram аккаунта
 *     description: Генерирует одноразовый токен, который пользователь должен отправить боту для привязки своего аккаунта.
 *     tags: [Telegram]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Успешно сгенерированный токен.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 linkToken:
 *                   type: string
 *                   example: "link_a1b2c3d4e5f6..."
 *       401:
 *         description: Не авторизован.
 *       500:
 *         description: Ошибка сервера.
 */
router.post('/generate-link-token', protect, generalLimiter, async (req, res) => {
  try {
    const linkToken = `link_${crypto.randomBytes(15).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 минут

    await LinkToken.create({
      token: linkToken,
      userId: req.user.id,
      expiresAt
    });

    res.json({ linkToken });

  } catch (error) {
    console.error('Ошибка генерации токена для привязки:', error);
    res.status(500).send('Ошибка сервера');
  }
});

/**
 * @swagger
 * /api/auth/check-link-status/{token}:
 *   get:
 *     summary: Проверить статус токена привязки Telegram
 *     description: Позволяет фронтенду периодически проверять, была ли привязка завершена в боте.
 *     tags: [Telegram]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Токен привязки, полученный от /generate-link-token.
 *     responses:
 *       200:
 *         description: Статус токена привязки.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [pending_link, linked]
 *       403:
 *         description: Доступ запрещен (попытка проверить чужой токен).
 *       404:
 *         description: Токен не найден.
 */
router.get('/check-link-status/:token', protect, generalLimiter, async (req, res) => {
  const { token } = req.params;

  // Ищем токен в базе
  const tokenData = await LinkToken.findOne({ token, expiresAt: { $gt: new Date() } });
  if (!tokenData) {
    return res.status(404).json({ msg: 'Токен не найден или истек.' });
  }

  if (tokenData.status === 'linked') {
    // Находим пользователя по ID, который был сохранен в токене
    const user = await User.findById(tokenData.userId);
    if (!user) {
      return res.status(404).json({ msg: 'Связанный пользователь не найден.' });
    }

    await tokenData.deleteOne();

    return res.json({ status: 'linked', user });
  } else {
    return res.json({ status: tokenData.status });
  }
});

/**
 * @swagger
 * /api/auth/telegram/unlink:
 *   post:
 *     summary: Отвязать Telegram от аккаунта
 *     description: Удаляет связь между аккаунтом на сайте и Telegram. Если у юзера нет пароля, телеграм отвязать НЕЛЬЗЯ.
 *     tags: [Telegram]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Telegram успешно отвязан.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg: { type: 'string' }
 *                 user: { $ref: '#/components/schemas/User' }
 *       403:
 *         description: Попытка отвязать Telegram без установленного пароля.
 *       404:
 *         description: Пользователь не найден.
 *       500:
 *         description: Ошибка сервера.
 */
router.post('/telegram/unlink', protect, generalLimiter, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'Пользователь не найден' });
    }

    // ПРОВЕРКА: если нет пароля, не даем отвязать телегу
    if (!user.password && user.hasPassword === false) {
      return res.status(403).json({
        msg: 'Нельзя отвязать Telegram, так как у вас не установлен пароль. Сначала установите пароль в профиле.'
      });
    }

    user.telegramId = undefined;
    user.telegramUsername = undefined;
    user.telegramNotificationsEnabled = undefined;

    await user.save();

    await createAndSendNotification(req.app.locals.sseConnections, {
      user: req.user.id,
      type: 'security_alert',
      title: 'Telegram отвязан',
      message: 'Ваш аккаунт был отвязан от Telegram.',
      link: '/profile/me'
    });

    // Отправляем обновление профиля через Socket.IO в реал-тайме
    const { io } = req.app.locals;
    if (io) {
      io.to(`user_${req.user.id}`).emit('profile_updated', {
        telegramId: undefined,
        telegramUsername: undefined,
        telegramNotificationsEnabled: undefined
      });
    }

    const updatedUser = user.toObject();
    delete updatedUser.password;

    res.json({ msg: 'Telegram успешно отвязан', user: updatedUser });
  } catch (error) {
    console.error('Ошибка при отвязке Telegram:', error);
    res.status(500).json({ msg: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /api/auth/finalizelink:
 *   post:
 *     summary: Завершить привязку Telegram (внутренний)
 *     description: "ВНИМАНИЕ: Этот эндпоинт предназначен для вызова только Telegram-ботом и только после того, как пользователь отправил ему токен привязки."
 *     tags: [Telegram, Internal]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [loginToken, telegramId]
 *             properties:
 *               loginToken: { type: 'string' }
 *               telegramId: { type: 'number' }
 *               telegramUsername: { type: 'string' }
 *               phone: { type: 'string', description: 'Номер телефона, полученный от Telegram' }
 *     responses:
 *       200:
 *         description: Аккаунт успешно привязан.
 *       400:
 *         description: Отсутствует токен или ID.
 *       404:
 *         description: Токен не найден или недействителен.
 *       409:
 *         description: Этот аккаунт Telegram уже привязан к другому профилю.
 *       410:
 *         description: Срок действия токена истек.
 *       500:
 *         description: Ошибка сервера.
 */
router.post('/finalizelink', async (req, res) => {
  const { linkToken, telegramId, telegramUsername, phone } = req.body;

  if (!linkToken || !telegramId) {
    return res.status(400).json({ msg: 'Отсутствует токен или ID телеграма' });
  }

  // Ищем токен в монге
  const tokenData = await LinkToken.findOne({
    token: linkToken,
    expiresAt: { $gt: new Date() }
  });

  if (!tokenData) {
    return res.status(404).json({ msg: 'Токен для привязки не найден или недействителен' });
  }

  try {
    const existingTelegramUser = await User.findOne({ telegramId: String(telegramId) });
    if (existingTelegramUser && existingTelegramUser._id.toString() !== tokenData.userId) {
      return res.status(409).json({ msg: 'Этот аккаунт Telegram уже привязан к другому профилю.' });
    }

    const userToUpdate = await User.findById(tokenData.userId);
    if (!userToUpdate) {
      return res.status(404).json({ msg: 'Пользователь для привязки не найден.' });
    }

    // Обновляем только ID, а не username, чтобы ничего не сломать
    userToUpdate.telegramId = String(telegramId);
    if (telegramUsername) { // Сохраним, только если он есть
      userToUpdate.telegramUsername = telegramUsername;
    }
    if (phone) { // Сохраняем телефон, если он был передан(надеюсь, что он будет передан)
      userToUpdate.phone = phone;
    }
    await userToUpdate.save();

    // Удаляем токен из базы после использования
    await tokenData.deleteOne();

    // Уведомление о привязке телеграма
    await createAndSendNotification(req.app.locals.sseConnections, {
      user: userToUpdate._id,
      type: 'security_alert',
      title: 'Telegram успешно привязан',
      message: `Ваш аккаунт был успешно привязан к Telegram${telegramUsername ? ' @' + telegramUsername : ''}.`,
      link: '/profile/me'
    });

    // Отправляем обновление профиля через Socket.IO в реал-тайме
    const { io } = req.app.locals;
    if (io) {
      io.to(`user_${userToUpdate._id}`).emit('profile_updated', {
        telegramId: String(telegramId),
        telegramUsername: telegramUsername || undefined,
        telegramNotificationsEnabled: true,
        phone: phone || undefined
      });
    }

    res.status(200).json({ msg: 'Аккаунт успешно привязан' });

  } catch (error) {
    console.error('Ошибка при финализации привязки:', error);
    res.status(500).json({ msg: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Запрос на сброс пароля
 *     description: Проверяет, привязан ли к аккаунту с указанным именем пользователя Telegram, и если да, отправляет в него код для сброса пароля.
 *     tags: [Password]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *             properties:
 *               username:
 *                 type: string
 *     responses:
 *       200:
 *         description: Код для сброса пароля отправлен в Telegram.
 *       400:
 *         description: Некорректные данные или к аккаунту не привязан Telegram.
 *       404:
 *         description: Пользователь с таким именем не найден.
 *       429:
 *         description: Слишком частые запросы на сброс пароля.
 *       500:
 *         description: Ошибка сервера.
 */
router.post('/forgot-password', generalLimiter, [
  body('username', 'Введите имя пользователя').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username } = req.body;
  const currentIP = req.headers['x-test-ip'] || req.ip;

  // Проверяем, заблокирован ли IP
  const ipBlocked = await isIPBlocked(currentIP);
  if (ipBlocked) {
    return res.status(403).json({
      msg: 'Ваш IP заблокирован на 24 часа из-за превышения количества попыток',
      blocked: true
    });
  }

  if (!req.app.locals.passwordResetTokens) {
    req.app.locals.passwordResetTokens = new Map();
  }
  if (!req.app.locals.passwordResetRateLimiter) {
    req.app.locals.passwordResetRateLimiter = new Map();
  }

  const { passwordResetTokens, passwordResetRateLimiter } = req.app.locals;
  const lowerCaseUsername = username.toLowerCase();

  // ПРОВЕРКА ЛИМИТА ЧАСТОТЫ ЗАПРОСОВ(чтоб не абузили)
  const lastRequestTimestamp = passwordResetRateLimiter.get(lowerCaseUsername);
  const TEN_MINUTES_IN_MS = 10 * 60 * 1000;

  if (lastRequestTimestamp && (Date.now() - lastRequestTimestamp < TEN_MINUTES_IN_MS)) {
    const timeLeftMs = TEN_MINUTES_IN_MS - (Date.now() - lastRequestTimestamp);
    const timeLeftMin = Math.ceil(timeLeftMs / (1000 * 60));
    return res.status(429).json({ msg: `Вы недавно сбрасывали пароль. Пожалуйста, подождите еще ${timeLeftMin} мин.` });
  }

  try {
    const user = await User.findOne({ username: lowerCaseUsername });

    if (!user) {
      // Больше не притворяемся. Если юзера нет - так и говорим.
      return res.status(404).json({ msg: 'Пользователь с таким именем не найден.' });
    }

    if (!user.telegramId) {
      return res.status(400).json({ msg: 'К этому аккаунту не привязан Telegram. Сброс пароля невозможен.' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000;

    // Явно сбрасываем счетчик попыток при новом запросе кода
    passwordResetTokens.set(lowerCaseUsername, {
      code,
      expires,
      attempts: 0  // Всегда сбрасываем при новом коде
    });
    passwordResetRateLimiter.set(lowerCaseUsername, Date.now());

    // Отправляем код через апи телеграма
    const botToken = process.env.BOT_TOKEN;
    const message = `Ваш код для сброса пароля на Birge Kömek: \`${code}\`\n\nЕсли вы не запрашивали сброс, просто проигнорируйте это сообщение.`;
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    await axios.post(url, {
      chat_id: user.telegramId,
      text: message,
      parse_mode: 'Markdown'
    });

    // Удаляем токен после истечения срока
    setTimeout(() => {
      passwordResetTokens.delete(lowerCaseUsername);
    }, 10 * 60 * 1000);

    // Удаляем метку времени лимита, чтобы не засорять память
    setTimeout(() => {
      passwordResetRateLimiter.delete(lowerCaseUsername);
    }, TEN_MINUTES_IN_MS);

    res.status(200).json({ msg: 'Код для сброса пароля отправлен в ваш Telegram.' });

  } catch (error) {
    console.error('Ошибка при запросе на сброс пароля:', error.response ? error.response.data : error.message);
    res.status(500).send('Ошибка сервера при отправке кода.');
  }
});

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Сброс пароля с использованием кода
 *     description: Устанавливает новый пароль для пользователя при предоставлении правильного имени пользователя и кода, полученного в Telegram.
 *     tags: [Password]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, code, password]
 *             properties:
 *               username:
 *                 type: string
 *               code:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Пароль успешно сброшен.
 *       400:
 *         description: Неверные данные (username, code, password) или код истек.
 *       404:
 *         description: Пользователь не найден.
 *       500:
 *         description: Ошибка сервера.
 */
router.post('/reset-password', generalLimiter, [
  body('username', 'Введите имя пользователя').not().isEmpty(),
  body('code', 'Код должен состоять из 6 цифр').isLength({ min: 6, max: 6 }).isNumeric(),
  body('password', 'Пароль должен быть минимум 6 символов').isLength({ min: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, code, password } = req.body;
  const { passwordResetTokens } = req.app.locals;
  const currentIP = req.headers['x-test-ip'] || req.ip;

  // Проверяем, заблокирован ли IP
  const ipBlocked = await isIPBlocked(currentIP);
  if (ipBlocked) {
    return res.status(403).json({
      msg: 'Ваш IP заблокирован на 24 часа из-за превышения количества попыток',
      blocked: true
    });
  }

  const storedToken = passwordResetTokens.get(username.toLowerCase());

  if (!storedToken) {
    return res.status(400).json({ msg: 'Код не найден или истек. Запросите новый.' });
  }

  if (Date.now() > storedToken.expires) {
    passwordResetTokens.delete(username.toLowerCase());
    return res.status(400).json({ msg: 'Срок действия кода истек. Запросите новый.' });
  }

  // Проверяем код
  if (storedToken.code !== code) {
    // Увеличиваем счетчик попыток
    storedToken.attempts = (storedToken.attempts || 0) + 1;
    const remainingAttempts = 3 - storedToken.attempts;

    // Если исчерпаны попытки - блокируем IP
    if (storedToken.attempts >= 3) {
      try {
        const user = await User.findOne({ username: username.toLowerCase() });
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await BlockedIP.create({
          ip: currentIP,
          userId: user?._id,
          reason: 'Превышено количество попыток сброса пароля',
          expiresAt
        });

        passwordResetTokens.delete(username.toLowerCase());

        console.log(`🚫 IP ${currentIP} заблокирован на 24 часа (сброс пароля)`);

        return res.status(403).json({
          msg: 'Превышено количество попыток. Ваш IP заблокирован на 24 часа.',
          blocked: true,
          remainingAttempts: 0
        });
      } catch (err) {
        console.error('Ошибка блокировки IP:', err);
      }
    }

    return res.status(400).json({
      msg: `Неверный код. Осталось попыток: ${remainingAttempts}`,
      remainingAttempts
    });
  }

  try {
    const user = await User.findOne({ username: username.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(404).json({ msg: 'Пользователь не найден.' });
    }

    // ПРОВЕРКА НА СОВПАДЕНИЕ СО СТАРЫМ ПАРОЛЕМ
    if (user.password) {
      const isSamePassword = await user.comparePassword(password);
      if (isSamePassword) {
        return res.status(400).json({ msg: 'Новый пароль не может совпадать со старым.' });
      }
    }

    user.password = password; // хэширование произойдет в pre-save хуке
    user.hasPassword = true;
    await user.save();

    passwordResetTokens.delete(username.toLowerCase());

    res.status(200).json({ msg: 'Пароль успешно сброшен. Теперь вы можете войти.' });

  } catch (error) {
    console.error('Ошибка при сбросе пароля:', error);
    res.status(500).send('Ошибка сервера при обновлении пароля.');
  }
});

// Callback от Telegram бота после того, как юзер нажал /start {token}
// Этот эндпоинт вызывается ИЗ ТЕЛЕГРАМ-БОТА, а не с фронтенда
router.post('/telegram/link-user', async (req, res) => {
  const { token, telegramId, telegramUsername, phone } = req.body;

  // Секретный ключ для авторизации бота
  if (req.headers['x-bot-secret'] !== process.env.BOT_INTERNAL_SECRET) {
    return res.status(403).json({ msg: 'Forbidden' });
  }

  try {
    const tokenData = await LinkToken.findOne({ token, expiresAt: { $gt: new Date() } });
    if (!tokenData) {
      return res.status(404).json({ msg: 'Токен не найден или истек.' });
    }

    const userToUpdate = await User.findById(tokenData.userId);
    if (!userToUpdate) {
      return res.status(404).json({ msg: 'Пользователь для привязки не найден.' });
    }

    userToUpdate.telegramId = telegramId;
    userToUpdate.telegramUsername = telegramUsername;
    if (phone) {
      userToUpdate.phone = phone;
    }
    // Если у пользователя уже есть пароль, НЕ МЕНЯЕМ hasPassword на false
    if (!userToUpdate.hasPassword) {
      userToUpdate.hasPassword = false;
    }

    await userToUpdate.save();

    tokenData.status = 'linked';
    await tokenData.save();

    res.json({ success: true, username: userToUpdate.username });
  } catch (err) {
    console.error('Ошибка привязки пользователя через бота:', err);
    res.status(500).json({ msg: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Выход пользователя из системы
 *     description: Формально, этот эндпоинт просто дает сигнал клиенту, что можно очистить токен. На бэкенде с JWT ничего не происходит.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Успешный выход.
 */
router.post('/logout', (req, res) => {
  res.status(200).json({ msg: 'Вы успешно вышли из системы' });
});

/**
 * @swagger
 * /api/auth/verify-ip:
 *   post:
 *     summary: Запросить код подтверждения для нового IP
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Код отправлен в Telegram
 *       403:
 *         description: Telegram не привязан
 */
router.post('/verify-ip', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user.telegramId) {
      return res.status(403).json({ msg: 'Для подтверждения нового IP необходимо привязать Telegram' });
    }

    const currentIP = req.headers['x-test-ip'] || req.ip;

    // Проверяем лимиты на повторную отправку
    const resendCheck = canResendCode(user._id.toString(), currentIP);

    if (!resendCheck.canResend) {
      return res.status(429).json({
        msg: resendCheck.message,
        waitTime: resendCheck.waitTime,
        remainingResends: resendCheck.remainingResends
      });
    }

    const code = generateVerificationCode();
    saveVerificationCode(user._id.toString(), currentIP, code);
    const { resendCount } = incrementResendCount(user._id.toString(), currentIP);

    const message = `🔐 *Подтверждение нового IP адреса*\n\n` +
      `Обнаружен вход с нового IP: \`${currentIP}\`\n\n` +
      `Ваш код подтверждения: \`${code}\`\n\n` +
      `⚠️ Никому не сообщайте этот код!\n` +
      `Если это были не вы, срочно смените пароль!`;

    await sendTelegramMessage(user.telegramId, message);

    // Расчет следующего ожидания до повторной отправки
    let nextWaitTime = 0; // секунды
    if (resendCount === 1) nextWaitTime = 60; // после 1-й повторной отправки ждать 60 сек
    else if (resendCount === 2) nextWaitTime = 5 * 60; // после 2-й — 5 минут

    res.json({
      msg: 'Код подтверждения отправлен в Telegram',
      remainingResends: resendCheck.remainingResends - 1,
      nextWaitTime
    });
  } catch (error) {
    console.error('Ошибка отправки кода:', error);
    res.status(500).json({ msg: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /api/auth/confirm-ip:
 *   post:
 *     summary: Подтвердить новый IP кодом из Telegram
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string, example: "123456" }
 *     responses:
 *       200:
 *         description: IP подтвержден
 *       400:
 *         description: Неверный код
 */
router.post('/confirm-ip', protect, async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user.id);
    const currentIP = req.headers['x-test-ip'] || req.ip;

    const result = await verifyCode(user._id.toString(), currentIP, code);

    if (result.blocked) {
      // IP заблокирован - отправляем уведомление в Telegram
      if (user.telegramId) {
        const message = `🚨 *ВНИМАНИЕ: Подозрительная активность!*\n\n` +
          `Обнаружена неудачная попытка входа в ваш аккаунт с IP: \`${currentIP}\`\n\n` +
          `IP адрес заблокирован на 24 часа из-за превышения количества попыток подтверждения.\n\n` +
          `⚠️ Если это были вы, свяжитесь с поддержкой.\n` +
          `Если это были не вы, ваш аккаунт в безопасности - смените пароль для дополнительной защиты.`;
        await sendTelegramMessage(user.telegramId, message);
      }
      return res.status(403).json({ msg: 'IP адрес заблокирован на 24 часа из-за превышения количества попыток' });
    }

    if (!result.success) {
      return res.status(400).json({
        msg: 'Неверный код',
        remainingAttempts: result.remainingAttempts
      });
    }

    // Добавляем IP в доверенные
    const userAgent = req.headers['user-agent'] || '';
    const { analyzeIp } = await import('../services/ipAnalysisService.js');
    const ipInfo = await analyzeIp(currentIP);
    const location = ipInfo ? `${ipInfo.city}, ${ipInfo.country}` : 'Unknown';

    await addTrustedIP(user, currentIP, userAgent, location);

    // Отправляем уведомление об успешном добавлении
    if (user.telegramId) {
      const message = `✅ *IP адрес подтвержден*\n\n` +
        `IP \`${currentIP}\` добавлен в список доверенных.\n` +
        `Локация: ${location}`;
      await sendTelegramMessage(user.telegramId, message);
    }

    // Возвращаем данные пользователя для автоматического входа
    const userWithoutPassword = await User.findById(user._id).select('-password');

    res.json({
      msg: 'IP адрес успешно подтвержден',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Ошибка подтверждения IP:', error);
    res.status(500).json({ msg: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Изменить пароль пользователя
 *     tags: [Auth]
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
 *                 description: Текущий пароль (не требуется, если пароля нет)
 *               newPassword:
 *                 type: string
 *                 description: Новый пароль
 *               confirmPassword:
 *                 type: string
 *                 description: Подтверждение нового пароля
 *     responses:
 *       200:
 *         description: Пароль успешно изменен
 *       400:
 *         description: Ошибка валидации
 *       401:
 *         description: Неверный текущий пароль
 */
router.post('/change-password', protect, [
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Новый пароль должен содержать минимум 8 символов')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage('Новый пароль должен содержать буквы и цифры'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Пароли не совпадают');
    }
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        msg: errors.array()[0].msg,
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: 'Пользователь не найден' });
    }

    // Если у пользователя есть пароль, проверяем текущий
    if (user.password) {
      if (!currentPassword) {
        return res.status(400).json({ msg: 'Необходимо указать текущий пароль' });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({ msg: 'Неверный текущий пароль' });
      }

      // Проверяем, что новый пароль отличается от текущего
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        return res.status(400).json({ msg: 'Новый пароль должен отличаться от текущего' });
      }
    }

    // Запоминаем, был ли пароль ДО изменения
    const hadPassword = !!user.password;

    // Присваиваем новый пароль напрямую — хэширование произойдет в pre-save хуке
    user.password = newPassword;
    user.hasPassword = true;
    await user.save();

    // Отправляем уведомление в Telegram
    if (user.telegramId) {
      const message = hadPassword ?
        '🔐 *Пароль изменен*\n\nВаш пароль был успешно изменен.\n\nЕсли это были не вы, срочно свяжитесь с поддержкой!' :
        '🔐 *Пароль установлен*\n\nВы успешно установили пароль для входа.\n\nТеперь вы можете входить как через Telegram, так и по логину/паролю.';

      try {
        await sendTelegramMessage(user.telegramId, message);
      } catch (err) {
        console.error('Ошибка отправки уведомления в Telegram:', err);
      }
    }

    res.json({
      msg: hadPassword ? 'Пароль успешно изменен' : 'Пароль успешно установлен',
      hasPassword: true
    });
  } catch (error) {
    console.error('Ошибка изменения пароля:', error);
    res.status(500).json({ msg: 'Ошибка сервера' });
  }
});

export default router; 