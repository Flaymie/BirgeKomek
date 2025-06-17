import express from 'express';
import { body, validationResult, param, query } from 'express-validator';
import Request from '../models/Request.js';
import User from '../models/User.js'; // Убедимся, что User импортирован
import Message from '../models/Message.js'; // Импортируем Message
import { protect, isHelper, isAdmin, isModOrAdmin } from '../middleware/auth.js';
import { createAndSendNotification } from './notifications.js'; // Правильный путь импорта

const router = express.Router();

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
 *         name: isUrgent
 *         schema: { type: 'boolean' }
 *         description: Фильтр по срочности
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
    query('subject').optional().trim().escape(),
    query('grade').optional().isInt({ min: 1, max: 11 }).toInt(),
    query('status').optional().isIn(['open', 'assigned', 'completed', 'cancelled']),
    query('authorId').optional().isMongoId(),
    query('helperId').optional().isMongoId(),
    query('isUrgent').optional().isBoolean().toBoolean(),
    query('search').optional().trim().escape(),
    query('sortBy').optional().isIn(['createdAt_desc', 'createdAt_asc', 'updatedAt_desc', 'updatedAt_asc'])
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { page = 1, limit = 10, subject, grade, status, authorId, helperId, isUrgent, search, sortBy = 'createdAt_desc' } = req.query;

        const filters = {};
        if (subject) filters.subject = { $regex: subject, $options: 'i' };
        if (grade) filters.grade = grade;
        if (status) filters.status = status;
        else filters.status = 'open'; // По умолчанию только открытые, если статус не задан
        if (authorId) filters.author = authorId;
        if (helperId) filters.helper = helperId;
        if (isUrgent !== undefined) filters.isUrgent = isUrgent;

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
            .populate('author', 'username _id rating')
            .populate('helper', 'username _id rating')
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
 *               format: { type: 'string', enum: ['text', 'call', 'chat', 'meet'], default: 'chat' }
 *               isUrgent: { type: 'boolean', default: false }
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
    body('topic').optional().trim().escape(),
    body('format').optional().isIn(['text', 'call', 'chat', 'meet']).withMessage('Недопустимый формат помощи'),
    body('isUrgent').optional().isBoolean()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { title, description, subject, grade, topic, format, isUrgent } = req.body;
        const author = req.user.id;

        const request = new Request({
            title,
            description,
            subject,
            grade,
            topic,
            format,
            isUrgent,
            author
        });
        await request.save();
        
        // Уведомление хелперам по этому предмету (если такие есть и подписаны)
        // Эту часть можно доработать, чтобы не слать всем подряд, а, например, тем, кто онлайн
        // или добавить настройки подписки на предметы
        const helpersForSubject = await User.find({ 'roles.helper': true, helperSubjects: subject });
        if (helpersForSubject.length > 0) {
            const notificationPromises = helpersForSubject.map(helper => {
                 if (helper._id.toString() !== author) { // Не уведомлять автора, если он тоже хелпер по этому предмету
                    return createAndSendNotification({
                        user: helper._id,
                        type: 'new_request_for_subject',
                        title: `Новая заявка по предмету: ${subject}`,
                        message: `Пользователь ${req.user.username} создал заявку \"${title}\" по предмету ${subject} для ${grade} класса.`,
                        link: `/requests/${request._id}`,
                        relatedEntity: { requestId: request._id }
                    });
                }
                return Promise.resolve();
            });
            await Promise.all(notificationPromises);
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
 *     summary: Получить детали заявки по ID
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string' }
 *     responses:
 *       200:
 *         description: Детали заявки
 *       404:
 *         description: Заявка не найдена
 */
router.get('/:id', protect, [
    param('id').isMongoId().withMessage('Неверный ID заявки')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const request = await Request.findById(req.params.id)
            .populate('author', 'username _id rating')
            .populate('helper', 'username _id rating');
        if (!request) {
            return res.status(404).json({ msg: 'Заявка не найдена' });
        }
        res.json(request);
    } catch (err) {
        console.error('Ошибка при получении заявки:', err.message);
        if (err.kind === 'ObjectId') {
             return res.status(400).json({ msg: 'Неверный формат ID заявки' });
        }
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

        await createAndSendNotification({
            user: helper._id,
            type: 'request_assigned_to_you',
            title: `Вас назначили на заявку!`,
            message: `Вы были назначены помощником на заявку \"${request.title}\".`,
            link: `/requests/${request._id}`,
            relatedEntity: { requestId: request._id }
        });
        
        if (request.author && request.author._id.toString() !== helper._id.toString()) {
            await createAndSendNotification({
                user: request.author._id,
                type: 'request_taken_by_helper', 
                title: `На вашу заявку назначен помощник!`,
                message: `Пользователь ${helper.username} был назначен на вашу заявку \"${request.title}\".`,
                link: `/requests/${request._id}`,
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
             await createAndSendNotification({
                user: request.author._id,
                type: 'request_taken_by_helper',
                title: `Вашу заявку взяли!`,
                message: `Помощник ${req.user.username} взял вашу заявку \"${request.title}\".`,
                link: `/requests/${request._id}`,
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
        const notificationLink = `/requests/${request._id}`;
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
        
        // TODO: Начисление баллов хелперу, если это делает автор или система
        // if (request.helper) {
        //    await User.findByIdAndUpdate(request.helper._id, { $inc: { points: 10 } }); 
        // }
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
        // const isHelper = request.helper && request.helper._id.toString() === currentUserId;
        // TODO: Решить, может ли хелпер отменять заявку, и при каких условиях

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

        // Уведомление хелперу, если он был назначен и отменил автор
        if (oldStatus === 'assigned' && request.helper && isAuthor) {
             await createAndSendNotification({
                user: request.helper._id,
                type: 'request_status_changed', // или более конкретный тип 'request_cancelled_by_author'
                title: `Заявка \"${request.title}\" отменена`,
                message: `Автор ${req.user.username} отменил заявку, на которую вы были назначены.`,
                link: `/requests/${request._id}`,
                relatedEntity: { requestId: request._id }
            });
        }
        // TODO: Уведомление автору, если отменил хелпер (если будет такая логика)

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
 *         schema: { type: 'string' }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: 'string', minLength: 5, maxLength: 100 }
 *               description: { type: 'string', minLength: 10 }
 *               subject: { type: 'string' }
 *               grade: { type: 'integer', minimum: 1, maximum: 11 }
 *               topic: { type: 'string', nullable: true }
 *               format: { type: 'string', enum: ['text', 'call', 'chat', 'meet'] }
 *               isUrgent: { type: 'boolean' }
 *     responses:
 *       200: { description: 'Заявка успешно обновлена' }
 *       400: { description: 'Ошибка валидации' }
 *       403: { description: 'Только автор может редактировать' }
 *       404: { description: 'Заявка не найдена' }
 */
router.put('/:id', protect, [
    param('id').isMongoId().withMessage('Неверный ID заявки'),
    body('title').optional().trim().isLength({ min: 5, max: 100 }).escape().withMessage('Заголовок должен быть от 5 до 100 символов'),
    body('description').optional().trim().isLength({ min: 10 }).escape().withMessage('Описание должно быть минимум 10 символов'),
    body('subject').optional().trim().notEmpty().withMessage('Предмет не может быть пустым, если указан'),
    body('grade').optional().isInt({ min: 1, max: 11 }).withMessage('Класс должен быть от 1 до 11'),
    body('topic').optional().trim().escape(),
    body('format').optional().isIn(['text', 'call', 'chat', 'meet']).withMessage('Недопустимый формат помощи'),
    body('isUrgent').optional().isBoolean()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const request = await Request.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ msg: 'Заявка не найдена' });
        }

        if (request.author.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Только автор может редактировать свою заявку' });
        }

        // Обновляем только те поля, которые пришли в запросе
        const updates = {};
        const allowedFields = ['title', 'description', 'subject', 'grade', 'topic', 'format', 'isUrgent'];
        for (const key in req.body) {
            if (allowedFields.includes(key) && req.body[key] !== undefined) {
                updates[key] = req.body[key];
            }
        }
        
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ msg: 'Нет данных для обновления' });
        }

        Object.assign(request, updates);
        request.updatedAt = Date.now();
        await request.save();

        // TODO: Уведомление хелперу, если заявка была назначена и ее отредактировали?
        // if (request.status === 'assigned' && request.helper) {
        //     await createAndSendNotification({ ... });
        // }

        res.json(request);
    } catch (err) {
        console.error('Ошибка при обновлении заявки:', err.message);
        if (err.kind === 'ObjectId') {
            return res.status(400).json({ msg: 'Неверный формат ID заявки' });
        }
        res.status(500).send('Ошибка сервера');
    }
});


/**
 * @swagger
 * /api/requests/{id}:
 *   delete:
 *     summary: Удалить заявку (только для автора или админа)
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: 'string' }
 *     responses:
 *       200: { description: 'Заявка успешно удалена' }
 *       403: { description: 'Нет прав на удаление' }
 *       404: { description: 'Заявка не найдена' }
 */
router.delete('/:id', protect, [
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

        const isUserAdmin = req.user.roles && req.user.roles.admin; // Проверяем, админ ли текущий юзер
        if (request.author.toString() !== req.user.id && !isUserAdmin) { // Если не автор И не админ
            return res.status(403).json({ msg: 'Вы не можете удалить эту заявку. Действие доступно только автору или администратору.' });
        }

        // Удаляем связанные сообщения
        await Message.deleteMany({ requestId: request._id });
        
        // Уведомление хелперу, если заявка была назначена и ее удалили
        if (request.status === 'assigned' && request.helper && request.helper._id) {
           await createAndSendNotification({
                user: request.helper._id, // ID хелпера
                type: 'request_deleted', // Новый тип уведомления
                title: `Заявка \"${request.title}\" была удалена`,
                message: `Заявка \"${request.title}\", на которую вы были назначены, была удалена автором или администратором.`,
                // link: `/requests` // Ссылка может вести просто на список заявок, так как конкретной уже нет
           });
        }

        await Request.findByIdAndDelete(req.params.id);

        res.json({ msg: 'Заявка успешно удалена' });
    } catch (err) {
        console.error('Ошибка при удалении заявки:', err.message);
         if (err.kind === 'ObjectId') {
            return res.status(400).json({ msg: 'Неверный формат ID заявки' });
        }
        res.status(500).send('Ошибка сервера');
    }
});

export default router;