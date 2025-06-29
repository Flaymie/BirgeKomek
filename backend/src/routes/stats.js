import express from 'express';
import User from '../models/User.js';
import Request from '../models/Request.js';
import { protect } from '../middleware/auth.js';
import { generalLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Statistics
 *   description: Статистика и аналитика по платформе
 */

/**
 * @swagger
 * /api/stats/general:
 *   get:
 *     summary: Получить общую статистику по платформе
 *     tags: [Statistics]
 *     // security: Если нужна защита, раскомментировать и настроить
 *     //   - bearerAuth: []
 *     responses:
 *       200:
 *         description: Общая статистика
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalUsers: { type: 'integer' }
 *                 totalHelpers: { type: 'integer' }
 *                 activeRequests: { type: 'integer' } # open or assigned
 *                 completedRequests: { type: 'integer' }
 *                 totalRequests: { type: 'integer' }
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/general', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalHelpers = await User.countDocuments({ 'roles.helper': true });
    const activeRequests = await Request.countDocuments({ status: { $in: ['open', 'assigned'] } });
    const completedRequests = await Request.countDocuments({ status: 'completed' });
    const totalRequests = await Request.countDocuments();

    res.json({
      totalUsers,
      totalHelpers,
      activeRequests,
      completedRequests,
      totalRequests,
    });
  } catch (err) {
    console.error('Ошибка при получении общей статистики:', err.message);
    res.status(500).send('Ошибка сервера');
  }
});

/**
 * @swagger
 * /api/stats/user/{userId}:
 *   get:
 *     summary: Получить статистику для конкретного пользователя
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID пользователя
 *     responses:
 *       200:
 *         description: Статистика пользователя
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 createdRequests: { type: 'integer' }
 *                 completedRequestsAsHelper: { type: 'integer' }
 *                 averageRatingAsHelper: { type: 'number', format: 'float', nullable: true }
 *                 userProfile: {
 *                   type: 'object',
 *                   properties: {
 *                     _id: { type: 'string' },
 *                     username: { type: 'string' },
 *                     roles: { type: 'object' }
 *                   }
 *                 }
 *       400:
 *         description: Неверный ID пользователя
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Доступ запрещен (например, попытка посмотреть чужую статистику без прав)
 *       404:
 *         description: Пользователь не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get('/user/:userId', protect, generalLimiter, async (req, res) => {
  try {
    const requestedUserId = req.params.userId;
    const currentUserId = req.user.id;
    // const currentUserRoles = req.user.roles; // Для проверки роли администратора в будущем

    // Пока что, позволяем пользователю смотреть только свою статистику
    // В будущем здесь можно добавить проверку: if (requestedUserId !== currentUserId && !currentUserRoles.admin)
    if (requestedUserId !== currentUserId) {
        // return res.status(403).json({ msg: 'Доступ запрещен. Вы можете просматривать только свою статистику.' });
        // Пока разрешим смотреть всем аутентифицированным, для простоты разработки.
        // В продакшене эту проверку нужно будет включить или доработать с учетом ролей.
    }

    const user = await User.findById(requestedUserId).select('_id username roles rating');
    if (!user) {
      return res.status(404).json({ msg: 'Пользователь не найден' });
    }

    const createdRequests = await Request.countDocuments({ author: requestedUserId });
    let completedRequestsAsHelper = 0;
    let averageRatingAsHelper = user.rating; // Рейтинг уже есть в модели User

    if (user.roles && user.roles.helper) {
      completedRequestsAsHelper = await Request.countDocuments({ helper: requestedUserId, status: 'completed' });
    }

    res.json({
      userProfile: {
        _id: user._id,
        username: user.username,
        roles: user.roles,
      },
      createdRequests,
      completedRequestsAsHelper,
      averageRatingAsHelper: (user.roles && user.roles.helper) ? averageRatingAsHelper : null, 
    });

  } catch (err) {
    console.error('Ошибка при получении статистики пользователя:', err.message);
    if (err.kind === 'ObjectId') {
        return res.status(400).json({ msg: 'Неверный ID пользователя' });
    }
    res.status(500).send('Ошибка сервера');
  }
});

export default router; 