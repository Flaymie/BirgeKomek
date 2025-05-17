import express from 'express';
import { body, validationResult, param } from 'express-validator';
import Message from '../models/Message.js';
import Request from '../models/Request.js';
import { protect } from '../middleware/auth.js';

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
 * /api/messages/{requestId}:
 *   post:
 *     summary: Отправить новое сообщение в чат заявки
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: Текст сообщения
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: URL вложений (если есть)
 *     responses:
 *       201:
 *         description: Сообщение успешно отправлено
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       400:
 *         description: Пустое сообщение или некорректные данные
 *       401:
 *         description: Требуется авторизация
 *       403:
 *         description: Нет прав для отправки сообщений в этот чат
 *       404:
 *         description: Заявка не найдена
 *       500:
 *         description: Внутренняя ошибка сервера
 */
// отправить новое сообщение
router.post('/:requestId', protect, [
  param('requestId').isMongoId().withMessage('Неверный формат ID'),
  body('content')
    .optional()
    .trim()
    .isLength({ min: 1, max: 2000 }).withMessage('Сообщение должно быть от 1 до 2000 символов'),
  body('attachments')
    .optional()
    .isArray().withMessage('Вложения должны быть массивом'),
  body('attachments.*')
    .optional()
    .isURL().withMessage('Вложение должно быть URL')
], async (req, res) => {
  try {
    // Проверяем результаты валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { requestId } = req.params;
    // Извлекаем только нужные поля
    const { content, attachments } = req.body;
    
    if (!content && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ msg: 'Сообщение не может быть пустым' });
    }
    
    // проверим, что запрос существует
    const request = await Request.findById(requestId);
    
    if (!request) {
      return res.status(404).json({ msg: 'Запрос не найден' });
    }
    
    // проверяем, что юзер участвует в запросе
    if (
      request.author.toString() !== req.user._id.toString() && 
      (request.helper ? request.helper.toString() !== req.user._id.toString() : true)
    ) {
      return res.status(403).json({ msg: 'Вы не можете писать в этот чат' });
    }
    
    // создаем сообщение
    const message = new Message({
      requestId,
      sender: req.user._id,
      content,
      attachments,
      readBy: [req.user._id] // отправитель уже прочитал
    });
    
    await message.save();
    
    // получаем с данными отправителя
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username');
    
    res.status(201).json(populatedMessage);
  } catch (err) {
    console.error('Ошибка при отправке сообщения:', err);
    res.status(500).json({ msg: 'Не получилось отправить сообщение' });
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