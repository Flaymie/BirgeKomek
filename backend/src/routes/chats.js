import express from 'express';
import { protect } from '../middleware/auth.js';
import Request from '../models/Request.js';
import Message from '../models/Message.js';
import mongoose from 'mongoose';

const router = express.Router();

/**
 * @swagger
 * /api/chats:
 *   get:
 *     summary: Получить список чатов пользователя
 *     description: Возвращает список запросов, в которых пользователь является автором или хелпером, и где есть сообщения
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список чатов пользователя
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 chats:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       requestId:
 *                         type: string
 *                       title:
 *                         type: string
 *                       subject:
 *                         type: string
 *                       lastMessage:
 *                         type: object
 *                         properties:
 *                           content:
 *                             type: string
 *                           sender:
 *                             type: object
 *                           createdAt:
 *                             type: string
 *                       unreadCount:
 *                         type: number
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Находим все запросы, где пользователь является автором или хелпером
    const requests = await Request.find({
      $or: [
        { author: userId },
        { helper: userId }
      ],
      // Только запросы со статусом, где возможен чат
      status: { $in: ['assigned', 'in_progress', 'completed'] }
    }).populate('author', 'username').populate('helper', 'username');
    
    // Получаем ID всех найденных запросов
    const requestIds = requests.map(req => req._id);
    
    // Для каждого запроса находим последнее сообщение и количество непрочитанных
    const chatPromises = requestIds.map(async (requestId) => {
      // Получаем последнее сообщение
      const lastMessage = await Message.findOne({ requestId })
        .sort({ createdAt: -1 })
        .populate('sender', 'username')
        .lean();
      
      // Если сообщений нет, пропускаем этот чат
      if (!lastMessage) return null;
      
      // Получаем количество непрочитанных сообщений
      const unreadCount = await Message.countDocuments({
        requestId,
        sender: { $ne: userId },
        readBy: { $ne: userId }
      });
      
      // Находим соответствующий запрос
      const request = requests.find(req => req._id.toString() === requestId.toString());
      
      return {
        requestId: request._id,
        title: request.title,
        subject: request.subject,
        grade: request.grade,
        status: request.status,
        author: request.author,
        helper: request.helper,
        lastMessage: {
          _id: lastMessage._id,
          content: lastMessage.content,
          sender: lastMessage.sender,
          createdAt: lastMessage.createdAt,
          hasAttachments: lastMessage.attachments && lastMessage.attachments.length > 0
        },
        unreadCount
      };
    });
    
    // Ждем выполнения всех промисов
    let chats = await Promise.all(chatPromises);
    
    // Фильтруем null значения (запросы без сообщений)
    chats = chats.filter(chat => chat !== null);
    
    // Сортируем по дате последнего сообщения (сначала новые)
    chats.sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));
    
    res.json({ chats });
  } catch (err) {
    console.error('Ошибка при получении списка чатов:', err);
    res.status(500).json({ msg: 'Что-то пошло не так' });
  }
});

/**
 * @swagger
 * /api/chats/unread:
 *   get:
 *     summary: Получить количество непрочитанных сообщений
 *     description: Возвращает общее количество непрочитанных сообщений пользователя
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Количество непрочитанных сообщений
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 unreadCount:
 *                   type: number
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/unread', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Находим все запросы, где пользователь является автором или хелпером
    const requests = await Request.find({
      $or: [
        { author: userId },
        { helper: userId }
      ]
    }).select('_id');
    
    // Получаем ID всех найденных запросов
    const requestIds = requests.map(req => req._id);
    
    // Считаем общее количество непрочитанных сообщений
    const unreadCount = await Message.countDocuments({
      requestId: { $in: requestIds },
      sender: { $ne: userId },
      readBy: { $ne: userId }
    });
    
    res.json({ unreadCount });
  } catch (err) {
    console.error('Ошибка при получении количества непрочитанных сообщений:', err);
    res.status(500).json({ msg: 'Что-то пошло не так' });
  }
});

export default router; 