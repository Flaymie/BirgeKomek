import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import uploadAvatar from '../middleware/uploadMiddleware.js';
import crypto from 'crypto';
import { telegramTokens } from '../utils/telegramTokenStore.js';
import { protect } from '../middleware/auth.js';
import axios from 'axios';
import { createAndSendNotification } from './notifications.js';

const router = express.Router();

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
 *               phone:
 *                 type: string
 *                 description: Номер телефона (опционально)
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
router.post('/register', 
  uploadAvatar,
  [
  body('username')
    .trim()
    .not().isEmpty().withMessage('Имя пользователя обязательно')
    .isLength({ min: 3, max: 10 }).withMessage('Имя пользователя должно быть от 3 до 10 символов')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Имя пользователя может содержать только латинские буквы, цифры, дефис и подчеркивания'),
  
  body('email')
    .trim()
    .isEmail().withMessage('Введите корректный email')
    .normalizeEmail(),
  
  body('password')
    .trim()
    .isLength({ min: 6 }).withMessage('Пароль должен быть минимум 6 символов'),
  
  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[0-9]{10,15}$/).withMessage('Некорректный формат телефона'),
  
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

    const { username, email, password, phone, grade, role } = req.body;
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

    const newUser = {
      username,
      email,
      password,
      phone,
      roles: {
        student: role === 'student',
        helper: role === 'helper',
      },
      avatar: req.file ? `/uploads/avatars/${req.file.filename}` : '',
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
router.post('/login', [
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
        const user = await User.findOne({ username: req.body.username.toLowerCase() });
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

// @route   GET /api/auth/telegram/generate-token
// @desc    Сгенерировать временный токен для входа через Telegram
// @access  Public
router.post('/telegram/generate-token', (req, res) => {
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


// @route   GET /api/auth/telegram/check-token/:token
// @desc    Проверить статус токена для входа (для поллинга с фронтенда)
// @access  Public
router.get('/telegram/check-token/:token', async (req, res) => {
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

// @route   POST /api/auth/telegram/register
// @desc    Регистрация пользователя через Telegram бота
// @access  Internal (вызывается только ботом)
router.post('/telegram/register', async (req, res) => {
    try {
        const {
            email,
            role,
            grade,
            subjects,
            telegramId,
            username,
            firstName,
            lastName
        } = req.body;

        // 1. Проверяем, что все нужные данные есть
        if (!email || !role || !telegramId || !username) {
            return res.status(400).json({ msg: 'Не хватает данных для регистрации' });
        }

        // 2. Проверяем, не занят ли email или username
        const existingUserByEmail = await User.findOne({ email: email.toLowerCase() });
        if (existingUserByEmail) {
            return res.status(400).json({ msg: 'Этот email уже используется.' });
        }

        const existingUserByUsername = await User.findOne({ username: username.toLowerCase() });
        if (existingUserByUsername) {
            return res.status(400).json({ msg: `Имя пользователя '${username}' уже занято.` });
        }
        
        const existingUserByTgId = await User.findOne({ telegramId });
        if (existingUserByTgId) {
             return res.status(400).json({ msg: 'Этот Telegram аккаунт уже привязан к пользователю.' });
        }

        // 3. Создаем временный пароль (пользователь сможет его сбросить)
        const tempPassword = crypto.randomBytes(8).toString('hex');

        // 4. Создаем нового пользователя
        const newUser = new User({
            username,
            email,
            password: tempPassword, // Пароль будет сразу хэширован благодаря pre-save хуку в модели User
            firstName,
            lastName,
            telegramId,
            roles: {
                student: role === 'student',
                helper: role === 'helper',
            },
            grade: grade || undefined,
            subjects: subjects || [],
            isVerified: true, // Считаем верифицированным, раз пришел из телеги
        });

        await newUser.save();

        // 5. Генерируем JWT токен для авто-логина (он здесь не используется ботом, но пусть будет)
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

// @route   POST /api/auth/telegram/complete-login
// @desc    Связать токен входа с сайта с пользователем из Telegram
// @access  Internal (вызывается только ботом)
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
                return res.status(404).json({ msg: 'Пользователь с таким Telegram ID не найден в системе.' });
            }
            finalUserId = user._id;
        }

        tokenData.status = 'completed';
        tokenData.userId = finalUserId;
        loginTokens.set(loginToken, tokenData);

        res.status(200).json({ msg: 'Аккаунт успешно привязан. Вернитесь на сайт.' });

    } catch (error) {
        console.error('Ошибка при завершении входа через Telegram:', error);
        res.status(500).json({ msg: 'Ошибка сервера' });
    }
});

/*
*   НОВЫЙ РОУТ ДЛЯ ПРИВЯЗКИ ТЕЛЕГРАМА
*/
// @route   POST /api/auth/generate-link-token
// @desc    Создать токен для привязки Telegram аккаунта
// @access  Private
router.post('/generate-link-token', protect, (req, res) => {
    try {
        const linkToken = `link_${crypto.randomBytes(15).toString('hex')}`;
        const expires = Date.now() + 10 * 60 * 1000; // 10 минут

        telegramTokens.set(linkToken, { 
            status: 'pending_link', 
            userId: req.user.id,
            expires 
        });

        setTimeout(() => {
            const tokenData = telegramTokens.get(linkToken);
            if (tokenData && tokenData.status === 'pending_link') {
                telegramTokens.delete(linkToken);
            }
        }, 10 * 60 * 1000);

        res.json({ linkToken });

    } catch (error) {
        console.error('Ошибка генерации токена для привязки:', error);
        res.status(500).send('Ошибка сервера');
    }
});

// @route   GET /api/auth/check-link-status/:token
// @desc    Проверить статус токена привязки
// @access  Private
router.get('/check-link-status/:token', protect, (req, res) => {
    const { token } = req.params;
    const tokenData = telegramTokens.get(token);

    if (!tokenData) {
        return res.status(404).json({ status: 'not_found' });
    }
    
    if (tokenData.userId !== req.user.id) {
        return res.status(403).json({ status: 'forbidden' });
    }

    res.json({ status: tokenData.status });
});

// @route   POST /api/auth/unlink-telegram
// @desc    Отвязать Telegram от аккаунта
// @access  Private
router.post('/unlink-telegram', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'Пользователь не найден' });
        }

        user.telegramId = undefined;
        user.telegramUsername = undefined;
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

// @route   POST /api/auth/finalizelink
// @desc    Завершить привязку (вызывается ботом)
// @access  Internal
router.post('/finalizelink', async (req, res) => {
    const { linkToken, telegramId, telegramUsername } = req.body;

    if (!linkToken || !telegramId) {
        return res.status(400).json({ msg: 'Отсутствует токен или ID телеграма' });
    }

    const tokenData = telegramTokens.get(linkToken);

    if (!tokenData || tokenData.status !== 'pending_link') {
        return res.status(404).json({ msg: 'Токен для привязки не найден или недействителен' });
    }
    
    if (Date.now() > tokenData.expires) {
        telegramTokens.delete(linkToken);
        return res.status(410).json({ msg: 'Срок действия токена истек' });
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

        userToUpdate.telegramId = String(telegramId);
        userToUpdate.telegramUsername = telegramUsername;
        await userToUpdate.save();

        tokenData.status = 'linked';
        telegramTokens.set(linkToken, tokenData);

        // --- УВЕДОМЛЕНИЕ О ПРИВЯЗКЕ TELEGRAM ---
        await createAndSendNotification(req.app.locals.sseConnections, {
          user: userToUpdate._id,
          type: 'security_alert',
          title: 'Telegram успешно привязан',
          message: `Ваш аккаунт был успешно привязан к Telegram @${telegramUsername}.`,
          link: '/profile/me'
        });
        
        res.status(200).json({ msg: 'Аккаунт успешно привязан' });

    } catch (error) {
        console.error('Ошибка при финализации привязки:', error);
        res.status(500).json({ msg: 'Ошибка сервера' });
    }
});

// --- РОУТЫ ДЛЯ СБРОСА ПАРОЛЯ ---

// @route   POST /api/auth/forgot-password
// @desc    Запрос на сброс пароля
// @access  Public
router.post('/forgot-password', [
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
            // Важно! Не говорим пользователю, что email не найден, для безопасности.
            return res.status(200).json({ msg: 'Если аккаунт с таким email существует и привязан к Telegram, на него будет отправлен код.' });
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


// @route   POST /api/auth/reset-password
// @desc    Сброс пароля с использованием кода
// @access  Public
router.post('/reset-password', [
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
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            // Этого не должно произойти, если код был найден, но на всякий случай
            return res.status(404).json({ msg: 'Пользователь не найден.' });
        }

        // ПРОВЕРКА НА СОВПАДЕНИЕ СО СТАРЫМ ПАРОЛЕМ
        const isSamePassword = await user.comparePassword(password);
        if (isSamePassword) {
            return res.status(400).json({ msg: 'Новый пароль не может совпадать со старым.' });
        }

        user.password = password; // хэширование произойдет в pre-save хуке
        await user.save();

        passwordResetTokens.delete(email.toLowerCase()); // Код использован, удаляем

        res.status(200).json({ msg: 'Пароль успешно сброшен. Теперь вы можете войти.' });

    } catch (error) {
        console.error('Ошибка при сбросе пароля:', error);
        res.status(500).send('Ошибка сервера при обновлении пароля.');
    }
});

export default router;