import express from 'express';
import { param, validationResult } from 'express-validator';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';
import User from '../models/User.js';
import axios from 'axios';
import { generalLimiter } from '../middleware/rateLimiters.js';
import { io } from '../index.js';

const router = express.Router();

export const createAndSendNotification = async (notificationData) => {
  try {
    const { user, type, title, message, link, relatedEntity } = notificationData;
    
    if (!user) {
      console.error('Попытка создать уведомление без указания пользователя');
      return;
    }
    
    const userToSend = await User.findById(user);
    if (!userToSend) {
      console.error(`Попытка создать уведомление для несуществующего пользователя: ${user}`);
      return;
    }

    const notification = new Notification({
      user,
      userTelegramId: userToSend.telegramId,
      type,
      title,
      message,
      link,
      relatedEntity,
    });
    
    await notification.save();

    const sockets = await io.fetchSockets();
    const userSocket = sockets.find(s => s.user && s.user.id === user.toString());
    
    if (userSocket) {
        userSocket.emit('new_notification', notification);
    }
    
    if (userToSend.telegramId && userToSend.telegramNotificationsEnabled) {
        const botToken = process.env.BOT_TOKEN;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        
        let tgMessage = `*${title.replace(/([_*\[\]()~`>#+-=|{}.!])/g, '\\$1')}*\n\n`;
        if (message) {
            const cleanMessage = message.replace(/<\/?[^>]+(>|$)/g, "");
            tgMessage += `${cleanMessage.replace(/([_*\[\]()~`>#+-=|{}.!])/g, '\\$1')}\n\n`;
        }
        
        const inlineKeyboard = {
            inline_keyboard: [[{ text: '🔗 Перейти', url: `${frontendUrl}${link}` }]]
        };

        const apiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

        try {
            await axios.post(apiUrl, {
                chat_id: userToSend.telegramId,
                text: tgMessage,
                parse_mode: 'MarkdownV2',
                reply_markup: inlineKeyboard
            });
        } catch (tgError) {
            console.error(`Ошибка отправки уведомления в Telegram для ${userToSend.username}:`, tgError.response ? tgError.response.data : tgError.message);
        }
    }

  } catch (error) {
    console.error('Ошибка при создании и отправке уведомления:', error);
  }
};


// Главный экспорт - функция, которая принимает зависимости и возвращает роутер
export default () => {
    /**
     * @swagger
     * /api/notifications:
     *   get:
     *     summary: Получить уведомления пользователя с пагинацией
     *     tags: [Notifications]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: page
     *         schema:
     *           type: integer
     *         description: Номер страницы
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *         description: Количество элементов на странице
     *       - in: query
     *         name: isRead
     *         schema:
     *           type: boolean
     *         description: Фильтр по статусу прочтения (true/false)
     *     responses:
     *       200:
     *         description: Список уведомлений и информация о пагинации
     *       500:
     *         description: Ошибка сервера
     */
    router.get('/', protect, generalLimiter, async (req, res) => {
      try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

                const query = { user: userId };

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

                const unreadCount = req.query.isRead === undefined 
                ? await Notification.countDocuments({ user: userId, isRead: false })
                : (query.isRead === false ? total : await Notification.countDocuments({ user: userId, isRead: false }));

        res.json({
          notifications,
          totalPages: Math.ceil(total / limit),
                currentPage: page,
          total,
                unreadCount,
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
     *     summary: Получить все непрочитанные уведомления
     *     tags: [Notifications]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Список непрочитанных уведомлений
     *       500:
     *         description: Ошибка сервера
     */
    router.get('/unread', protect, generalLimiter, async (req, res) => {
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
     * /api/notifications/unread/count:
     *   get:
     *     summary: Получить количество непрочитанных уведомлений
     *     tags: [Notifications]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Количество непрочитанных уведомлений
     *       500:
     *         description: Ошибка сервера
     */
    router.get('/unread/count', protect, generalLimiter, async (req, res) => {
      try {
        const count = await Notification.countDocuments({ user: req.user._id, isRead: false });
        res.json({ count });
      } catch (error) {
        console.error('Ошибка при получении количества непрочитанных уведомлений:', error);
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
     *       500:
     *         description: Ошибка сервера
     */
    router.put('/read-all', protect, generalLimiter, async (req, res) => {
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
     *       400:
     *         description: Некорректный ID
     *       404:
     *         description: Уведомление не найдено
     *       500:
     *         description: Ошибка сервера
     */
    router.put('/:id/read', protect, generalLimiter, [
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
     *         description: ID уведомления
     *     responses:
     *       200:
     *         description: Уведомление удалено
     *       400:
     *         description: Некорректный ID
     *       404:
     *         description: Уведомление не найдено
     *       500:
     *         description: Ошибка сервера
     */
    router.delete('/:id', protect, generalLimiter, [
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
     * /api/notifications/{id}:
     *   get:
     *     summary: Получить уведомление по ID
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
     *         description: Данные уведомления
     *       403:
     *         description: Доступ запрещен
     *       404:
     *         description: Уведомление не найдено
     *       500:
     *         description: Ошибка сервера
     */
    router.get('/:id', protect, async (req, res) => {
      try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
          return res.status(404).json({ msg: 'Уведомление не найдено' });
        }

        // Убедимся, что пользователь запрашивает свое уведомление
        if (notification.user.toString() !== req.user.id) {
          return res.status(403).json({ msg: 'Доступ запрещен' });
        }

        res.json(notification);
      } catch (error) {
        console.error(error.message);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Уведомление не найдено' });
        }
        res.status(500).send('Ошибка сервера');
      }
    });

    return router;
};