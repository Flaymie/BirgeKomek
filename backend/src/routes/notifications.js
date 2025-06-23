import express from 'express';
import { param, validationResult } from 'express-validator';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';
import User from '../models/User.js';

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

// Функция для создания и сохранения уведомлений
export const createAndSendNotification = async ({ user, type, title, message, link, relatedEntity }) => {
  try {
    // Проверяем, существует ли пользователь
    const userExists = await User.findById(user);
    if (!userExists) {
      console.error(`Попытка создать уведомление для несуществующего пользователя: ${user}`);
      return;
    }

    const notification = new Notification({
      user,
      type,
      title,
      message,
      link,
      relatedEntity,
    });
    
    await notification.save();
    console.log(`Уведомление создано для пользователя ${user}: ${title}`);
    
    // Отправляем уведомление клиенту, если он онлайн
    sendNotificationToClient(user.toString(), notification);

  } catch (error) {
    console.error('Ошибка при создании уведомления:', error);
  }
};

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
 *     summary: Получить все уведомления пользователя с пагинацией
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
 *         name: isRead
 *         schema:
 *           type: boolean
 *         description: Фильтр по статусу прочтения (true, false или не указывать для всех)
 *     responses:
 *       200:
 *         description: Список уведомлений
 */
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { user: userId };

    // Добавляем фильтр по статусу прочтения, если он указан
    if (req.query.isRead === 'true') {
      query.isRead = true;
    } else if (req.query.isRead === 'false') {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Notification.countDocuments(query);

    // Добавляем подсчет непрочитанных уведомлений в ответ
    const unreadCount = req.query.isRead === undefined 
      ? await Notification.countDocuments({ user: userId, isRead: false })
      : (query.isRead === false ? total : await Notification.countDocuments({ user: userId, isRead: false }));

    res.json({
      notifications,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      unreadCount, // <--- Cчетчик для иконки колокольчика
    });
  } catch (error) {
    console.error('Ошибка при получении уведомлений:', error);
    res.status(500).json({ msg: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /api/notifications/unread:
 *   get:
 *     summary: Получить список непрочитанных уведомлений
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список непрочитанных уведомлений
 */
router.get('/unread', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id, isRead: false })
      .sort({ createdAt: -1 });
    res.json({ notifications });
  } catch (error) {
    console.error('Ошибка при получении непрочитанных уведомлений:', error);
    res.status(500).json({ msg: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /api/notifications/read-all:
 *   put:
 *     summary: Отметить все уведомления как прочитанные
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Все уведомления отмечены как прочитанные
 */
router.put('/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ msg: 'Все уведомления отмечены как прочитанные' });
  } catch (error) {
    console.error('Ошибка при отметке всех уведомлений как прочитанных:', error);
    res.status(500).json({ msg: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     summary: Отметить конкретное уведомление как прочитанное
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Уведомление отмечено как прочитанное
 */
router.put('/:id/read', protect, [
  param('id').isMongoId().withMessage('Некорректный ID уведомления'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ msg: 'Уведомление не найдено или нет прав доступа' });
    }

    res.json(notification);
  } catch (error) {
    console.error('Ошибка при отметке уведомления как прочитанного:', error);
    res.status(500).json({ msg: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Удалить уведомление
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Уведомление успешно удалено
 */
router.delete('/:id', protect, [
  param('id').isMongoId().withMessage('Некорректный ID уведомления'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            user: req.user._id
        });

        if (!notification) {
            return res.status(404).json({ msg: 'Уведомление не найдено или нет прав доступа' });
        }

        res.json({ msg: 'Уведомление удалено' });
    } catch (error) {
        console.error('Ошибка при удалении уведомления:', error);
        res.status(500).json({ msg: 'Ошибка сервера' });
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

export default router; 