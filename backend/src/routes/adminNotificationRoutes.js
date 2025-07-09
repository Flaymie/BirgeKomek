const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const { sendAdminNotification, getMyNotifications, markNotificationAsRead, getNotificationById } = require('../controllers/notificationController');

const router = express.Router();

/**
 * @swagger
 * /api/admin/{userId}/send-admin:
 *   post:
 *     summary: Отправить административное уведомление пользователю
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Уведомление успешно отправлено.
 *       400:
 *         description: Ошибка валидации.
 *       500:
 *         description: Ошибка сервера.
 */
router.post('/:userId/send-admin', protect, authorize(['admin', 'moderator']), sendAdminNotification);

/**
 * @swagger
 * /api/admin/my:
 *   get:
 *     summary: Получить мои уведомления
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Успешно получены уведомления.
 *       500:
 *         description: Ошибка сервера.
 */
router.get('/my', protect, getMyNotifications);

/**
 * @swagger
 * /api/admin/{id}/read:
 *   put:
 *     summary: Отметить уведомление как прочитанное
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Уведомление отмечено как прочитанное.
 *       500:
 *         description: Ошибка сервера.
 */
router.put('/:id/read', protect, markNotificationAsRead);

/**
 * @swagger
 * /api/admin/{id}:
 *   get:
 *     summary: Получить уведомление по ID
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Успешно получено уведомление.
 *       404:
 *         description: Уведомление не найдено.
 *       500:
 *         description: Ошибка сервера.
 */
router.get('/:id', protect, getNotificationById);

module.exports = router; 