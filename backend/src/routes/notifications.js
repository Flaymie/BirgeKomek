import express from 'express';
import { param, validationResult, query } from 'express-validator';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Объект для хранения активных SSE-клиентов (userId: response_object)
const sseClients = {};

// Функция для отправки уведомления конкретному пользователю через SSE
function sendNotificationToClient(userId, notificationData) {
  const client = sseClients[userId];
  if (client) {
    client.write(`event: new_notification\n`);
    client.write(`data: ${JSON.stringify(notificationData)}\n\n`);
  }
}

// Сервисная функция для создания и отправки уведомления
// Эту функцию можно будет вызывать из других модулей (например, requests.js, messages.js)
export async function createAndSendNotification({ user, type, title, message, link, relatedEntity }) {
  try {
    const notification = new Notification({
      user,
      type,
      title,
      message,
      link,
      relatedEntity
    });
    await notification.save();
    sendNotificationToClient(user.toString(), notification); // Отправляем через SSE
    return notification;
  } catch (error) {
    console.error('Ошибка при создании уведомления:', error);
    // Тут можно добавить более сложную обработку ошибок, если нужно
    return null;
  }
}

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Управление уведомлениями пользователей и подписка на real-time обновления
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Получить все уведомления для текущего пользователя
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Номер страницы
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Количество уведомлений на странице
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Получить только непрочитанные уведомления
 *     responses:
 *       200:
 *         description: Список уведомлений
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notifications:
 *                   type: array
 *                   items: {
 *                     $ref: '#/components/schemas/Notification'
 *                   }
 *                 totalPages: { type: 'integer' }
 *                 currentPage: { type: 'integer' }
 *                 totalNotifications: { type: 'integer' }
 *                 unreadCount: { type: 'integer' }
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/', protect, [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('unreadOnly').optional().isBoolean().toBoolean(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { page = 1, limit = 10, unreadOnly = false } = req.query;
        const userId = req.user.id;

        const queryOptions = { user: userId };
        if (unreadOnly) {
            queryOptions.isRead = false;
        }

        const notifications = await Notification.find(queryOptions)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const totalNotifications = await Notification.countDocuments(queryOptions);
        const unreadCount = await Notification.countDocuments({ user: userId, isRead: false });

        res.json({
            notifications,
            totalPages: Math.ceil(totalNotifications / limit),
            currentPage: page,
            totalNotifications,
            unreadCount
        });
    } catch (err) {
        console.error('Ошибка при получении уведомлений:', err.message);
        res.status(500).send('Ошибка сервера');
    }
});

/**
 * @swagger
 * /api/notifications/subscribe:
 *   get:
 *     summary: Подписаться на получение уведомлений в реальном времени (SSE)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Успешная подписка. Сервер будет отправлять события.
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               example: "event: new_notification\ndata: {\"_id\":\"...\",\"message\":\"Новое сообщение!\"}\n\n"
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/subscribe', protect, (req, res) => {
  const userId = req.user.id;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // Сразу отправляем заголовки, чтобы установить соединение

  sseClients[userId] = res;

  // Отправляем приветственное сообщение или первоначальные данные, если нужно
  res.write('data: Подключение к потоку уведомлений установлено.\n\n');

  // Обработка закрытия соединения клиентом
  req.on('close', () => {
    delete sseClients[userId];
    res.end();
    console.log(`Клиент ${userId} отписался от SSE уведомлений.`);
  });

  // Можно настроить периодическую отправку heartbeat для поддержания соединения
  // const heartbeatInterval = setInterval(() => {
  //   if (sseClients[userId]) {
  //     sseClients[userId].write(':heartbeat\n\n'); // Пустой комментарий для heartbeat
  //   }
  // }, 30000); // каждые 30 секунд

  // req.on('close', () => {
  //   clearInterval(heartbeatInterval);
  //   // ... остальная логика закрытия
  // });
});

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   post:
 *     summary: Отметить уведомление как прочитанное
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID уведомления
 *     responses:
 *       200:
 *         description: Уведомление отмечено как прочитанное
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notification'
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Это уведомление не принадлежит вам
 *       404:
 *         description: Уведомление не найдено
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post('/:id/read', protect, [
    param('id').isMongoId().withMessage('Неверный ID уведомления'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ msg: 'Уведомление не найдено' });
        }

        if (notification.user.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Это уведомление не принадлежит вам' });
        }

        notification.isRead = true;
        await notification.save();

        res.json(notification);
    } catch (err) {
        console.error('Ошибка при отметке уведомления как прочитанного:', err.message);
        res.status(500).send('Ошибка сервера');
    }
});

/**
 * @swagger
 * /api/notifications/read-all:
 *   post:
 *     summary: Отметить все уведомления пользователя как прочитанные
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Все уведомления отмечены как прочитанные
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: 'string' }
 *                 modifiedCount: { type: 'integer' }
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post('/read-all', protect, async (req, res) => {
    try {
        const result = await Notification.updateMany(
            { user: req.user.id, isRead: false },
            { $set: { isRead: true } }
        );

        res.json({ 
            message: 'Все уведомления отмечены как прочитанные', 
            modifiedCount: result.modifiedCount 
        });
    } catch (err) {
        console.error('Ошибка при отметке всех уведомлений как прочитанных:', err.message);
        res.status(500).send('Ошибка сервера');
    }
});

export default router; 