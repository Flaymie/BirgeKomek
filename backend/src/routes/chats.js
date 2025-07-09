import express from 'express';
import { protect } from '../middleware/auth.js';
import Request from '../models/Request.js';
import Message from '../models/Message.js';
import mongoose from 'mongoose';
import { generalLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

router.use(protect, generalLimiter);

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
router.get('/', async (req, res) => {
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
    }).populate('author', 'username avatar').populate('helper', 'username avatar');
  
    
    // Получаем ID всех найденных запросов
    const requestIds = requests.map(req => req._id);
    
    // Для каждого запроса находим последнее сообщение и количество непрочитанных
    const chatPromises = requestIds.map(async (requestId) => {
      // Получаем последнее сообщение
      const lastMessage = await Message.findOne({ requestId })
        .sort({ createdAt: -1 })
        .populate('sender', 'username avatar')
        .lean();
      
      const request = requests.find(req => req._id.toString() === requestId.toString());
      
      if (!lastMessage && request.status !== 'completed') {
        // Создаем системное сообщение для отображения чата
        const defaultMessage = {
          _id: 'system_' + requestId,
          content: 'Начните общение',
          sender: { username: 'Система' },
          createdAt: request.updatedAt || request.createdAt,
          hasAttachments: false
        };
        
        // Получаем количество непрочитанных сообщений
        const unreadCount = 0;
        
        return {
          requestId: request._id,
          title: request.title,
          subject: request.subject,
          grade: request.grade,
          status: request.status,
          author: request.author,
          helper: request.helper,
          lastMessage: defaultMessage,
          unreadCount
        };
      }
      
      // Если есть сообщения, обрабатываем как обычно
      if (lastMessage) {
        // Получаем количество непрочитанных сообщений
        const unreadCount = await Message.countDocuments({
          requestId,
          sender: { $ne: userId },
          readBy: { $ne: userId }
        });
        
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
      }
      
      return null;
    });
    
    // Ждем выполнения всех промисов
    let chats = await Promise.all(chatPromises);
    
    // Фильтруем null значения
    chats = chats.filter(chat => chat !== null);
    
    // Сортируем по дате последнего сообщения
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
router.get('/unread', async (req, res) => {
  try {
    const userId = req.user._id;
    
    const requests = await Request.find({
      $or: [
        { author: userId },
        { helper: userId }
      ]
    }).select('_id');
    
    const requestIds = requests.map(req => req._id);
    
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