import express from 'express';
import { body, validationResult, param } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Message from '../models/Message.js';
import Request from '../models/Request.js';
import { protect } from '../middleware/auth.js';
import { createAndSendNotification } from './notifications.js';

const router = express.Router();

// Настройка хранилища для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/attachments';
    // Создаем директорию, если она не существует
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Генерируем уникальное имя файла
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// Фильтр для проверки типов файлов
const fileFilter = (req, file, cb) => {
  // Разрешенные типы файлов
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Неподдерживаемый тип файла'), false);
  }
};

// Настройка загрузчика
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 МБ
  }
});

/**
 * @swagger
 * /api/messages/{requestId}:
 *   get:
 *     summary: Получить сообщения для конкретной заявки
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID заявки
 *     responses:
 *       200:
 *         description: Список сообщений
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Message'
 *       401:
 *         description: Требуется авторизация
 *       403:
 *         description: Нет доступа к этому чату
 *       404:
 *         description: Заявка не найдена
 *       500:
 *         description: Внутренняя ошибка сервера
 */
// получить сообщения по requestId
router.get('/:requestId', protect, [
  param('requestId').isMongoId().withMessage('Неверный формат ID')
], async (req, res) => {
  try {
    // Проверяем результаты валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { requestId } = req.params;
    
    // проверим, что запрос существует
    const request = await Request.findById(requestId);
    
    if (!request) {
      return res.status(404).json({ msg: 'Запрос не найден' });
    }
    
    // проверяем права доступа (только участники могут видеть)
    if (
      request.author.toString() !== req.user._id.toString() && 
      (request.helper ? request.helper.toString() !== req.user._id.toString() : true)
    ) {
      return res.status(403).json({ msg: 'Нет доступа к этому чату' });
    }
    
    // получаем сообщения
    const messages = await Message.find({ requestId })
      .populate('sender', 'username avatar')
      .sort({ createdAt: 1 });
    
    res.json(messages);
  } catch (err) {
    console.error('Ошибка при получении сообщений:', err);
    res.status(500).json({ msg: 'Что-то пошло не так' });
  }
});

/**
 * @swagger
 * /api/messages:
 *   post:
 *     summary: Отправить новое сообщение в чат заявки
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - requestId
 *               - content
 *             properties:
 *               requestId: { type: 'string', description: 'ID заявки' }
 *               content: { type: 'string', description: 'Текст сообщения' }
 *               attachments: { type: 'array', items: { type: 'string' }, description: 'Массив URL вложений (опционально)' }
 *     responses:
 *       201:
 *         description: Сообщение успешно отправлено
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Message' }
 *       400:
 *         description: Ошибка валидации или неверные данные
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Доступ к чату заявки запрещен (пользователь не автор и не исполнитель)
 *       404:
 *         description: Заявка не найдена
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post('/', protect, [
    body('requestId').isMongoId().withMessage('Неверный ID заявки'),
    body('content').trim().notEmpty().escape().withMessage('Текст сообщения не может быть пустым'),
    body('attachments').optional().isArray(),
    body('attachments.*').optional().isURL().withMessage('Некорректный URL вложения')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { requestId, content, attachments } = req.body;
    const senderId = req.user.id;

    try {
        const request = await Request.findById(requestId).populate('author').populate('helper');
        if (!request) {
            return res.status(404).json({ msg: 'Заявка не найдена' });
        }

        // Проверка, что отправитель является автором или назначенным исполнителем
        const isAuthor = request.author && request.author._id.toString() === senderId;
        const isHelper = request.helper && request.helper._id.toString() === senderId;

        if (!isAuthor && !isHelper) {
            return res.status(403).json({ msg: 'Вы не можете отправлять сообщения в этот чат' });
        }

        const newMessage = new Message({
            requestId,
            sender: senderId,
            content,
            attachments: attachments || [],
            readBy: [senderId] // Отправитель автоматически прочитал сообщение
        });

        await newMessage.save();
        const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'username _id avatar');

        // Определяем получателя уведомления
        let recipientId;
        if (isAuthor && request.helper) {
            recipientId = request.helper._id;
        } else if (isHelper && request.author) {
            recipientId = request.author._id;
        }

        if (recipientId) {
            await createAndSendNotification({
                user: recipientId,
                type: 'new_message_in_request',
                title: `Новое сообщение в заявке "${request.title}"`, 
                message: `Пользователь ${req.user.username} написал: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
                link: `/requests/${requestId}`,
                relatedEntity: { requestId: request._id, userId: senderId }
            });
        }

        res.status(201).json(populatedMessage);

    } catch (err) {
        console.error('Ошибка при отправке сообщения:', err.message);
        if (err.kind === 'ObjectId') {
            return res.status(400).json({ msg: 'Неверный ID заявки для сообщения' });
        }
        res.status(500).send('Ошибка сервера');
    }
});

/**
 * @swagger
 * /api/messages/{requestId}/read:
 *   post:
 *     summary: Отметить все сообщения в чате как прочитанные
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Сообщения отмечены как прочитанные
 */
router.post('/:requestId/read', protect, async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    await Message.updateMany(
      { requestId: requestId, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    );
    
    // Здесь мы не отправляем ответ, так как это просто фоновая операция
    res.status(200).send();

  } catch (error) {
    console.error('Ошибка при пометке сообщений как прочитанных:', error);
    res.status(500).json({ msg: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /api/messages/attachment:
 *   post:
 *     summary: Отправить сообщение с вложением
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: requestId
 *         type: string
 *         required: true
 *         description: ID запроса
 *       - in: formData
 *         name: content
 *         type: string
 *         description: Текст сообщения (опционально)
 *       - in: formData
 *         name: attachment
 *         type: file
 *         required: true
 *         description: Файл вложения (до 10 МБ)
 *     responses:
 *       201:
 *         description: Сообщение с вложением успешно отправлено
 *       400:
 *         description: Ошибка валидации или неверные данные
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Доступ запрещен
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post('/attachment', protect, upload.single('attachment'), async (req, res) => {
  try {
    const { requestId, content } = req.body;
    const file = req.file;
    
    if (!requestId) {
      return res.status(400).json({ msg: 'ID запроса обязателен' });
    }
    
    if (!file) {
      return res.status(400).json({ msg: 'Файл не загружен' });
    }
    
    // Проверяем существование запроса
    const request = await Request.findById(requestId).populate('author').populate('helper');
    
    if (!request) {
      return res.status(404).json({ msg: 'Запрос не найден' });
    }
    
    // Проверка, что отправитель является автором или назначенным исполнителем
    const isAuthor = request.author && request.author._id.toString() === req.user._id.toString();
    const isHelper = request.helper && request.helper._id.toString() === req.user._id.toString();
    
    if (!isAuthor && !isHelper) {
      return res.status(403).json({ msg: 'Вы не можете отправлять сообщения в этот чат' });
    }
    
    // Формируем URL для доступа к файлу
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/attachments/${file.filename}`;
    
    // Создаем новое сообщение
    const newMessage = new Message({
      requestId,
      sender: req.user._id,
      content: content || '',
      attachments: [fileUrl],
      readBy: [req.user._id] // Отправитель автоматически прочитал сообщение
    });
    
    await newMessage.save();
    const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'username _id avatar');
    
    // Определяем получателя уведомления
    let recipientId;
    if (isAuthor && request.helper) {
      recipientId = request.helper._id;
    } else if (isHelper && request.author) {
      recipientId = request.author._id;
    }
    
    if (recipientId) {
      await createAndSendNotification({
        user: recipientId,
        type: 'new_message_in_request',
        title: `Новое сообщение с вложением в заявке "${request.title}"`,
        message: `Пользователь ${req.user.username} отправил вложение${content ? ': ' + content.substring(0, 50) + (content.length > 50 ? '...' : '') : ''}`,
        link: `/requests/${requestId}`,
        relatedEntity: { requestId: request._id, userId: req.user._id }
      });
    }
    
    res.status(201).json(populatedMessage);
  } catch (err) {
    console.error('Ошибка при отправке сообщения с вложением:', err);
    res.status(500).json({ msg: 'Что-то пошло не так' });
  }
});

export default router; 