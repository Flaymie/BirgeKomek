import express from 'express';
import { body, validationResult, param } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sizeOf from 'image-size';
import Message from '../models/Message.js';
import Request from '../models/Request.js';
import { protect } from '../middleware/auth.js';
import { createAndSendNotification } from './notifications.js';
import { io } from '../index.js';

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

// Фильтр для проверки типов файлов по РАСШИРЕНИЮ (более надежно)
const fileFilter = (req, file, cb) => {
  // Белый список разрешенных РАСШИРЕНИЙ
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rar', '.zip', '.7z', '.iso'];
  
  // Получаем расширение файла
  const fileExt = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(fileExt)) {
    cb(null, true);
  } else {
    // Отклоняем файл с кастомной ошибкой
    const error = new Error(`Файлы с расширением ${fileExt} не поддерживаются.`);
    error.code = 'UNSUPPORTED_FILE_TYPE';
    cb(error, false);
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
    
    // НОВАЯ, БОЛЕЕ СТРОГАЯ ПРОВЕРКА НА АРХИВАЦИЮ
    const isUserAdminOrMod = req.user.roles && (req.user.roles.admin || req.user.roles.moderator);
    const archivedMessagesCount = await Message.countDocuments({ requestId, isArchived: true });

    if (archivedMessagesCount > 0 && request.status === 'open' && !isUserAdminOrMod) {
        return res.status(403).json({ msg: 'Этот чат заархивирован и недоступен для просмотра.' });
    }
    
    // проверяем права доступа (только участники могут видеть)
    if (
      request.author.toString() !== req.user._id.toString() && 
      (request.helper ? request.helper.toString() !== req.user._id.toString() : true)
    ) {
      return res.status(403).json({ msg: 'Нет доступа к этому чату' });
    }
    
    // получаем сообщения, исключая архивированные
    const messages = await Message.find({ 
      requestId,
      isArchived: { $ne: true } 
    })
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

        // НОВАЯ ПРОВЕРКА СТАТУСА ПЕРЕД ОТПРАВКОЙ
        if (!['assigned', 'in_progress'].includes(request.status)) {
            return res.status(403).json({ msg: 'Сообщения можно отправлять только в активную заявку (в статусе "assigned" или "in_progress").' });
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
                link: `/request/${requestId}`,
                relatedEntity: { requestId: request._id, userId: senderId }
            });
        }

        // Отправляем сообщение всем участникам чата через сокет
        io.to(requestId).emit('new_message', populatedMessage);

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
 * /api/messages/upload:
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
// Создаем обертку для upload.single, чтобы ловить ошибки multer
const uploadWithErrorHandler = (req, res, next) => {
  const uploader = upload.single('attachment');
  uploader(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ msg: 'Файл слишком большой. Максимальный размер - 10 МБ.' });
      }
      if (err.code === 'UNSUPPORTED_FILE_TYPE') {
        return res.status(400).json({ msg: err.message });
      }
      // Другие ошибки multer
      return res.status(400).json({ msg: 'Ошибка при загрузке файла.' });
    }
    next();
  });
};

router.post('/upload', protect, uploadWithErrorHandler, [
    body('requestId').isMongoId().withMessage('Неверный ID заявки'),
    body('content').optional().trim().escape() // делаем контент опциональным
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { requestId, content } = req.body;
    const senderId = req.user.id;
    const file = req.file;
    
    if (!file) {
        return res.status(400).json({ msg: 'Файл вложения отсутствует' });
    }
    
    try {
        const request = await Request.findById(requestId).populate('author helper');
    if (!request) {
            return res.status(404).json({ msg: 'Заявка не найдена' });
    }
    
        // НОВАЯ ПРОВЕРКА СТАТУСА ПЕРЕД ЗАГРУЗКОЙ
        if (!['assigned', 'in_progress'].includes(request.status)) {
            // Важно удалить загруженный файл, если у пользователя нет прав
            fs.unlinkSync(file.path);
            return res.status(403).json({ msg: 'Сообщения можно отправлять только в активную заявку (в статусе "assigned" или "in_progress").' });
        }

        const isAuthor = request.author && request.author._id.toString() === senderId;
        const isHelper = request.helper && request.helper._id.toString() === senderId;
    
    if (!isAuthor && !isHelper) {
            // Важно удалить загруженный файл, если у пользователя нет прав
            fs.unlinkSync(file.path);
      return res.status(403).json({ msg: 'Вы не можете отправлять сообщения в этот чат' });
    }
    
        // --- 2. Логика для определения размеров ---
        const attachmentData = {
            fileUrl: `/uploads/attachments/${file.filename}`,
            fileName: Buffer.from(file.originalname, 'latin1').toString('utf8'), // Правильное декодирование имени
            fileType: file.mimetype,
            fileSize: file.size,
        };

        if (file.mimetype.startsWith('image/')) {
            try {
                const dimensions = sizeOf(file.path);
                attachmentData.width = dimensions.width;
                attachmentData.height = dimensions.height;
            } catch (err) {
                console.error("Не удалось получить размеры изображения:", file.filename, err);
                // Не прерываем процесс, просто не будет размеров
            }
        }
        // --- Конец логики ---

    const newMessage = new Message({
      requestId,
            sender: senderId,
      content: content || '',
            attachments: [attachmentData], // <-- 3. Сохраняем данные с размерами
            readBy: [senderId]
    });
    
    await newMessage.save();
        const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'username _id avatar');
        
        // Отправляем сообщение всем участникам чата через сокет
        io.to(requestId).emit('new_message', populatedMessage);
    
    let recipientId;
    if (isAuthor && request.helper) {
            recipientId = request.helper;
        } else if (isHelper) {
            recipientId = request.author;
    }
    
    if (recipientId) {
            let notificationMessage = content ? `${content.substring(0, 50)}...` : `Прикреплен файл: ${file.originalname}`;
      await createAndSendNotification({
        user: recipientId,
        type: 'new_message_in_request',
                title: `Новое сообщение в заявке "${request.title}"`,
                message: `Пользователь ${req.user.username} отправил сообщение: ${notificationMessage}`,
                link: `/request/${requestId}/chat`,
                relatedEntity: { requestId: request._id, userId: senderId }
      });
    }
    
    res.status(201).json(populatedMessage);

    } catch (err) {
        console.error('Ошибка при отправке сообщения с вложением:', err);
        res.status(500).send('Ошибка сервера');
    }
});

// --- РУЧКИ ДЛЯ РЕДАКТИРОВАНИЯ И УДАЛЕНИЯ ---

/**
 * @swagger
 * /api/messages/{messageId}:
 *   put:
 *     summary: Редактировать сообщение
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema: { type: 'string' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content: { type: 'string', description: 'Новый текст сообщения' }
 *     responses:
 *       200: { description: 'Сообщение обновлено' }
 *       403: { description: 'Нет прав для редактирования' }
 *       404: { description: 'Сообщение не найдено' }
 */
router.put('/:messageId', protect, [
  param('messageId').isMongoId(),
  body('content').trim().notEmpty().withMessage('Текст не может быть пустым')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ msg: 'Сообщение не найдено' });
    }

    if (message.isArchived) {
      return res.status(403).json({ msg: 'Нельзя редактировать сообщения в архивированном чате.' });
    }

    if (message.sender.toString() !== userId) {
      return res.status(403).json({ msg: 'Вы не можете редактировать чужие сообщения' });
    }

    message.content = content;
    message.editedAt = new Date();
    
    await message.save();
    
    const populatedMessage = await Message.findById(messageId).populate('sender', 'username avatar');

    io.to(message.requestId.toString()).emit('message_updated', populatedMessage);

    res.json(populatedMessage);
  } catch (err) {
    console.error('Ошибка при редактировании сообщения:', err);
    res.status(500).send('Ошибка сервера');
  }
});

/**
 * @swagger
 * /api/messages/{messageId}:
 *   delete:
 *     summary: Удалить сообщение
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema: { type: 'string' }
 *     responses:
 *       200: { description: 'Сообщение удалено' }
 *       403: { description: 'Нет прав для удаления' }
 *       404: { description: 'Сообщение не найдено' }
 */
router.delete('/:messageId', protect, [param('messageId').isMongoId()], async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ msg: 'Сообщение не найдено' });
    }

    if (message.isArchived) {
      return res.status(403).json({ msg: 'Нельзя удалять сообщения в архивированном чате.' });
    }

    if (message.sender.toString() !== userId) {
      return res.status(403).json({ msg: 'Вы не можете удалять чужие сообщения' });
    }

    // "Мягкое" удаление - заменяем контент, удаляем вложения
    message.content = 'Сообщение удалено';
    message.attachments = [];
    message.editedAt = new Date(); // Можно использовать как флаг "удаления"

    await message.save();

    const populatedMessage = await Message.findById(messageId).populate('sender', 'username avatar');

    io.to(message.requestId.toString()).emit('message_updated', populatedMessage); // Используем тот же сокет

    res.json({ msg: 'Сообщение успешно удалено' });
  } catch (err) {
    console.error('Ошибка при удалении сообщения:', err);
    res.status(500).send('Ошибка сервера');
  }
});

export default router; 