import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';

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
router.post('/register', [
  // Валидация входных данных
  body('username')
    .trim()
    .not().isEmpty().withMessage('Имя пользователя обязательно')
    .isLength({ min: 3, max: 30 }).withMessage('Имя пользователя должно быть от 3 до 30 символов')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Имя пользователя может содержать только буквы, цифры и подчеркивания'),
  
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
    .withMessage('Все предметы в helperSubjects должны быть непустыми строками')
], async (req, res) => {
  try {
    // Проверяем результаты валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Извлекаем только нужные поля, а не весь req.body
    const { username, email, password, phone, roles, grade, helperSubjects } = req.body;
    
    // проверяем, что такой юзер ещё не существует
    const existing = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existing) {
      return res.status(400).json({ 
        msg: 'Пользователь с таким email или username уже есть' 
      });
    }
    
    // Создаем новый объект пользователя с валидированными данными
    const user = new User({
      username,
      email,
      password,
      phone,
      roles,
      grade,
      helperSubjects: (roles && roles.helper && helperSubjects) ? helperSubjects : []
    });
    
    await user.save();
    
    // создаем токен
    const token = jwt.sign(
      { id: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    // не возвращаем пароль
    user.password = undefined;
    
    res.status(201).json({
      token,
      user
    });
  } catch (err) {
    console.error('Ошибка регистрации:', err);
    res.status(500).json({ msg: 'Что-то сломалось при регистрации' });
  }
});

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
    
    // ищем юзера
    const user = await User.findOne({ email });
    
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

export default router; 