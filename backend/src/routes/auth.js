import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import uploadAvatar from '../middleware/uploadMiddleware.js';
import crypto from 'crypto';
import { telegramTokens } from '../utils/telegramTokenStore.js';
import { protect } from '../middleware/auth.js';
import { generalLimiter } from '../middleware/rateLimiters.js';
import axios from 'axios';
import { createAndSendNotification } from './notifications.js';
import { generateAvatar } from '../utils/avatarGenerator.js';
import LinkToken from '../models/LinkToken.js';

const router = express.Router();

// Список зарезервированных имен пользователей, которые нельзя использовать при регистрации
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
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Уникальное имя пользователя
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email пользователя
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
// регистрация
router.post('/register', generalLimiter,
  uploadAvatar,
  [
  body('username')
    .trim()
    .not().isEmpty().withMessage('Имя пользователя обязательно')
    .isLength({ min: 3, max: 10 }).withMessage('Имя пользователя должно быть от 3 до 10 символов')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Имя пользователя может содержать только латинские буквы, цифры, дефис и подчеркивания')
    .custom(value => {
        const lowerCaseValue = value.toLowerCase();
        // Проверяем, не СОДЕРЖИТ ли имя пользователя зарезервированное слово
        const isReserved = RESERVED_USERNAMES.some(reserved => lowerCaseValue.includes(reserved));
        if (isReserved) {
            // Выбрасываем ошибку валидации
            return Promise.reject('Имя пользователя содержит зарезервированные слова.');
        }
        return true;
    }),
  
  body('email')
    .trim()
    .isEmail().withMessage('Введите корректный email')
    .normalizeEmail(),
  
  body('password')
    .trim()
    .isLength({ min: 6 }).withMessage('Пароль должен быть минимум 6 символов'),
  
  body('grade')
    .optional()
    .isInt({ min: 7, max: 11 }).withMessage('Класс должен быть от 7 до 11'),
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
        if(Array.isArray(value)) return true;
        throw new Error('Некорректный формат предметов.');
      }
    }),
  ], 
  async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

    const { username, email, password, grade, role } = req.body;
    let { subjects } = req.body;

    if (subjects && typeof subjects === 'string') {
      try {
        subjects = JSON.parse(subjects);
      } catch (e) {
        return res.status(400).json({ msg: 'Некорректный формат предметов (ошибка JSON)' });
      }
    }

  try {
    const lowerCaseEmail = email.toLowerCase();
    const lowerCaseUsername = username.toLowerCase();

    let user = await User.findOne({ email: lowerCaseEmail });
    if (user) {
      return res.status(400).json({ msg: 'Регистрация невозможна. Попробуйте другой email.' });
    }

    user = await User.findOne({ username: lowerCaseUsername });
    if (user) {
      return res.status(400).json({ msg: 'Пользователь с таким именем уже существует' });
    }

    // --- ЛОГИКА АВАТАРКИ ---
    let avatarUrl = '';
    if (req.file) {
      // Если пользователь загрузил файл, используем его
      avatarUrl = `/uploads/avatars/${req.file.filename}`;
    } else {
      // Иначе генерируем дефолтную SVG-аватарку
      avatarUrl = generateAvatar(username);
    }
    // ----------------------

    const newUser = {
      username,
      email,
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

    await user.save();
    
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET, 
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    user.password = undefined;
    
    res.status(201).json({
      token,
      user
    });
  } catch (err) {
    console.error('Ошибка регистрации:', err);
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
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email пользователя
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Пароль пользователя
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
router.post('/login', generalLimiter, [
  // Валидация входных данных
  body('email')
    .trim()
    .isEmail().withMessage('Введите корректный email')
    .normalizeEmail(),
  
  body('password', 'Пароль обязателен').not().isEmpty(),
  ], 
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { email, password } = req.body;
    const lowerCaseEmail = email.toLowerCase();
    
    try {
      const user = await User.findOne({ email: lowerCaseEmail }).select('+password');
    if (!user) {
        return res.status(400).json({ msg: 'Неверный email или пароль' });
    }
    
    const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({ msg: 'Неверный email или пароль' });
      }

      // Если пользователь забанен, мы все равно даем ему токен,
      // но фронтенд должен будет показать модалку с причиной бана.
      if (user.banDetails.isBanned) {
        console.log(`[Login] Забаненный пользователь ${user.username} пытается войти.`);
      }
      
    const token = jwt.sign(
        { id: user._id, username: user.username, roles: user.roles },
      process.env.JWT_SECRET, 
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    user.password = undefined;
    
    res.json({
      token,
        user,
        // Явно отправляем детали бана на фронтенд
        banDetails: user.banDetails 
    });

  } catch (err) {
    console.error('Ошибка входа:', err);
      res.status(500).json({ msg: 'Ошибка сервера при попытке входа' });
    }
  }
);

// --- Новые роуты для валидации ---

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

        // --- ПРОВЕРКА НА СОДЕРЖАНИЕ ЗАРЕЗЕРВИРОВАННЫХ СЛОВ ---
        const isReserved = RESERVED_USERNAMES.some(reserved => username.includes(reserved));
        if (isReserved) {
            return res.json({ available: false, message: 'Имя пользователя содержит зарезервированные слова.' });
        }

        const user = await User.findOne({ username });
        res.json({ available: !user });
    } catch (e) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

/**
 * @swagger
 * /api/auth/check-email:
 *   post:
 *     summary: Проверить доступность email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: 'string' }
 *     responses:
 *       200:
 *         description: Возвращает true, если email доступен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 available: { type: 'boolean' }
 */
router.post('/check-email', [
    body('email').trim().isEmail().withMessage('Некорректный email')
], async (req, res) => {
     const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Отправляем false, если email невалидный, чтобы фронтенд показал ошибку формата
        return res.json({ available: false, message: errors.array()[0].msg });
    }
    try {
        const user = await User.findOne({ email: req.body.email.toLowerCase() });
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
router.post('/telegram/generate-token', generalLimiter, (req, res) => {
    try {
        const token = crypto.randomBytes(20).toString('hex');
        
        // Используем глобальный или импортированный объект для хранения
        const { loginTokens } = req.app.locals; 
        loginTokens.set(token, { status: 'pending', userId: null, expires: Date.now() + 3 * 60 * 1000 });

        console.log(`Сгенерирован токен для входа: ${token}`);

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

            const jwtToken = jwt.sign(
                { id: user._id, username: user.username, roles: user.roles },
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
 *               email: { type: 'string' }
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
router.post('/telegram/register', async (req, res) => {
    try {
        const {
            email,
            role,
            grade,
            subjects,
            phone,
            telegramId,
            username,
            firstName,
            lastName
        } = req.body;

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

        // --- Если пользователя нет, продолжаем регистрацию ---

        // 3. Проверяем, что все нужные данные для НОВОГО юзера есть
        if (!email || !role || !username) {
            return res.status(400).json({ msg: 'Не хватает данных для регистрации нового пользователя.' });
        }

        // 4. Проверяем, не занят ли email или username
        const existingUserByEmail = await User.findOne({ email: email.toLowerCase() });
        if (existingUserByEmail) {
            return res.status(400).json({ msg: 'Этот email уже используется.' });
        }

        const existingUserByUsername = await User.findOne({ username: username.toLowerCase() });
        if (existingUserByUsername) {
            return res.status(400).json({ msg: `Имя пользователя '${username}' уже занято.` });
        }

        // 5. Создаем нового пользователя
        const newUser = new User({
            username,
            email,
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
        });

        await newUser.save();

        // 7. Генерируем JWT токен для авто-логина (он здесь не используется ботом, но пусть будет)
        const jwtToken = jwt.sign(
            { id: newUser._id, username: newUser.username },
            process.env.JWT_SECRET,
            { expiresIn: '5m' } 
        );
        
        // Отправляем ID нового юзера, чтобы бот мог его использовать
        res.status(201).json({ userId: newUser._id, token: jwtToken });

    } catch (error) {
        console.error('Ошибка регистрации через Telegram:', error.message);
        if (error.code === 11000) {
            return res.status(400).json({ msg: `Имя пользователя или email уже заняты.` });
        }
        res.status(500).json({ msg: 'Ошибка на сервере' });
    }
});

/**
 * @swagger
 * /api/auth/telegram/complete-login:
 *   post:
 *     summary: Связать токен входа с пользователем из Telegram (внутренний)
 *     description: "ВНИМАНИЕ: Этот эндпоинт предназначен для вызова только вашим Telegram-ботом после того, как пользователь подтвердил вход."
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
        
        // --- ИСПРАВЛЕННЫЙ ТЕКСТ ---
        res.status(200).json({ msg: 'Вход подтвержден! Можете возвращаться на сайт, вы уже вошли в систему.' });

    } catch (error) {
        console.error('Ошибка при завершении входа через Telegram:', error);
        res.status(500).json({ msg: 'Ошибка сервера' });
    }
});

/*
*   НОВЫЙ РОУТ ДЛЯ ПРИВЯЗКИ ТЕЛЕГРАМА
*/

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

        // --- ИСПРАВЛЕНИЕ: Сохраняем токен в MongoDB, а не в память ---
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

      await tokenData.deleteOne(); // Удаляем использованный токен
      
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
 *     description: Удаляет связь между аккаунтом на сайте и Telegram. Невозможно, если у пользователя не установлен пароль.
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

    // --- УВЕДОМЛЕНИЕ ОБ ОТВЯЗКЕ TELEGRAM ---
    await createAndSendNotification(req.app.locals.sseConnections, {
      user: req.user.id,
      type: 'security_alert',
      title: 'Telegram отвязан',
      message: 'Ваш аккаунт был отвязан от Telegram.',
      link: '/profile/me'
    });

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
 *     description: "ВНИМАНИЕ: Этот эндпоинт предназначен для вызова только вашим Telegram-ботом после того, как пользователь отправил ему токен привязки."
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

    // --- ИСПРАВЛЕНИЕ: Ищем токен в MongoDB ---
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
        if (phone) { // Сохраняем телефон, если он был передан
            userToUpdate.phone = phone;
        }
        await userToUpdate.save();

        // --- ИСПРАВЛЕНИЕ: Удаляем токен из базы после использования ---
        await tokenData.deleteOne();
        
        // --- УВЕДОМЛЕНИЕ О ПРИВЯЗКЕ TELEGRAM ---
        await createAndSendNotification(req.app.locals.sseConnections, {
          user: userToUpdate._id,
          type: 'security_alert',
          title: 'Telegram успешно привязан',
          message: `Ваш аккаунт был успешно привязан к Telegram${telegramUsername ? ' @' + telegramUsername : ''}.`,
          link: '/profile/me'
        });
        
        res.status(200).json({ msg: 'Аккаунт успешно привязан' });

    } catch (error) {
        console.error('Ошибка при финализации привязки:', error);
        res.status(500).json({ msg: 'Ошибка сервера' });
    }
});

// --- РОУТЫ ДЛЯ СБРОСА ПАРОЛЯ ---

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Запрос на сброс пароля
 *     description: Проверяет, привязан ли к аккаунту с указанным email Telegram, и если да, отправляет в него код для сброса пароля.
 *     tags: [Password]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Код для сброса пароля отправлен в Telegram.
 *       400:
 *         description: Некорректный email или к аккаунту не привязан Telegram.
 *       404:
 *         description: Пользователь с таким email не найден.
 *       429:
 *         description: Слишком частые запросы на сброс пароля.
 *       500:
 *         description: Ошибка сервера.
 */
router.post('/forgot-password', generalLimiter, [
    body('email', 'Введите корректный email').isEmail()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    
    // Инициализируем хранилища, если их еще нет
    if (!req.app.locals.passwordResetTokens) {
        req.app.locals.passwordResetTokens = new Map();
    }
    if (!req.app.locals.passwordResetRateLimiter) {
        req.app.locals.passwordResetRateLimiter = new Map();
    }
    
    const { passwordResetTokens, passwordResetRateLimiter } = req.app.locals;
    const lowerCaseEmail = email.toLowerCase();

    // ПРОВЕРКА ЛИМИТА ЧАСТОТЫ ЗАПРОСОВ
    const lastRequestTimestamp = passwordResetRateLimiter.get(lowerCaseEmail);
    const TEN_MINUTES_IN_MS = 10 * 60 * 1000;

    if (lastRequestTimestamp && (Date.now() - lastRequestTimestamp < TEN_MINUTES_IN_MS)) {
        const timeLeftMs = TEN_MINUTES_IN_MS - (Date.now() - lastRequestTimestamp);
        const timeLeftMin = Math.ceil(timeLeftMs / (1000 * 60));
        return res.status(429).json({ msg: `Вы недавно сбрасывали пароль. Пожалуйста, подождите еще ${timeLeftMin} мин.` });
    }

    try {
        const user = await User.findOne({ email: lowerCaseEmail });

        if (!user) {
            // Больше не притворяемся. Если юзера нет - так и говорим.
            return res.status(404).json({ msg: 'Пользователь с таким email не найден.' });
        }

        if (!user.telegramId) {
            return res.status(400).json({ msg: 'К этому аккаунту не привязан Telegram. Сброс пароля невозможен.' });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = Date.now() + 10 * 60 * 1000; // 10 минут

        passwordResetTokens.set(lowerCaseEmail, { code, expires });
        passwordResetRateLimiter.set(lowerCaseEmail, Date.now()); // Устанавливаем метку времени для лимита

        // Отправляем код через Telegram Bot API
        const botToken = process.env.BOT_TOKEN;
        const message = `Ваш код для сброса пароля на Birge Kömek: *${code}*\n\nЕсли вы не запрашивали сброс, просто проигнорируйте это сообщение.`;
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        
        await axios.post(url, {
            chat_id: user.telegramId,
            text: message,
            parse_mode: 'Markdown'
        });

        // Удаляем токен после истечения срока
        setTimeout(() => {
            passwordResetTokens.delete(lowerCaseEmail);
        }, 10 * 60 * 1000);
        
        // Удаляем метку времени лимита, чтобы не засорять память
        setTimeout(() => {
            passwordResetRateLimiter.delete(lowerCaseEmail);
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
 *     description: Устанавливает новый пароль для пользователя при предоставлении правильного email и кода, полученного в Telegram.
 *     tags: [Password]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               code:
 *                 type: string
 *                 description: 6-значный код из Telegram.
 *               password:
 *                 type: string
 *                 description: Новый пароль (мин. 6 символов).
 *     responses:
 *       200:
 *         description: Пароль успешно сброшен.
 *       400:
 *         description: Неверные данные (email, код, пароль) или код истек.
 *       404:
 *         description: Пользователь не найден.
 *       500:
 *         description: Ошибка сервера.
 */
router.post('/reset-password', generalLimiter, [
    body('email', 'Введите корректный email').isEmail(),
    body('code', 'Код должен состоять из 6 цифр').isLength({ min: 6, max: 6 }).isNumeric(),
    body('password', 'Пароль должен быть минимум 6 символов').isLength({ min: 6 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, code, password } = req.body;
    const { passwordResetTokens } = req.app.locals;

    const storedToken = passwordResetTokens.get(email.toLowerCase());

    if (!storedToken || storedToken.code !== code) {
        return res.status(400).json({ msg: 'Неверный или устаревший код.' });
    }

    if (Date.now() > storedToken.expires) {
        passwordResetTokens.delete(email.toLowerCase());
        return res.status(400).json({ msg: 'Срок действия кода истек. Запросите новый.' });
    }

    try {
        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
        if (!user) {
            // Этого не должно произойти, если код был найден, но на всякий случай
            return res.status(404).json({ msg: 'Пользователь не найден.' });
        }

        // ПРОВЕРКА НА СОВПАДЕНИЕ СО СТАРЫМ ПАРОЛЕМ
        if(user.password) { // Проверяем, только если пароль вообще был
            const isSamePassword = await user.comparePassword(password);
            if (isSamePassword) {
                return res.status(400).json({ msg: 'Новый пароль не может совпадать со старым.' });
            }
        }

        user.password = password; // хэширование произойдет в pre-save хуке
        user.hasPassword = true; // Теперь у юзера есть пароль
        await user.save();

        passwordResetTokens.delete(email.toLowerCase()); // Код использован, удаляем

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
    
    // Секретный ключ для "авторизации" бота
    if (req.headers['x-bot-secret'] !== process.env.BOT_INTERNAL_SECRET) {
        return res.status(403).json({ msg: 'Forbidden' });
    }

    try {
        const tokenData = await LinkToken.findOne({ token, expiresAt: { $gt: new Date() } });
        if (!tokenData) {
            return res.status(404).json({ msg: 'Токен не найден или истек.' });
        }
        
        // --- ИСПРАВЛЕНИЕ ЛОГИКИ ---
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

export default router; 