import express from 'express';
import { body, validationResult, param, query } from 'express-validator';
import Request from '../models/Request.js';
import User from '../models/User.js'; // Убедимся, что User импортирован
import Message from '../models/Message.js'; // Импортируем Message
import { protect, isHelper, isAdmin, isModOrAdmin } from '../middleware/auth.js';
import { createAndSendNotification } from './notifications.js'; // Правильный путь импорта
import mongoose from 'mongoose';
import { sendTelegramMessage } from '../utils/telegram.js'; // <-- ИМПОРТ

const router = express.Router();

// Middleware для проверки прав на редактирование/удаление
const checkEditDeletePermission = async (req, res, next) => {
    try {
        const request = await Request.findById(req.params.id).populate('author', 'username _id');
        if (!request) {
            return res.status(404).json({ msg: 'Запрос не найден' });
        }

        const user = await User.findById(req.user.id);
        const isAuthor = request.author.toString() === req.user.id;
        const isAdminOrModerator = user.roles.admin || user.roles.moderator;
        
        if (!isAuthor && !isAdminOrModerator) {
            return res.status(403).json({ msg: 'У вас нет прав для выполнения этого действия' });
        }
        
        req.request = request; // Передаем найденный запрос дальше
        req.isModeratorAction = isAdminOrModerator && !isAuthor; // Флаг, что действует модер/админ
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
 *         name: subject
 *         schema: { type: 'string' }
 *         description: Фильтр по предмету
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
router.get('/', protect, [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('authorId').optional().isMongoId(),
    query('helperId').optional().isMongoId(),
    query('subject').optional().trim().escape(),
    query('status').optional().isIn(['open', 'in_progress', 'completed', 'closed']),
    query('grade').optional().isInt({ min: 1, max: 11 }).toInt(),
    query('search').optional().trim().escape(),
    query('sortBy').optional().isIn(['createdAt_desc', 'createdAt_asc', 'grade_desc', 'grade_asc'])
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { page = 1, limit = 10, subject, grade, status, authorId, helperId, search, sortBy = 'createdAt_desc' } = req.query;

        const filters = {};
        if (subject) filters.subject = { $regex: subject, $options: 'i' };
        if (grade) filters.grade = grade;
        
        // Логика фильтрации по статусу
        if (status) {
            filters.status = status;
        } else if (!authorId && !helperId) {
            // По умолчанию показываем только 'open', если не запрашиваются заявки конкретного пользователя
            filters.status = 'open';
        }

        if (authorId) filters.author = authorId;
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
router.post('/', protect, [
    body('title').trim().isLength({ min: 5, max: 100 }).escape().withMessage('Заголовок должен быть от 5 до 100 символов'),
    body('description').trim().isLength({ min: 10 }).escape().withMessage('Описание должно быть минимум 10 символов'),
    body('subject').trim().notEmpty().escape().withMessage('Предмет обязателен'),
    body('grade').isInt({ min: 1, max: 11 }).withMessage('Класс должен быть от 1 до 11'),
    body('topic').optional().trim().escape()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { title, description, subject, grade, topic } = req.body;
        const author = req.user.id;

        const request = new Request({
            title,
            description,
            subject,
            grade,
            topic,
            author
        });

        // 3. Сохраняем заявку
        await request.save();

        // 4. УВЕДОМЛЕНИЕ ХЕЛПЕРАМ (НОВАЯ ЛОГИКА)
        // Находим всех хелперов, у которых в профиле есть нужный предмет
        const relevantHelpers = await User.find({
            'roles.helper': true,
            subjects: subject, // Ищем по полю subjects
            _id: { $ne: author } // Исключаем самого автора заявки
        }).select('telegramId telegramNotificationsEnabled').lean();

        if (relevantHelpers.length > 0) {
            console.log(`[Notification] Найдено ${relevantHelpers.length} хелперов для уведомления по предмету "${subject}".`);
            
            const notificationTitle = `Новая заявка: ${subject}`;
            const notificationMessage = `Пользователь ${req.user.username} ищет помощи по предмету "${subject}" для ${grade} класса.`;
            const notificationLink = `/request/${request._id}`;

            for (const helper of relevantHelpers) {
                // Отправляем уведомление на сайт (SSE)
                createAndSendNotification(req.app.locals.sseConnections, {
                    user: helper._id,
                    type: 'new_request_for_subject',
                    title: notificationTitle,
                    message: notificationMessage,
                    link: notificationLink,
                });

                // Отправляем уведомление в Telegram
                if (helper.telegramId && helper.telegramNotificationsEnabled) {
                    const telegramMessage = `🔔 *Новая заявка по вашему предмету!*\n\n*Предмет:* ${subject}\n*Класс:* ${grade}\n*Заголовок:* "${title}"\n\nВы можете откликнуться на нее на сайте.`;
                    await sendTelegramMessage(helper.telegramId, telegramMessage); // <-- РАСКОММЕНТИРОВАЛ
                }
            }
        }

        res.status(201).json(request);
    } catch (err) {
        console.error('Ошибка при создании заявки:', err.message);
        res.status(500).send('Ошибка сервера');
    }
});

/**
 * @swagger
 * /api/requests/{id}:
 *   get:
 *     summary: Получить детальную информацию о заявке
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
router.get('/:id', protect, [
    param('id').isMongoId().withMessage('Неверный формат ID заявки')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Если ID невалиден, сразу возвращаем 404, а не 400.
        return res.status(404).json({ msg: 'Заявка не найдена' });
    }

    try {
        const request = await Request.findById(req.params.id)
            .populate('author', 'username _id rating avatar')
            .populate('helper', 'username _id rating avatar');

        if (!request) {
            return res.status(404).json({ msg: 'Заявка не найдена' });
        }
        res.json(request);
    } catch (err) {
        console.error('Ошибка при получении заявки:', err.message);
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
            .populate('author', 'username _id')
            .populate('helper', 'username _id');

        await createAndSendNotification(req.app.locals.sseConnections, {
            user: helper._id,
            type: 'request_assigned_to_you',
            title: `Вас назначили на заявку!`,
            message: `Вы были назначены помощником на заявку \"${request.title}\".`,
            link: `/request/${request._id}`,
            relatedEntity: { requestId: request._id }
        });
        
        if (request.author && request.author._id.toString() !== helper._id.toString()) {
            await createAndSendNotification(req.app.locals.sseConnections, {
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

        if (request.author) {
             await createAndSendNotification(req.app.locals.sseConnections, {
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

        const notificationTitle = `Заявка \"${request.title}\" выполнена`;
        const notificationLink = `/request/${request._id}`;
        const commonRelatedEntity = { requestId: request._id };

        // Уведомление автору (если завершил хелпер и автор не он сам)
        if (isHelper && request.author && request.author._id.toString() !== currentUserId) {
            await createAndSendNotification(req.app.locals.sseConnections, {
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
             await createAndSendNotification(req.app.locals.sseConnections, {
                user: request.helper._id,
                type: 'request_marked_completed',
                title: notificationTitle,
                message: `Автор ${req.user.username} отметил вашу заявку как выполненную.`,
                link: notificationLink,
                relatedEntity: commonRelatedEntity
            });
        }
        
        // TODO: Начисление баллов хелперу, если это делает автор или система
        // if (request.helper) {
        //    await User.findByIdAndUpdate(request.helper._id, { $inc: { points: 10 } }); 
        // }

        // --- УВЕДОМЛЕНИЕ ХЕЛПЕРУ О ЗАКРЫТИИ ЗАЯВКИ ---
        if (request.helper) {
            await createAndSendNotification(req.app.locals.sseConnections, {
                user: request.helper,
                type: 'request_completed',
                title: `Заявка "${request.title}\" была закрыта`,
                message: 'Автор заявки отметил ее как выполненную. Теперь вы можете оставить отзыв.',
                link: `/requests/${request._id}`
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
router.put('/:id', protect, checkEditDeletePermission, [
    // Валидация остается прежней, но добавляем необязательное поле
    body('title').optional().trim().isLength({ min: 5, max: 100 }).escape(),
    body('description').optional().trim().isLength({ min: 10 }).escape(),
    body('subject').optional().trim().notEmpty().escape(),
    body('grade').optional().isInt({ min: 1, max: 11 }),
    body('editReason').optional().trim().escape()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { title, description, subject, grade, urgency, editReason } = req.body;
        let request = req.request; // Получаем из middleware

        // Обновляем поля
        if (title) request.title = title;
        if (description) request.description = description;
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
                await createAndSendNotification(req.app.locals.sseConnections, {
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
    param('id').isMongoId().withMessage('Неверный ID заявки'),
    body('status').isIn(['open', 'assigned', 'in_progress', 'completed', 'cancelled', 'on_hold']).withMessage('Недопустимый статус')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { id } = req.params;
        const { status } = req.body;
        const userId = req.user.id;
        const userRoles = req.user.roles;

        const request = await Request.findById(id);

        if (!request) {
            return res.status(404).json({ msg: 'Заявка не найдена' });
        }

        const isAuthor = request.author.toString() === userId;
        const isHelper = request.helper && request.helper.toString() === userId;
        const isAdminOrMod = userRoles.admin || userRoles.moderator;

        // Определяем права на изменение статуса
        if (!isAuthor && !isHelper && !isAdminOrMod) {
            return res.status(403).json({ msg: 'У вас нет прав для изменения статуса этой заявки' });
        }
        
        // Дополнительные проверки. Например, только автор или хелпер могут 'завершить' заявку
        if (status === 'completed' && !isAuthor && !isHelper && !isAdminOrMod) {
             return res.status(403).json({ msg: 'Только автор или исполнитель могут завершить заявку.' });
        }

        if (status === 'completed') {
            if (req.user._id.toString() !== request.author.toString()) {
                return res.status(403).json({ msg: 'Только автор может закрыть заявку.' });
            }
            
            // --- УВЕДОМЛЕНИЕ ХЕЛПЕРУ О ЗАКРЫТИИ ЗАЯВКИ ---
            if (request.helper) {
                await createAndSendNotification(req.app.locals.sseConnections, {
                    user: request.helper,
                    type: 'request_completed',
                    title: `Заявка "${request.title}\" была закрыта`,
                    message: 'Автор заявки отметил ее как выполненную. Теперь вы можете оставить отзыв.',
                    link: `/requests/${request._id}`
                });
            }
        }

        request.status = status;
        // При завершении заявки фиксируем дату
        if (status === 'completed') {
            request.completedAt = new Date();
        }

        await request.save();
        
        const populatedRequest = await Request.findById(id)
            .populate('author', 'username _id rating avatar')
            .populate('helper', 'username _id rating avatar')
            .lean();

        res.json(populatedRequest);

    } catch (err) {
        console.error('Ошибка при обновлении статуса заявки:', err.message);
        res.status(500).send('Ошибка сервера');
    }
});

/**
 * @swagger
 * /api/requests/{id}:
 *   delete:
 *     summary: Удалить заявку
 *     description: Доступно только автору или модератору/администратору.
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID заявки
 *     requestBody:
 *       description: Причина удаления (обязательна для модераторов/админов).
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deleteReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Заявка успешно удалена
 *       403:
 *         description: Нет прав на удаление
 */
router.delete('/:id', protect, checkEditDeletePermission, [
    // Валидация для причины удаления, если это действие модератора
    body('deleteReason').if((value, { req }) => req.isModeratorAction).notEmpty().withMessage('Причина удаления обязательна для модератора.')
], async (req, res) => {
    try {
        const { deleteReason } = req.body;
        const request = req.request;

        // Уведомляем автора, если удаляет модератор
        if (req.isModeratorAction) {
             if (request.author.toString() !== req.user.id) {
                await createAndSendNotification(req.app.locals.sseConnections, {
                    user: request.author,
                    type: 'request_deleted_by_admin',
                    title: 'Ваша заявка была удалена',
                    message: `Модератор ${req.user.username} удалил вашу заявку \"${request.title}\". Причина: \"${deleteReason}\"`,
                    relatedEntity: { title: request.title, editorId: req.user.id }
                });
            }
        }
        
        // Удаляем связанные сообщения
        await Message.deleteMany({ requestId: request._id });
        // Удаляем связанные отклики (если есть модель Response)
        // await Response.deleteMany({ requestId: request._id });
        // Удаляем связанные отзывы (если есть)
        // await Review.deleteMany({ requestId: request._id });

        // Удаляем саму заявку
        await Request.findByIdAndDelete(request._id);

        res.json({ msg: 'Заявка и все связанные данные удалены' });

    } catch (err) {
        console.error('Ошибка при удалении заявки:', err.message);
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

        console.log(`[ARCHIVE] Request ID: ${request._id}. Messages update result:`, updateResult);

        // Сбрасываем хелпера и возвращаем статус 'open'
        request.helper = null;
        request.status = 'open';
        request.updatedAt = Date.now();
        await request.save();

        // Уведомление бывшему хелперу
        if (formerHelper) {
            await createAndSendNotification(req.app.locals.sseConnections, {
                user: formerHelper._id,
                type: 'request_reopened_by_author',
                title: 'Заявка была возвращена в работу',
                message: `Автор заявки "${request.title}\" не получил решения и вернул ее в общий список. Текущий чат архивирован.`,
                link: `/request/${request._id}`,
                relatedEntity: { requestId: request._id }
            });
        }
        
        // Уведомление автору для подтверждения
        await createAndSendNotification(req.app.locals.sseConnections, {
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

export default router;