import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import uploadAvatar from '../middleware/uploadMiddleware.js';

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
 *                 minimum: 1
 *                 maximum: 11
 *                 description: Класс ученика (1-11)
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
    .isLength({ min: 3, max: 30 }).withMessage('Имя пользователя должно быть от 3 до 30 символов')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Имя пользователя может содержать только латинские буквы, цифры и подчеркивания'),
  
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
    .isInt({ min: 1, max: 11 }).withMessage('Класс должен быть от 1 до 11'),
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
      { id: user._id }, 
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
  
  body('password')
    .trim()
    .not().isEmpty().withMessage('Пароль обязателен')
], async (req, res) => {
  try {
    // Проверяем результаты валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Извлекаем только нужные поля
    const { email, password } = req.body;
    
    // ищем юзера, приводя email к нижнему регистру
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(401).json({ msg: 'Неверные данные' });
    }
    
    // сверяем пароль
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ msg: 'Неверные данные' });
    }
    
    // создаем токен
    const token = jwt.sign(
      { id: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    // не возвращаем пароль
    user.password = undefined;
    
    res.json({
      token,
      user
    });
  } catch (err) {
    console.error('Ошибка входа:', err);
    res.status(500).json({ msg: 'Что-то сломалось при входе' });
  }
});

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

export default router; 