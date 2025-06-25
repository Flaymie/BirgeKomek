import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';

import User from '../models/User.js';
import TelegramUser from '../models/TelegramUser.js';

// --- Временное хранилище токенов в памяти ---
const loginTokens = new Map();
const TOKEN_TTL = 3 * 60 * 1000; // 3 минуты

const router = express.Router();

// @route   POST /api/auth/telegram/generate-token
// @desc    Сгенерировать временный токен для входа через Telegram
// @access  Public
router.post('/generate-token', (req, res) => {
    const token = crypto.randomBytes(20).toString('hex');
    loginTokens.set(token, { status: 'pending', userId: null });

    setTimeout(() => {
        loginTokens.delete(token);
    }, TOKEN_TTL);

    res.json({ loginToken: token });
});

// @route   GET /api/auth/telegram/check-token/:token
// @desc    Проверить статус токена для входа
// @access  Public
router.get('/check-token/:token', async (req, res) => {
    const { token } = req.params;
    const tokenData = loginTokens.get(token);

    if (!tokenData) {
        return res.status(404).json({ status: 'invalid', msg: 'Токен не найден или устарел' });
    }

    if (tokenData.status === 'completed') {
        const user = await User.findById(tokenData.userId).select('-password');
        if (!user) {
             return res.status(404).json({ status: 'error', msg: 'Пользователь не найден' });
        }
        
        // Генерируем финальный JWT для сессии
        const payload = {
            user: {
                id: user.id,
                roles: user.roles,
            },
        };
        const sessionToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
        
        loginTokens.delete(token); // Токен использован, удаляем
        
        return res.json({ status: 'completed', token: sessionToken, user });
    }

    res.json({ status: tokenData.status });
});

// @route   POST /api/auth/telegram/check
// @desc    Проверить, существует ли пользователь по Telegram ID
// @access  Public
router.post('/check', [
    body('telegramId', 'Необходим ID пользователя Telegram').not().isEmpty(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { telegramId } = req.body;

    try {
        const telegramUser = await TelegramUser.findOne({ telegramId: String(telegramId) });

        if (telegramUser) {
            return res.json({ exists: true });
        } else {
            return res.json({ exists: false });
        }
    } catch (error) {
        console.error('Ошибка при проверке пользователя Telegram:', error.message);
        res.status(500).send('Ошибка на сервере');
    }
});

// @route   POST /api/auth/telegram/connect
// @desc    Связать Telegram аккаунт с сессией на сайте для входа
// @access  Public
router.post('/connect', 
    [
        body('telegramId', 'Необходим ID пользователя Telegram').not().isEmpty(),
        body('loginToken', 'Необходим токен для входа').not().isEmpty(),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { telegramId, loginToken } = req.body;

        try {
            // 1. Проверяем, существует ли токен
            if (!loginTokens.has(loginToken)) {
                return res.status(400).json({ msg: 'Токен для входа недействителен или устарел.' });
            }

            // 2. Находим пользователя по telegramId
            const tgUser = await TelegramUser.findOne({ telegramId: String(telegramId) });
            if (!tgUser) {
                return res.status(404).json({ msg: 'Этот Telegram аккаунт не зарегистрирован. Пожалуйста, сначала пройдите регистрацию.' });
            }
            
            // 3. Связываем токен с userId
            loginTokens.set(loginToken, { status: 'completed', userId: tgUser.userId });

            res.status(200).json({ msg: 'Аккаунт успешно подтвержден. Вернитесь на сайт.' });

        } catch (error) {
            console.error('Ошибка при коннекте Telegram:', error.message);
            res.status(500).send('Ошибка на сервере');
        }
    }
);

// @route   POST /api/auth/telegram/register
// @desc    Зарегистрировать нового пользователя через Telegram бота
// @access  Public
router.post(
    '/register',
    [
        body('email', 'Введите корректный email').isEmail(),
        body('telegramId', 'Необходим ID пользователя Telegram').not().isEmpty(),
        body('username', 'Имя пользователя обязательно').not().isEmpty(),
        body('firstName', 'Имя обязательно').not().isEmpty(),
        body('role', 'Роль обязательна').isIn(['student', 'helper']),
        body('grade', 'Класс обязателен').isInt({ min: 7, max: 11 }),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ msg: errors.array().map(e => e.msg).join(', ') });
        }

        const {
            email,
            telegramId,
            username,
            firstName,
            lastName,
            role,
            grade,
            subjects,
        } = req.body;

        try {
            // 1. Проверяем, не занят ли email или telegramId
            let user = await User.findOne({ email });
            if (user) {
                return res.status(400).json({ msg: 'Пользователь с таким email уже существует' });
            }
            let tgUser = await TelegramUser.findOne({ telegramId: String(telegramId) });
            if (tgUser) {
                return res.status(400).json({ msg: 'Этот Telegram аккаунт уже зарегистрирован' });
            }

            // 2. Создаем нового пользователя
            const randomPassword = crypto.randomBytes(32).toString('hex');
            user = new User({
                email,
                username,
                password: randomPassword,
                firstName,
                lastName: lastName || '',
                roles: {
                    student: role === 'student' || role === 'helper', // хелпер тоже студент
                    helper: role === 'helper',
                },
                grade,
                subjects: role === 'helper' ? subjects : [],
                avatar: `https://api.dicebear.com/8.x/pixel-art/svg?seed=${username}`, // генерируем аватарку
            });

            await user.save();

            // 3. Создаем связь с Telegram
            tgUser = new TelegramUser({
                userId: user._id,
                telegramId: String(telegramId),
                username: req.body.username, // username из тг
            });

            await tgUser.save();
            
            // 4. Генерируем токен для авто-логина
            const payload = {
                user: {
                    id: user.id,
                    roles: user.roles,
                },
            };

            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '3m' });

            res.status(201).json({ token });

        } catch (error) {
            console.error('Ошибка при регистрации через Telegram:', error.message);
            // Простая очистка, если пользователь создан, а связь - нет
            const userToDelete = await User.findOne({ email });
            if (userToDelete) {
                await User.deleteOne({ email });
            }
            res.status(500).json({ msg: 'Ошибка на сервере' });
        }
    }
);

export default router; 