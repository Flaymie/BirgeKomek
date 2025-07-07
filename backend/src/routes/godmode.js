import express from 'express';
import adminAuth from '../middleware/adminAuth.js';
import User from '../models/User.js';
import Request from '../models/Request.js';
import Review from '../models/Review.js';

const router = express.Router();

// Этот файл содержит роуты исключительно для роли "admin".
// Старые роуты в /api/admin для модераторов остаются нетронутыми.

// @route   GET /api/godmode/stats
// @desc    Получить базовую статистику для дашборда
// @access  Admin Only
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalRequests = await Request.countDocuments();
    const totalReviews = await Review.countDocuments();
    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: new Date().setHours(0, 0, 0, 0) },
    });
    const openRequests = await Request.countDocuments({ status: 'open' });
    const closedRequests = await Request.countDocuments({ status: 'closed' });
    const helpersCount = await User.countDocuments({ 'roles.helper': true });

    res.json({
      totalUsers,
      totalRequests,
      totalReviews,
      newUsersToday,
      openRequests,
      closedRequests,
      helpersCount,
    });
  } catch (error) {
    console.error('Ошибка при получении статистики для Godmode:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// @route   GET /api/godmode/charts/user-registrations
// @desc    Получить данные для графика регистраций за 7 дней
// @access  Admin Only
router.get('/charts/user-registrations', adminAuth, async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // Включая сегодня, 7 дней
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Агрегация данных по дням
    const newUsersByDay = await User.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Europe/Moscow" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    
    // Формируем полный список дней за последнюю неделю
    const dateMap = new Map(newUsersByDay.map(item => [item._id, item.count]));
    const last7Days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().split('T')[0];
      last7Days.unshift({
        date: dateString,
        // Форматируем дату для отображения ('Mon', 'Tue'...)
        shortDate: d.toLocaleDateString('ru-RU', { weekday: 'short' }),
        count: dateMap.get(dateString) || 0,
      });
    }

    res.json(last7Days);

  } catch (error) {
    console.error('Ошибка при получении данных для графика:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Сюда будем добавлять другие божественные роуты
// Например, для полного управления пользователями, просмотра всех данных и т.д.

export default router; 