import express from 'express';
import { param, validationResult } from 'express-validator';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { generalLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

export const createAndSendNotification = async (sseConnections, notificationData) => {
  try {
    const { user, type, title, message, link, relatedEntity } = notificationData;
    
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
    console.log(`Уведомление создано для пользователя ${user}: ${title}`);
    console.log(`Уведомление сохранено с userTelegramId: ${userToSend.telegramId}`);
    
    // 1. Отправка через SSE на фронтенд
    const client = sseConnections[user.toString()];
    if (client) {
        client.write(`event: new_notification\n`);
        client.write(`data: ${JSON.stringify(notification)}\n\n`);
    }

    // 2. Отправка в Telegram, если пользователь привязан и уведомления включены
    if (userToSend.telegramId && userToSend.telegramNotificationsEnabled) {
        const botToken = process.env.BOT_TOKEN;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        
        let tgMessage = `*${title.replace(/([_*\[\]()~`>#+-=|{}.!])/g, '\\$1')}*\n\n`;
        if (message) {
            // Убираем HTML теги и экранируем спецсимволы Markdown
            const cleanMessage = message.replace(/<\/?[^>]+(>|$)/g, "");
            tgMessage += `${cleanMessage.replace(/([_*\[\]()~`>#+-=|{}.!])/g, '\\$1')}\n\n`;
        }
        
        const inlineKeyboard = {
            inline_keyboard: [[]]
        };
        
        if (link) {
             inlineKeyboard.inline_keyboard[0].push({ text: '🔗 Перейти', url: `${frontendUrl}${link}` });
        }

        const apiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

        try {
            await axios.post(apiUrl, {
                chat_id: userToSend.telegramId,
                text: tgMessage,
                parse_mode: 'MarkdownV2',
                reply_markup: inlineKeyboard
            });
            console.log(`Уведомление успешно отправлено в Telegram пользователю ${userToSend.username}`);
        } catch (tgError) {
            console.error(`Ошибка отправки уведомления в Telegram для ${userToSend.username}:`, tgError.response ? tgError.response.data : tgError.message);
        }
    }

  } catch (error) {
    console.error('Ошибка при создании и отправке уведомления:', error);
  }
};


// Главный экспорт - функция, которая принимает зависимости и возвращает роутер
export default ({ sseConnections }) => {

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

    router.get('/subscribe', (req, res) => {
        try {
            const token = req.query.token;
            if (!token) {
                return res.status(401).json({ msg: "Отсутствует токен, авторизация отклонена" });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
            res.flushHeaders();

            sseConnections[userId] = res;
            console.log(`[SSE] User connected: ${userId}`);

            res.write('event: connection\n');
            res.write('data: SSE connection established\n\n');

  req.on('close', () => {
                delete sseConnections[userId];
                console.log(`[SSE] User disconnected: ${userId}`);
  });

        } catch (err) {
            console.error('[SSE] Auth Error:', err.message);
            return res.status(401).json({ msg: "Токен недействителен" });
        }
    });

    return router;
};