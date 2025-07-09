import express from 'express';
import { body, validationResult } from 'express-validator';
import axios from 'axios';
import { protect, isModOrAdmin } from '../middleware/auth.js';
import { generalLimiter } from '../middleware/rateLimiters.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Request from '../models/Request.js';
import Message from '../models/Message.js';
import Report from '../models/Report.js';

export default ({ sseConnections }) => {
  const router = express.Router();

  /**
   * @swagger
   * tags:
   *   name: Admin
   *   description: Управление административными задачами
   */

  /**
   * @swagger
   * /api/admin/notify-user:
   *   post:
   *     summary: Отправить персональное уведомление пользователю
   *     tags: [Admin]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [recipientId, title, message]
   *             properties:
   *               recipientId: { type: 'string', description: 'Требуется ID получателя' }
   *               title: { type: 'string', description: 'Заголовок не может быть пустым' }
   *               message: { type: 'string', description: 'Сообщение не может быть пустым' }
   *     responses:
   *       201:
   *         description: Уведомление успешно отправлено.
   *       400:
   *         description: Ошибки валидации.
   *       500:
   *         description: Ошибка сервера.
   */
  router.post(
    '/notify-user',
    protect,
    isModOrAdmin,
    generalLimiter,
    [
      body('recipientId', 'Требуется ID получателя').isMongoId(),
      body('message', 'Сообщение не может быть пустым').not().isEmpty().trim(),
      body('title', 'Заголовок не может быть пустым').not().isEmpty().trim(),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { recipientId, title, message } = req.body;
      const senderId = req.user.id;

      try {
        const notification = new Notification({
            user: recipientId,
            type: 'moderator_warning',
            title: title,
            message: message,
            relatedEntity: { userId: senderId },
        });
        
        await notification.save();
        
        const notificationLink = `/notification/${notification._id}`;
        notification.link = notificationLink;
        await notification.save();
        
        // 1. Отправка через SSE
        const client = sseConnections[recipientId.toString()];
        if (client) {
            client.write(`event: new_notification\n`);
            client.write(`data: ${JSON.stringify(notification)}\n\n`);
        }

        // 2. Отправка в Telegram
        const recipientUser = await User.findById(recipientId);
        if (recipientUser && recipientUser.telegramId && recipientUser.telegramNotificationsEnabled) {
            const botToken = process.env.BOT_TOKEN;
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            
            let tgMessage = `*${title.replace(/([_*\[\]()~`>#+-=|{}.!])/g, '\\$1')}*\n\n`;
            const cleanMessage = message.replace(/<\/?[^>]+(>|$)/g, "");
            tgMessage += `${cleanMessage.replace(/([_*\[\]()~`>#+-=|{}.!])/g, '\\$1')}\n\n`;
            
            const inlineKeyboard = {
                inline_keyboard: [[{ text: '🔗 Просмотреть', url: `${frontendUrl}${notificationLink}` }]]
            };

            const apiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

            try {
                await axios.post(apiUrl, {
                    chat_id: recipientUser.telegramId,
                    text: tgMessage,
                    parse_mode: 'MarkdownV2',
                    reply_markup: inlineKeyboard
                });
            } catch (tgError) {
                console.error(`[Telegram] Ошибка отправки уведомления для ${recipientUser.username}:`, tgError.response ? tgError.response.data : tgError.message);
            }
        }

        res.status(201).json({ msg: 'Уведомление успешно отправлено.', notification });

      } catch (error) {
        console.error('Ошибка при отправке уведомления модератором:', error);
        res.status(500).json({ msg: 'Ошибка сервера' });
      }
    }
  );

  /**
   * @swagger
   * /api/admin/stats:
   *   get:
   *     summary: Получить статистику платформы
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Статистика успешно получена.
   *       403:
   *         description: Доступ запрещен.
   *       500:
   *         description: Ошибка сервера.
   */
  router.get('/stats', protect, isModOrAdmin, async (req, res) => {
    try {
      // Основные счетчики
      const [
        totalUsers,
        totalRequests,
        completedRequests,
        totalMessages,
        totalReports,
        openReports
      ] = await Promise.all([
        User.countDocuments(),
        Request.countDocuments(),
        Request.countDocuments({ status: 'completed' }),
        Message.countDocuments(),
        Report.countDocuments(),
        Report.countDocuments({ status: 'open' })
      ]);

      // Агрегированные данные для графиков
      
      // Распределение заявок по предметам
      const requestsBySubject = await Request.aggregate([
        { $match: { subject: { $ne: null } } }, // Исключаем заявки без предмета
        { $group: { _id: "$subject", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      
      // Динамика регистраций за последние 7 дней
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const registrationsByDay = await User.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        { 
          $group: { 
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, 
            count: { $sum: 1 } 
          } 
        },
        { $sort: { _id: 1 } }
      ]);

      res.status(200).json({
        general: {
          totalUsers,
          totalRequests,
          completedRequests,
          totalMessages,
          totalReports,
          openReports
        },
        charts: {
          requestsBySubject,
          registrationsByDay
        }
      });
    } catch (error) {
      console.error('Ошибка при сборе статистики:', error);
      res.status(500).json({ msg: 'Ошибка сервера при сборе статистики' });
    }
  });

  // Блокировка пользователя
  router.post('/ban', protect, isModOrAdmin, async (req, res) => {
    // Отправляем уведомление заблокированному пользователю
    await createAndSendNotification({
      user: userToBan._id,
      type: 'account_banned',
      title: 'Ваш аккаунт заблокирован',
    });

    res.status(200).json({ msg: `Пользователь ${userToBan.username} заблокирован.` });
  });

  return router;
}; 