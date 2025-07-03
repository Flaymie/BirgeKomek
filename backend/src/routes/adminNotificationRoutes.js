const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const { sendAdminNotification, getMyNotifications, markNotificationAsRead, getNotificationById } = require('../controllers/notificationController');

const router = express.Router();

// Роут для отправки уведомления пользователю от админа/модератора
// Доступно только для админов и модераторов
router.post('/:userId/send-admin', protect, authorize(['admin', 'moderator']), sendAdminNotification);

// Роут для получения всех уведомлений текущего пользователя
router.get('/my', protect, getMyNotifications);

// Роут для пометки уведомления как прочитанного
router.put('/:id/read', protect, markNotificationAsRead);

// Роут для получения одного уведомления по ID (для страницы /notification-adm/:id)
router.get('/:id', protect, getNotificationById);

module.exports = router; 