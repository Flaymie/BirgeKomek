import express from 'express';
import { body, validationResult } from 'express-validator';
import axios from 'axios';
import { protect, isModOrAdmin } from '../middleware/auth.js';
import { generalLimiter } from '../middleware/rateLimiters.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

export default ({ sseConnections }) => {
  const router = express.Router();

  // @route   POST /api/admin/notify-user
  // @desc    Отправить персональное уведомление пользователю
  // @access  Admin/Moderator
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
            console.log(`[SSE] Отправлено уведомление 'moderator_warning' пользователю ${recipientId}`);
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
                console.log(`[Telegram] Уведомление 'moderator_warning' успешно отправлено пользователю ${recipientUser.username}`);
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

  // Блокировка пользователя
  router.post('/ban', protect, isModOrAdmin, async (req, res) => {
    // ... existing code ...
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