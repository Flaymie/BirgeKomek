import express from 'express';
import { body, validationResult, param, query } from 'express-validator';
import Request from '../models/Request.js';
import User from '../models/User.js'; // Убедимся, что User импортирован
import Message from '../models/Message.js'; // Импортируем Message
import { protect, isHelper, isAdmin, isModOrAdmin } from '../middleware/auth.js';
import { createAndSendNotification } from './notifications.js'; // Правильный путь импорта
import mongoose from 'mongoose';
import { createRequestLimiter, generalLimiter } from '../middleware/rateLimiters.js'; // <-- Импортируем
import { uploadAttachments } from './upload.js';
import tgRequired from '../middleware/tgRequired.js';
import redis from '../config/redis.js'; 
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { sendTelegramMessage } from './users.js';
import geminiService from "../services/geminiService.js"; // Импортируем наш сервис

// --->>> НОВАЯ ФУНКЦИЯ ДЛЯ ОПОВЕЩЕНИЯ ХЕЛПЕРОВ <<<---
const notifyHelpersAboutNewRequest = async (request, author) => {
    // Убедимся, что автор не получит уведомление о своей же заявке
    if (!request || !author || request.status === 'draft') {
        return;
    }

    try {
        const { subject, grade, title, _id } = request;

        // Находим всех хелперов, подходящих по предмету, и исключаем автора
        const helpersForSubject = await User.find({
            'roles.helper': true,
            subjects: subject,
            _id: { $ne: author._id }
        });

        if (helpersForSubject.length === 0) {
            return; // Некого уведомлять
        }

        const helperIds = helpersForSubject.map(h => h._id);

        // 1. Уведомления на сайте
        const notificationPromises = helperIds.map(helperId => {
            return createAndSendNotification({
                user: helperId,
                type: 'new_request_for_subject',
                title: `Новая заявка по вашему предмету: ${subject}`,
                message: `Пользователь ${author.username} опубликовал заявку \"${title}\" по предмету ${subject} для ${grade} класса.`,
                link: `/requests/${_id}`
            });
        });
        await Promise.all(notificationPromises);

        // 2. Уведомления в Telegram
        const tgUsers = helpersForSubject.filter(h =>
            h.telegramIntegration && h.telegramIntegration.notificationsEnabled && h.telegramId
        );

        for (const tgUser of tgUsers) {
            const messageText = `🔔 *Новая заявка по вашему предмету!* 🔔\n\n*Тема:* ${title}\n*Предмет:* ${subject}, ${grade} класс\n\nВы можете откликнуться на нее на сайте.`;
            await sendTelegramMessage(tgUser.telegramId, messageText, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "👀 Посмотреть заявку", url: `${process.env.FRONTEND_URL}/requests/${_id}` }]
                    ]
                }
            });
        }
    } catch (error) {
        console.error("Ошибка при оповещении хелперов о новой заявке:", error);
        // Не бросаем ошибку дальше, чтобы не сломать основной процесс создания заявки
    }
};

// Middleware для декодирования имен файлов
const decodeFileNames = (req, res, next) => {
  if (req.files && req.files.length > 0) {
    req.files.forEach(file => {
      file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    });
  }
  next();
};

// ЭКСПОРТИРУЕМ ФУНКЦИЮ, ЧТОБЫ ПРИНЯТЬ io И ИНКАПСУЛИРОВАТЬ ВСЮ ЛОГИКУ
export default ({ io }) => {
  const router = express.Router(); // СОЗДАЕМ РОУТЕР ВНУТРИ

  // Применяем общий лимитер ко всем роутам в этом файле, которые идут ПОСЛЕ этого мидлваря
  // и требуют авторизации (т.к. `generalLimiter` зависит от `req.user`)
  router.use(protect, generalLimiter);

  // Middleware для проверки прав на редактирование/удаление
  const checkEditDeletePermission = async (req, res, next) => {
    try {
        const request = await Request.findById(req.params.id).populate('author', 'username _id');
        if (!request) {
            return res.status(404).json({ msg: 'Запрос не найден' });
        }

        const user = req.user; 
        const isAuthor = request.author._id.toString() === user.id;
        const isPrivileged = user.roles.admin || user.roles.moderator;
        
        if (!isAuthor && !isPrivileged) {
            return res.status(403).json({ msg: 'У вас нет прав для выполнения этого действия' });
        }
        
        req.request = request; // Передаем найденный запрос дальше
        req.isPrivilegedUser = isPrivileged; // Флаг, что у пользователя есть особые права
        req.isModeratorAction = isPrivileged && !isAuthor; // Флаг, что модер/админ действует над чужой заявкой
        next();
    } catch (err) {
        console.error(err);
        res.status(500).send('Ошибка сервера при проверке прав');
    }
  };

/**
 * @swagger
 * /api/requests:
 *   get:
 *     summary: Получить список заявок с фильтрацией и поиском
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: 'integer', default: 1 }
 *         description: Номер страницы
 *       - in: query
 *         name: limit
 *         schema: { type: 'integer', default: 10 }
 *         description: Количество заявок на странице
 *       - in: query
 *         name: subjects
 *         schema: { type: 'string' }
 *         description: Фильтр по предметам (через запятую, например, "Математика,Физика")
 *       - in: query
 *         name: grade
 *         schema: { type: 'integer' }
 *         description: Фильтр по классу
 *       - in: query
 *         name: status
 *         schema: { type: 'string', enum: ['open', 'assigned', 'completed', 'cancelled'] }
 *         description: Фильтр по статусу (по умолчанию 'open', если не указан)
 *       - in: query
 *         name: authorId
 *         schema: { type: 'string' }
 *         description: Фильтр по ID автора
 *       - in: query
 *         name: helperId
 *         schema: { type: 'string' }
 *         description: Фильтр по ID помощника
 *       - in: query
 *         name: excludeAuthor
 *         schema: { type: 'string' }
 *         description: Фильтр для исключения автора
 *       - in: query
 *         name: search
 *         schema: { type: 'string' }
 *         description: Поиск по названию и описанию заявки
 *       - in: query
 *         name: sortBy
 *         schema: { type: 'string', enum: ['createdAt_desc', 'createdAt_asc', 'updatedAt_desc', 'updatedAt_asc'], default: 'createdAt_desc' }
 *         description: Поле и направление сортировки
 *     responses:
 *       200:
 *         description: Список заявок
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requests:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Request' }
 *                 totalPages: { type: 'integer' }
 *                 currentPage: { type: 'integer' }
 *                 totalRequests: { type: 'integer' }
 *       400:
 *         description: Ошибка валидации параметров
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/', [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('subjects').optional().trim().escape(),
    query('grade').optional().isInt({ min: 1, max: 11 }).toInt(),
    query('status').optional().custom(value => {
        const allowedStatuses = ['draft', 'open', 'in_progress', 'pending', 'assigned', 'completed', 'closed', 'cancelled'];
        const receivedStatuses = value.split(',');
        return receivedStatuses.every(s => allowedStatuses.includes(s.trim()));
    }).withMessage('Указан недопустимый статус.'),
    query('authorId').optional().isMongoId(),
    query('helperId').optional().isMongoId(),
    query('excludeAuthor').optional().isMongoId(),
    query('search').optional().trim().escape(),
    query('sortBy').optional().isIn(['createdAt_desc', 'createdAt_asc', 'updatedAt_desc', 'updatedAt_asc'])
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { page = 1, limit = 10, subjects, grade, status, authorId, helperId, search, sortBy = 'createdAt_desc', excludeAuthor } = req.query;

        const filters = {};
        
        if (subjects) {
            const subjectsArray = subjects.split(',').map(s => s.trim());
            filters.subject = { $in: subjectsArray };
        }
        
        if (grade) filters.grade = grade;
        
        if (status) {
            const statusArray = status.split(',').map(s => s.trim());
            filters.status = { $in: statusArray };
        } else if (!authorId && !helperId) {
            filters.status = { $ne: 'draft' };
        }

        if (authorId) {
            filters.author = authorId;
        } else if (excludeAuthor) {
            filters.author = { $ne: excludeAuthor };
        }

        if (helperId) filters.helper = helperId;

        if (search) {
            filters.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const sortParams = {};
        if (sortBy) {
            const [field, order] = sortBy.split('_');
            sortParams[field] = order === 'asc' ? 1 : -1;
        }

        const requests = await Request.find(filters)
            .populate('author', 'username _id rating avatar')
            .populate('helper', 'username _id rating avatar')
            .sort(sortParams)
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const totalRequests = await Request.countDocuments(filters);

        res.json({
            requests,
            totalPages: Math.ceil(totalRequests / limit),
            currentPage: page,
            totalRequests
        });
    } catch (err) {
        console.error('Ошибка при получении заявок:', err.message);
        res.status(500).send('Ошибка сервера');
    }
});

/**
 * @swagger
 * /api/requests:
 *   post:
 *     summary: Создать новую заявку на помощь
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, subject, grade]
 *             properties:
 *               title: { type: 'string', minLength: 5, maxLength: 100 }
 *               description: { type: 'string', minLength: 10 }
 *               subject: { type: 'string' }
 *               grade: { type: 'integer', minimum: 1, maximum: 11 }
 *               topic: { type: 'string', nullable: true }
 *     responses:
 *       201:
 *         description: Заявка успешно создана
 *       400:
 *         description: Ошибка валидации
 *       401:
 *         description: Не авторизован
 */
router.post('/', uploadAttachments, createRequestLimiter, [
    body('title').trim().isLength({ min: 5, max: 100 }).withMessage('Заголовок должен быть от 5 до 100 символов'),
    body('description').optional().trim(),
    body('subject').optional().trim().escape(),
    body('grade').optional().isInt({ min: 1, max: 11 }),
    body('topic').optional().trim().escape(),
    body('isDraft').optional().isBoolean(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { title, description, subject, grade, topic } = req.body;
        const isDraft = req.body.isDraft === 'true';
        const author = req.user.id;
        
        // --->>> ИНТЕГРАЦИЯ GEMINI (ТОЛЬКО ДЛЯ ПУБЛИКАЦИИ) <<<---
        let finalTitle = title;
        let finalDescription = description;

        if (!isDraft) {
            // Сначала все стандартные проверки
            if (!description || description.trim().length < 10) {
                return res.status(400).json({ errors: [{ msg: 'Описание должно быть минимум 10 символов' }] });
            }
            if (!subject || subject.trim().length === 0) {
                return res.status(400).json({ errors: [{ msg: 'Предмет обязателен' }] });
            }
            if (!grade) {
                return res.status(400).json({ errors: [{ msg: 'Класс обязателен' }] });
            }

            const user = await User.findById(author);
            if (!user.telegramId) {
                return res.status(403).json({ 
                    message: 'Для публикации заявки необходимо привязать Telegram аккаунт в профиле.',
                    code: 'TELEGRAM_REQUIRED'
                });
            }

            // А теперь модерация
            const moderatedContent = await geminiService.moderateRequest(title, description);

            if (!moderatedContent.is_safe) {
                return res.status(400).json({
                    errors: [{
                        msg: `Ваша заявка отклонена модерацией: ${moderatedContent.rejection_reason}`,
                        param: "description",
                    }],
                });
            }
            finalTitle = moderatedContent.suggested_title;
            finalDescription = moderatedContent.suggested_description;
        }
        // --->>> КОНЕЦ ИНТЕГРАЦИИ <<<---

        const request = new Request({
            title: finalTitle,
            description: finalDescription,
            subject,
            grade,
            topic,
            author,
            status: isDraft ? 'draft' : 'open'
        });

        await request.save();

        // Обработка вложений после сохранения основной заявки
        if (req.files && req.files.length > 0) {
            const attachments = req.files.map(file => ({
                filename: file.filename,
                path: `/uploads/attachments/${file.filename}`,
                mimetype: file.mimetype,
                size: file.size,
                // FIX: Декодируем имя файла прямо здесь
                originalName: Buffer.from(file.originalname, 'latin1').toString('utf8')
            }));
            request.attachments = attachments;
            await request.save();
        }
        
        const populatedRequest = await Request.findById(request._id)
            .populate('author', 'username rating avatar');

        if (populatedRequest.status !== 'draft') {
            io.emit('new_request', populatedRequest);
            // --->>> ИСПОЛЬЗУЕМ НОВУЮ ФУНКЦИЮ <<<---
            await notifyHelpersAboutNewRequest(populatedRequest, req.user);
        }

        res.status(201).json(populatedRequest);

    } catch (err) {
        console.error('Ошибка при создании заявки:', err.message);
        res.status(500).send('Ошибка сервера');
    }
});

/**
 * @swagger
 * /api/requests/{id}/edit:
 *   get:
 *     summary: Получить данные заявки для редактирования (защищенный)
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string', format: 'mongoId' }
 *         description: ID заявки
 *     responses:
 *       200:
 *         description: Данные заявки
 *       403:
 *         description: Нет прав на редактирование
 *       404:
 *         description: Заявка не найдена
 */
router.get('/:id/edit', protect, checkEditDeletePermission, async (req, res) => {
  // checkEditDeletePermission уже нашел заявку и проверил права.
  // Просто возвращаем ее.
  res.json(req.request);
});

/**
 * @swagger
 * /api/requests/{id}:
 *   get:
 *     summary: Получить детальную информацию о заявке (публичный)
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string', format: 'mongoId' }
 *         description: ID заявки
 *     responses:
 *       200:
 *         description: Детальная информация о заявке
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Request' }
 *       401:
 *         description: Не авторизован
 *       404:
 *         description: Заявка не найдена
 */
router.get('/:id', [
    param('id').isMongoId().withMessage('Некорректный ID запроса')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    try {
        const request = await Request.findById(req.params.id)
            .populate('author', 'username _id rating avatar roles.moderator roles.admin')
            .populate('helper', 'username _id rating avatar roles.moderator roles.admin');
        

        if (!request) {
            return res.status(404).json({ msg: 'Запрос не найден' });
        }
        
        // Явное добавление editReason, если оно есть
        const responseData = { ...request.toObject() };
        if (request.editedByAdminInfo && request.editedByAdminInfo.reason) {
            responseData.editReason = request.editedByAdminInfo.reason;
        }

        const jsonResponse = JSON.stringify(responseData);
        res.setHeader('Content-Type', 'application/json');
        res.send(jsonResponse);

    } catch (err) {
        console.error(err);
        res.status(500).send('Ошибка сервера');
    }
});

/**
 * @swagger
 * /api/requests/{id}/assign/{helperId}:
 *   post:
 *     summary: Назначить помощника на заявку (для админа/модератора)
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string' }
 *         description: ID заявки
 *       - in: path
 *         name: helperId
 *         required: true
 *         schema: { type: 'string' }
 *         description: ID помощника
 *     responses:
 *       200: { description: 'Помощник успешно назначен' }
 *       400: { description: 'Некорректный ID или помощник не может быть назначен' }
 *       403: { description: 'Нет прав для назначения (например, не админ)' }
 *       404: { description: 'Заявка или помощник не найден' }
 */
router.post('/:id/assign/:helperId', protect, isModOrAdmin, [
    param('id').isMongoId().withMessage('Неверный ID заявки'),
    param('helperId').isMongoId().withMessage('Неверный ID помощника')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const request = await Request.findById(req.params.id).populate('author', '_id username');
        if (!request) {
            return res.status(404).json({ msg: 'Заявка не найдена' });
        }

        if (request.status !== 'open') {
            return res.status(400).json({ msg: 'Можно назначить помощника только на открытую заявку' });
        }

        const helper = await User.findById(req.params.helperId);
        if (!helper || !helper.roles || !helper.roles.helper) {
            return res.status(404).json({ msg: 'Помощник не найден или пользователь не является помощником' });
        }

        if (request.author._id.toString() === helper._id.toString()) {
            return res.status(400).json({ msg: 'Автор не может быть назначен помощником на свою же заявку' });
        }

        request.helper = helper._id;
        request.status = 'assigned';
        await request.save();

        const populatedRequest = await Request.findById(request._id)
            .populate('author', 'username _id rating avatar')
            .populate('helper', 'username _id rating avatar');

        io.emit('request_updated', populatedRequest);

        await createAndSendNotification({
            user: helper._id,
            type: 'request_assigned_to_you',
            title: `Вас назначили на заявку!`,
            message: `Вы были назначены помощником на заявку \"${request.title}\".`,
            link: `/request/${request._id}`,
            relatedEntity: { requestId: request._id }
        });
        
        if (request.author && request.author._id.toString() !== helper._id.toString()) {
            await createAndSendNotification({
                user: request.author._id,
                type: 'request_taken_by_helper', 
                title: `На вашу заявку назначен помощник!`,
                message: `Пользователь ${helper.username} был назначен на вашу заявку \"${request.title}\".`,
                link: `/request/${request._id}`,
                relatedEntity: { requestId: request._id, userId: helper._id }
            });
        }
        res.json(populatedRequest);
    } catch (err) {
        console.error('Ошибка при назначении помощника:', err.message);
        if (err.kind === 'ObjectId') {
            return res.status(400).json({ msg: 'Неверный формат ID' });
        }
        res.status(500).send('Ошибка сервера');
    }
});


/**
 * @swagger
 * /api/requests/{id}/take:
 *   post:
 *     summary: Взять заявку в работу (для помощников)
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string' }
 *     responses:
 *       200: { description: 'Заявка успешно взята' }
 *       400: { description: 'Заявку нельзя взять' }
 *       403: { description: 'Только помощники могут брать заявки' }
 *       404: { description: 'Заявка не найдена' }
 */
router.post('/:id/take', protect, isHelper, [ // isHelper middleware проверяет req.user.roles.helper
    param('id').isMongoId().withMessage('Неверный ID заявки')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const request = await Request.findById(req.params.id).populate('author', '_id username');
        if (!request) {
            return res.status(404).json({ msg: 'Заявка не найдена' });
        }

        if (request.author._id.toString() === req.user.id) {
            return res.status(400).json({ msg: 'Вы не можете взять свою собственную заявку' });
        }

        if (request.status !== 'open') {
            return res.status(400).json({ msg: 'Эту заявку уже взял другой помощник, она закрыта или отменена' });
        }

        request.helper = req.user.id;
        request.status = 'assigned';
        await request.save();
        
        const populatedRequest = await Request.findById(request._id)
            .populate('author', 'username _id')
            .populate('helper', 'username _id');

        io.emit('request_updated', populatedRequest);

        if (request.author) {
             await createAndSendNotification({
                user: request.author._id,
                type: 'request_taken_by_helper',
                title: `Вашу заявку взяли!`,
                message: `Помощник ${req.user.username} взял вашу заявку \"${request.title}\".`,
                link: `/request/${request._id}`,
                relatedEntity: { requestId: request._id, userId: req.user.id }
            });
        }
        res.json(populatedRequest);
    } catch (err) {
        console.error('Ошибка при взятии заявки:', err.message);
         if (err.kind === 'ObjectId') {
            return res.status(400).json({ msg: 'Неверный формат ID заявки' });
        }
        res.status(500).send('Ошибка сервера');
    }
});

/**
 * @swagger
 * /api/requests/{id}/complete:
 *   post:
 *     summary: Отметить заявку как выполненную
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string' }
 *     responses:
 *       200: { description: 'Заявка успешно отмечена как выполненная' }
 *       400: { description: 'Заявка не может быть отмечена (не тот статус)' }
 *       403: { description: 'Только автор или помощник могут завершить' }
 *       404: { description: 'Заявка не найдена' }
 */
router.post('/:id/complete', protect, [
    param('id').isMongoId().withMessage('Неверный ID заявки')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const request = await Request.findById(req.params.id)
            .populate('author', '_id username')
            .populate('helper', '_id username');
        if (!request) {
            return res.status(404).json({ msg: 'Заявка не найдена' });
        }

        const currentUserId = req.user.id;
        const isAuthor = request.author && request.author._id.toString() === currentUserId;
        const isHelper = request.helper && request.helper._id.toString() === currentUserId;

        if (!isAuthor && !isHelper) {
            return res.status(403).json({ msg: 'Только автор или назначенный помощник могут завершить эту заявку' });
        }

        if (request.status !== 'assigned') {
            return res.status(400).json({ msg: 'Заявку можно завершить только если она в статусе "assigned"' });
        }

        request.status = 'completed';
        // request.completedAt = Date.now(); // Можно добавить, если нужно
        await request.save();

        const populatedRequest = await Request.findById(request._id)
            .populate('author', 'username _id rating avatar')
            .populate('helper', 'username _id rating avatar');

        io.emit('request_updated', populatedRequest);

        const notificationTitle = `Заявка \"${request.title}\" выполнена`;
        const notificationLink = `/request/${request._id}`;
        const commonRelatedEntity = { requestId: request._id };

        // Уведомление автору (если завершил хелпер и автор не он сам)
        if (isHelper && request.author && request.author._id.toString() !== currentUserId) {
            await createAndSendNotification({
                user: request.author._id,
                type: 'request_marked_completed',
                title: notificationTitle,
                message: `Помощник ${req.user.username} отметил вашу заявку как выполненную.`,
                link: notificationLink,
                relatedEntity: commonRelatedEntity
            });
        }

        // Уведомление хелперу (если завершил автор и хелпер не он сам)
        if (isAuthor && request.helper && request.helper._id.toString() !== currentUserId) {
             await createAndSendNotification({
                user: request.helper._id,
                type: 'request_marked_completed',
                title: notificationTitle,
                message: `Автор ${req.user.username} отметил вашу заявку как выполненную.`,
                link: notificationLink,
                relatedEntity: commonRelatedEntity
            });
        }
        

        // --- УВЕДОМЛЕНИЕ ХЕЛПЕРУ О ЗАКРЫТИИ ЗАЯВКИ ---
        if (request.helper) {
            await createAndSendNotification({
                user: request.helper,
                type: 'request_completed',
                title: `Заявка "${request.title}\" была закрыта`,
                message: 'Автор заявки отметил ее как выполненную. Теперь вы можете оставить отзыв.',
                link: `/request/${request._id}`
            });
        }

        res.json(request);
    } catch (err) {
        console.error('Ошибка при завершении заявки:', err.message);
        if (err.kind === 'ObjectId') {
            return res.status(400).json({ msg: 'Неверный формат ID заявки' });
        }
        res.status(500).send('Ошибка сервера');
    }
});

/**
 * @swagger
 * /api/requests/{id}/cancel:
 *   post:
 *     summary: Отменить заявку
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string' }
 *     responses:
 *       200: { description: 'Заявка успешно отменена' }
 *       400: { description: 'Нельзя отменить (не тот статус)' }
 *       403: { description: 'Только автор может отменить' }
 *       404: { description: 'Заявка не найдена' }
 */
router.post('/:id/cancel', protect, [
    param('id').isMongoId().withMessage('Неверный ID заявки')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const request = await Request.findById(req.params.id).populate('author helper', '_id username');
        if (!request) {
            return res.status(404).json({ msg: 'Заявка не найдена' });
        }

        const currentUserId = req.user.id;
        const isAuthor = request.author && request.author._id.toString() === currentUserId;

        if (!isAuthor) { // Пока только автор
            return res.status(403).json({ msg: 'Только автор может отменить эту заявку' });
        }

        if (request.status === 'completed' || request.status === 'cancelled') {
            return res.status(400).json({ msg: `Нельзя отменить заявку в статусе \"${request.status}\"` });
        }
        
        const oldStatus = request.status;
        request.status = 'cancelled';
        // request.cancelledAt = Date.now(); // Можно добавить
        // request.cancelledBy = currentUserId; // Можно добавить
        await request.save();

        const populatedRequest = await Request.findById(request._id)
            .populate('author', 'username _id rating avatar')
            .populate('helper', 'username _id rating avatar');
            
        io.emit('request_updated', populatedRequest);

        // Уведомление хелперу, если он был назначен и отменил автор
        if (oldStatus === 'assigned' && request.helper && isAuthor) {
             await createAndSendNotification({
                user: request.helper._id,
                type: 'request_status_changed', // или более конкретный тип 'request_cancelled_by_author'
                title: `Заявка \"${request.title}\" отменена`,
                message: `Автор ${req.user.username} отменил заявку, на которую вы были назначены.`,
                link: `/request/${request._id}`,
                relatedEntity: { requestId: request._id }
            });
        }

        res.json(request);
    } catch (err) {
        console.error('Ошибка при отмене заявки:', err.message);
         if (err.kind === 'ObjectId') {
            return res.status(400).json({ msg: 'Неверный формат ID заявки' });
        }
        res.status(500).send('Ошибка сервера');
    }
});

/**
 * @swagger
 * /api/requests/{id}:
 *   put:
 *     summary: Обновить заявку
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
   *         description: ID заявки
 *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             allOf:
   *               - $ref: '#/components/schemas/Request'
   *               - type: object
   *                 properties:
   *                   editReason:
   *                     type: string
   *                     description: Причина редактирования (для админов/модераторов)
   *     responses:
   *       200:
   *         description: Заявка успешно обновлена
   *       403:
   *         description: Нет прав на редактирование
   */
  router.put('/:id', protect, checkEditDeletePermission, uploadAttachments, [
    // Валидация остается прежней, но добавляем необязательное поле
    body('title').optional().trim().isLength({ min: 5, max: 100 }),
    body('description').optional().trim().isLength({ min: 10 }),
    body('subject').optional().trim().notEmpty().escape(),
    body('grade').optional().isInt({ min: 1, max: 11 }),
    body('editReason').optional().trim().escape(),
    body('deletedAttachments').optional().isString() // Было isArray(), меняем на isString()
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        let { title, description, subject, grade, urgency, editReason, deletedAttachments } = req.body;
        let request = req.request; // Получаем из middleware

        // 1. Удаляем старые вложения, если есть
        if (deletedAttachments) {
            try {
                const attachmentsToDelete = JSON.parse(deletedAttachments);
                if (Array.isArray(attachmentsToDelete)) {
                     // Удаляем файлы с диска
                    request.attachments.forEach(att => {
                        if (attachmentsToDelete.includes(att.filename)) {
                            const filePath = path.join(process.cwd(), 'uploads/attachments', att.filename);
                            if (fs.existsSync(filePath)) {
                                fs.unlinkSync(filePath);
                            }
                        }
                    });

                    // Удаляем из массива в базе
                    request.attachments = request.attachments.filter(
                        att => !attachmentsToDelete.includes(att.filename)
                    );
                }
            } catch(e) {
                console.error("Ошибка парсинга списка удаляемых файлов:", e);
                // Не прерываем выполнение, просто логируем ошибку
            }
        }

        // 2. Добавляем новые вложения
        if (req.files && req.files.length > 0) {
            const newAttachments = req.files.map(file => ({
                filename: file.filename,
                path: `/uploads/attachments/${file.filename}`,
                mimetype: file.mimetype,
                size: file.size,
                // FIX: Декодируем имя файла прямо здесь
                originalName: Buffer.from(file.originalname, 'latin1').toString('utf8')
            }));
            request.attachments.push(...newAttachments);
        }

        // --->>> ВОЗВРАЩАЕМ МОДЕРАЦИЮ ПРИ РЕДАКТИРОВАНИИ <<<---
        if (title || description) {
            // Если это НЕ действие модератора над чужой заявкой, то отправляем на проверку.
            // Это покрывает и обычных юзеров, и модеров, редактирующих СВОИ заявки.
            if (!req.isModeratorAction) {
                const newTitle = title || request.title;
                const newDescription = description || request.description;
                const moderatedContent = await geminiService.moderateRequest(newTitle, newDescription);

                if (!moderatedContent.is_safe) {
                    return res.status(400).json({
                        errors: [{
                            msg: `Ваш текст не прошел модерацию: ${moderatedContent.rejection_reason}`,
                            param: description ? "description" : "title",
                        }],
                    });
                }
                // Если все ок, используем предложенные версии
                request.title = moderatedContent.suggested_title;
                request.description = moderatedContent.suggested_description;
            } else {
                // А если это модер/админ, то просто применяем его правки напрямую
                if (title) request.title = title;
                if (description) request.description = description;
            }
        }
        // --->>> КОНЕЦ ИНТЕГРАЦИИ <<<---

        // Обновляем остальные поля, если они были переданы
        if (subject) request.subject = subject;
        if (grade) request.grade = grade;
        if (urgency) request.urgency = urgency;

        // Если это действие модератора/админа, сохраняем причину
        if (req.isModeratorAction && editReason) {
            request.editedByAdminInfo = {
                editorId: req.user.id,
                reason: editReason,
                editedAt: new Date()
            };
            
            // Отправляем уведомление автору
            if (request.author.toString() !== req.user.id) {
                await createAndSendNotification({
                    user: request.author,
                    type: 'request_edited_by_admin',
                    title: 'Ваша заявка была отредактирована',
                    message: `Модератор ${req.user.username} отредактировал вашу заявку \"${request.title}\". Причина: \"${editReason}\"`,
                    link: `/request/${request._id}`,
                    relatedEntity: { requestId: request._id, editorId: req.user.id }
                });
            }
        }
        
        const updatedRequest = await request.save();
        res.json(updatedRequest);

    } catch (err) {
        console.error('Ошибка при обновлении заявки:', err);
        res.status(500).send('Ошибка сервера');
    }
  });

  /**
   * @swagger
   * /api/requests/{id}/status:
   *   put:
   *     summary: Обновить статус заявки (например, завершить)
   *     tags: [Requests]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: 'string', description: 'ID заявки' }
   *     requestBody:
   *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
   *             required: [status]
 *             properties:
   *               status:
   *                 type: string
   *                 enum: [open, assigned, in_progress, completed, cancelled, on_hold]
   *                 description: Новый статус заявки
 *     responses:
   *       200:
   *         description: Статус успешно обновлен
   *       400:
   *         description: Некорректные данные
   *       403:
   *         description: Нет прав для выполнения этого действия
   *       404:
   *         description: Заявка не найдена
   */
  router.put('/:id/status', protect, [
    param('id').isMongoId().withMessage('Некорректный ID заявки'),
    body('status').isIn(['completed', 'cancelled', 'closed', 'in_progress', 'open'])
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
          const { id } = req.params;
          const { status: newStatus } = req.body;
          const userId = req.user.id;
  
          const request = await Request.findById(id);
  
        if (!request) {
            return res.status(404).json({ msg: 'Заявка не найдена' });
        }

          const oldStatus = request.status;
          const isAuthor = request.author.toString() === userId;
  
          // --- ПРОВЕРКИ ДОСТУПА ---
          if (newStatus === 'open' && oldStatus === 'draft') {
              if (!isAuthor) {
                  return res.status(403).json({ msg: 'Только автор может опубликовать черновик.' });
              }

              // --->>> НОВАЯ ЛОГИКА: МОДЕРАЦИЯ ПЕРЕД ПУБЛИКАЦИЕЙ ЧЕРНОВИКА <<<---
              const moderatedContent = await geminiService.moderateRequest(request.title, request.description);

              if (!moderatedContent.is_safe) {
                  // Если модерация не пройдена, НЕ меняем статус, а возвращаем ошибку
                  return res.status(400).json({
                      errors: [{
                          msg: `Ваша заявка отклонена модерацией: ${moderatedContent.rejection_reason}`,
                          param: "description", // Условно
                      }],
                      code: 'MODERATION_FAILED'
                  });
              }
              // Если все ок, обновляем заявку отредактированными данными
              request.title = moderatedContent.suggested_title;
              request.description = moderatedContent.suggested_description;
              // --->>> КОНЕЦ НОВОЙ ЛОГИКИ <<<---

              // Проверка на заполненность полей перед публикацией
              if (!request.description || !request.subject || !request.grade) {
                  return res.status(400).json({ msg: 'Перед публикацией необходимо заполнить описание, предмет и класс.' });
              }
              // Проверка на привязку Telegram
              const user = await User.findById(userId);
              if (!user.telegramId) {
                  return res.status(403).json({
                      message: 'Для публикации заявки необходимо привязать Telegram аккаунт в профиле.',
                      code: 'TELEGRAM_REQUIRED'
                  });
              }
          } else if (newStatus === 'completed') {
              if (!isAuthor) {
                  return res.status(403).json({ msg: 'Только автор может завершить заявку.' });
              }
          } else {
              // TODO: Добавить другие проверки, если они нужны для других статусов
          }
  
          // --- ОБНОВЛЕНИЕ ---
          request.status = newStatus;
          if (newStatus === 'completed') {
              request.completedAt = new Date();
          }
        await request.save();

          const populatedRequest = await Request.findById(id)
              .populate('author', 'username _id rating avatar')
              .populate('helper', 'username _id rating avatar');
  
          // --- УВЕДОМЛЕНИЯ И СОКЕТЫ ---
          if (oldStatus === 'draft' && newStatus === 'open') {
              io.emit('new_request', populatedRequest);
              
              // --->>> ИСПОЛЬЗУЕМ НОВУЮ ФУНКЦИЮ <<<---
              await notifyHelpersAboutNewRequest(populatedRequest, req.user);

          } else {
              io.emit('request_updated', populatedRequest);
          }
  
          if (newStatus === 'completed' && request.helper) {
              await createAndSendNotification({
                  user: request.helper,
                  type: 'request_completed',
                  title: `Заявка "${request.title}" была закрыта`,
                  message: 'Автор заявки отметил ее как выполненную. Теперь вы можете оставить отзыв.',
                  link: `/request/${request._id}`
              });
          }
  
          res.json(populatedRequest);
  
      } catch (err) {
          console.error('Ошибка при обновлении статуса заявки:', err.message);
        res.status(500).send('Ошибка сервера');
    }
});

/**
 * @route   DELETE api/requests/:id
 * @desc    Удалить заявку (доступно только автору)
 * @access  Private
 */
router.delete('/:id', protect, checkEditDeletePermission, [
    body('confirmationCode').optional().isString().isLength({ min: 6, max: 6 }),
    body('deleteReason').optional().isString().trim()
], async (req, res) => {
  try {
    const { confirmationCode, deleteReason } = req.body;
    const actingUser = req.user;
    const request = req.request; // из checkEditDeletePermission

    // --- ЛОГИКА 2FA ДЛЯ МОДЕРАТОРОВ ---
    if (req.isModeratorAction) {
      // Если это модер, но не админ, требуем 2FA
      if (actingUser.role !== 'admin') {
        if (!actingUser.telegramId) {
          return res.status(403).json({ msg: 'Для выполнения этого действия ваш аккаунт должен быть привязан к Telegram.' });
        }

        const redisKey = `mod-action:delete-request:${actingUser.id}:${request._id}`;

        if (!confirmationCode) {
          // Этап 1: Генерация и отправка кода
          const code = crypto.randomInt(100000, 999999).toString();
          await redis.set(redisKey, code, 'EX', 300); // 5 минут

          const message = `Для подтверждения удаления заявки "**${request.title}**" введите этот код:\n\n` +
                          `\`${code}\`\n\n` +
                          `Причина удаления (указанная вами): ${deleteReason || 'не указана'}.`;
          await sendTelegramMessage(actingUser.telegramId, message);

          return res.status(400).json({ 
              confirmationRequired: true,
              message: 'Требуется подтверждение. Код отправлен вам в Telegram.' 
          });
        } else {
          // Этап 2: Проверка кода
          const storedCode = await redis.get(redisKey);
          if (storedCode !== confirmationCode) {
            return res.status(400).json({ msg: 'Неверный код подтверждения.' });
          }
          await redis.del(redisKey); // Удаляем использованный код
        }
      }
      // Если это админ или модер с верным кодом, уведомляем автора
      await createAndSendNotification({
          user: request.author,
          type: 'request_deleted_by_admin',
          title: 'Ваша заявка была удалена',
          message: `Модератор ${actingUser.username} удалил вашу заявку \"${request.title}\". Причина: \"${deleteReason || 'не указана'}.\"`,
          link: `/request/${request._id}`,
          relatedEntity: { requestId: request._id }
      });
    }

    // --- ОБЩАЯ ЛОГИКА УДАЛЕНИЯ ДЛЯ ВСЕХ (и для автора, и для модератора после проверки) ---
    
    await Request.findByIdAndDelete(request._id);
    await Message.deleteMany({ request: request._id });
    
    // Оповещение через сокеты об удалении
    io.emit('request_deleted', { id: request._id });
    
    res.json({ msg: 'Запрос и все связанные данные успешно удалены' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Ошибка сервера');
  }
});

/**
 * @swagger
 * /api/requests/{id}/reopen:
 *   post:
 *     summary: Переоткрыть заявку, если помощь не устроила
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string', description: 'ID заявки' }
 *     responses:
 *       200: { description: 'Заявка успешно переоткрыта' }
 *       403: { description: 'Только автор может выполнить это действие' }
 *       404: { description: 'Заявка не найдена' }
 *       400: { description: 'Неверный статус заявки для этого действия' }
 */
router.post('/:id/reopen', protect, [
    param('id').isMongoId().withMessage('Неверный ID заявки')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const request = await Request.findById(req.params.id).populate('helper', '_id username');
        if (!request) {
            return res.status(404).json({ msg: 'Заявка не найдена' });
        }

        if (request.author.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Только автор может переоткрыть свою заявку.' });
        }

        if (!['assigned', 'in_progress'].includes(request.status)) {
            return res.status(400).json({ msg: 'Переоткрыть можно только заявку, которая находится в работе.' });
        }
        
        const formerHelper = request.helper;

        // Архивируем сообщения в чате, связанные с этой сессией помощи
        // Важно: мы не удаляем их, а помечаем, чтобы их можно было потом посмотреть (например, админом)
        const updateResult = await Message.updateMany(
            { requestId: request._id }, 
            { $set: { isArchived: true } }
        );

        // console.log(`[ARCHIVE] Request ID: ${request._id}. Messages update result:`, updateResult);

        // Сбрасываем хелпера и возвращаем статус 'open'
        request.helper = null;
        request.status = 'open';
        request.updatedAt = Date.now();
        await request.save();

        const populatedRequest = await Request.findById(request._id)
            .populate('author', 'username _id rating avatar')
            .populate('helper', 'username _id rating avatar');

        io.emit('request_updated', populatedRequest);

        // Уведомление бывшему хелперу
        if (formerHelper) {
           await createAndSendNotification({
                user: formerHelper._id,
                type: 'request_reopened_by_author',
                title: 'Заявка была возвращена в работу',
                message: `Автор заявки "${request.title}\" не получил решения и вернул ее в общий список. Текущий чат архивирован.`,
                link: `/request/${request._id}`,
                relatedEntity: { requestId: request._id }
            });
        }
        
        // Уведомление автору для подтверждения
        await createAndSendNotification({
            user: request.author,
            type: 'request_reopened_by_you',
            title: 'Вы вернули заявку в работу',
            message: `Ваша заявка "${request.title}\" снова открыта и видна другим помощникам. Старый чат архивирован.`,
            link: `/request/${request._id}`,
            relatedEntity: { requestId: request._id }
        });

        res.json({ msg: 'Заявка успешно переоткрыта и доступна для других помощников.' });

    } catch (err) {
        console.error('Ошибка при переоткрытии заявки:', err.message);
         if (err.kind === 'ObjectId') {
            return res.status(400).json({ msg: 'Неверный формат ID заявки' });
        }
        res.status(500).send('Ошибка сервера');
    }
});

  return router; // ВОЗВРАЩАЕМ СКОНФИГУРИРОВАННЫЙ РОУТЕР В КОНЦЕ
};