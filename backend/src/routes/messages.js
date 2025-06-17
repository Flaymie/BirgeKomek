import express from 'express';
import { body, validationResult, param } from 'express-validator';
import Message from '../models/Message.js';
import Request from '../models/Request.js';
import { protect } from '../middleware/auth.js';
import { createAndSendNotification } from './notifications.js';

const router = express.Router();

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
      .populate('sender', 'username')
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
        const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'username _id');

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
 *         description: ID заявки
 *     responses:
 *       200:
 *         description: Сообщения успешно отмечены как прочитанные
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 updated:
 *                   type: integer
 *                   description: Количество обновленных сообщений
 *       401:
 *         description: Требуется авторизация
 *       500:
 *         description: Внутренняя ошибка сервера
 */
// отметить сообщения как прочитанные
router.post('/:requestId/read', protect, [
  param('requestId').isMongoId().withMessage('Неверный формат ID')
], async (req, res) => {
  try {
    // Проверяем результаты валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { requestId } = req.params;
    
    // обновляем все сообщения, которые еще не прочитаны пользователем
    const result = await Message.updateMany(
      { 
        requestId,
        readBy: { $ne: req.user._id },
        sender: { $ne: req.user._id } // не обновляем свои сообщения
      },
      { $addToSet: { readBy: req.user._id } }
    );
    
    res.json({ updated: result.modifiedCount });
  } catch (err) {
    console.error('Ошибка при пометке сообщений прочитанными:', err);
    res.status(500).json({ msg: 'Что-то пошло не так' });
  }
});

export default router; 