import express from 'express';
import { body, query, validationResult } from 'express-validator';
import axios from 'axios';
import { protect, isModOrAdmin, isAdmin } from '../middleware/auth.js';
import { generalLimiter } from '../middleware/rateLimiters.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Request from '../models/Request.js';
import Message from '../models/Message.js';
import Report from '../models/Report.js';
import Review from '../models/Review.js';
import redis, { isRedisConnected } from '../config/redis.js';
import crypto from 'crypto';

// Утилита для отправки сообщений в Telegram, т.к. она нужна в нескольких местах
const sendTelegramMessage = async (telegramId, message) => {
  if (!telegramId || !process.env.BOT_TOKEN) {
    console.log('Не удалось отправить сообщение в Telegram: отсутствует ID или токен бота.');
    return;
  }
  const url = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(url, {
      chat_id: telegramId,
      text: message,
      parse_mode: 'Markdown',
    });
  } catch (error) {
    console.error('Ошибка при отправке сообщения в Telegram:', error.response ? error.response.data : error.message);
  }
};


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
   * /api/admin/users:
   *   get:
   *     summary: Получить список пользователей с фильтрацией и пагинацией (только для админов)
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema: { type: 'integer', default: 1 }
   *         description: Номер страницы
   *       - in: query
   *         name: limit
   *         schema: { type: 'integer', default: 10 }
   *         description: Количество пользователей на странице
   *       - in: query
   *         name: search
   *         schema: { type: 'string' }
   *         description: Поиск по username или номеру телефона
   *       - in: query
   *         name: role
   *         schema: { type: 'string', enum: ['helper', 'moderator', 'admin'] }
   *         description: Фильтр по роли
   *       - in: query
   *         name: status
   *         schema: { type: 'string', enum: ['active', 'banned'] }
   *         description: Фильтр по статусу
   *     responses:
   *       200:
   *         description: Список пользователей
   *       400:
   *         description: Ошибка валидации
   *       403:
   *         description: Доступ запрещен
   *       500:
   *         description: Внутренняя ошибка сервера
   */
  router.get(
    '/users',
    protect,
    isAdmin, // Только админы могут смотреть список всех юзеров
    [
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
      query('search').optional().trim().escape(),
      query('role').optional({ checkFalsy: true }).isIn(['student', 'helper', 'moderator', 'admin']),
      query('status').optional({ checkFalsy: true }).isIn(['active', 'banned']),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        const { page = 1, limit = 10, search, role, status } = req.query;

        const queryOptions = {};

        if (search) {
          queryOptions.$or = [
            { username: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
          ];
        }

        if (role) {
          queryOptions[`roles.${role}`] = true;
        }

        if (status) {
          queryOptions['banDetails.isBanned'] = status === 'banned';
        }

        const users = await User.find(queryOptions)
          .select('-password -registrationDetails') // Скрываем лишние данные для списка
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean();

        const totalUsers = await User.countDocuments(queryOptions);
        
        // Добавляем онлайн-статус
        const usersWithOnlineStatus = await Promise.all(
          users.map(async (user) => {
            let isOnline = false;
            if (isRedisConnected()) {
              const onlineKey = `online:${user._id.toString()}`;
              const result = await redis.exists(onlineKey);
              isOnline = result === 1;
            }
            return { ...user, isOnline };
          })
        );

        res.json({
          users: usersWithOnlineStatus,
          totalPages: Math.ceil(totalUsers / limit),
          currentPage: page,
          totalUsers,
        });
      } catch (err) {
        console.error('Ошибка при получении пользователей для админки:', err);
        res.status(500).send('Ошибка сервера');
      }
    }
  );

  /**
   * @swagger
   * /api/admin/users/{id}:
   *   get:
   *     summary: Получить детальную информацию о пользователе (только для админов)
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: 'string' }
   *         description: ID пользователя
   *     responses:
   *       200:
   *         description: Детальная информация о пользователе
   *       404:
   *         description: Пользователь не найден
   *       500:
   *         description: Внутренняя ошибка сервера
   */
  router.get('/users/:id', protect, isAdmin, async (req, res) => {
    try {
      const user = await User.findById(req.params.id)
        .select('-password')
        .populate('banDetails.bannedBy', 'username')
        .lean();

      if (!user) {
        return res.status(404).json({ msg: 'Пользователь не найден' });
      }
      
      let isOnline = false;
      if (isRedisConnected()) {
        const onlineKey = `online:${user._id.toString()}`;
        isOnline = (await redis.exists(onlineKey)) === 1;
      }

      res.json({ ...user, isOnline });
    } catch (err) {
      console.error('Ошибка при получении детальной информации о пользователе:', err);
      res.status(500).send('Ошибка сервера');
    }
  });

  /**
   * @swagger
   * /api/admin/users/{id}/roles:
   *   put:
   *     summary: Изменить роли пользователя (только для админов, с 2FA)
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: 'string' }
   *         description: ID пользователя, которому меняют роли
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               isModerator:
   *                 type: boolean
   *                 description: "Присвоить (true) или забрать (false) роль модератора"
   *               isHelper:
   *                 type: boolean
   *                 description: "Присвоить (true) или забрать (false) роль хелпера"
   *               confirmationCode:
   *                 type: string
   *                 description: "6-значный код подтверждения из Telegram (если требуется)"
   *     responses:
   *       200:
   *         description: Роли успешно обновлены
   *       400:
   *         description: "Неверный запрос, или требуется код подтверждения"
   *       403:
   *         description: "Нет прав, или попытка изменить свои роли"
   */
  router.put('/users/:id/roles', protect, isAdmin, [
      body('isModerator').isBoolean().withMessage('Значение isModerator должно быть true или false.'),
      body('isHelper').isBoolean().withMessage('Значение isHelper должно быть true или false.'),
      body('confirmationCode').optional().isString().isLength({ min: 6, max: 6 }),
  ], async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
      }

      const adminUser = req.user;
      const targetUserId = req.params.id;
      const { isModerator, isHelper, confirmationCode } = req.body;

      if (adminUser.id === targetUserId) {
          return res.status(403).json({ msg: 'Вы не можете изменить свои собственные роли.' });
      }
      
      const targetUser = await User.findById(targetUserId);
      if (!targetUser) {
          return res.status(404).json({ msg: 'Пользователь для изменения не найден.' });
      }

      // Нельзя изменять роли другого админа
      if (targetUser.roles.admin) {
        return res.status(403).json({ msg: 'Нельзя изменять роли другого администратора.' });
      }
      
      if (!adminUser.telegramId) {
          return res.status(403).json({ msg: 'Для выполнения этого действия ваш аккаунт должен быть привязан к Telegram.' });
      }

      const redisKey = `admin-action:change-roles:${adminUser.id}:${targetUserId}`;
      
      if (!confirmationCode) {
          const code = crypto.randomInt(100000, 999999).toString();
          await redis.set(redisKey, JSON.stringify({ isModerator, isHelper, code }), 'EX', 300); // Сохраняем и новые роли, и код

          const message = `Вы собираетесь изменить роли для *${targetUser.username}*.\n\nНовые роли:\n- Модератор: *${isModerator ? 'Да' : 'Нет'}*\n- Хелпер: *${isHelper ? 'Да' : 'Нет'}*\n\nДля подтверждения введите код: \`${code}\``;
          await sendTelegramMessage(adminUser.telegramId, message);

          return res.status(400).json({ 
              confirmationRequired: true,
              message: 'Требуется подтверждение. Код отправлен вам в Telegram.' 
          });
      } else {
          const storedData = await redis.get(redisKey);
          if (!storedData) {
              return res.status(400).json({ msg: 'Срок действия кода истек. Попробуйте снова.' });
          }
          const { code: storedCode } = JSON.parse(storedData);
          if (storedCode !== confirmationCode) {
              return res.status(400).json({ msg: 'Неверный код подтверждения.' });
          }
          await redis.del(redisKey);
      }

      targetUser.roles.moderator = isModerator;
      targetUser.roles.helper = isHelper;
      
      // Роль студента автоматически снимается, если юзер становится хелпером
      if (isHelper) {
          targetUser.roles.student = false;
      } else {
           // Если снимаем хелпера, он снова становится студентом (по умолчанию)
          targetUser.roles.student = true;
      }


      await targetUser.save();
      
      const updatedUser = await User.findById(targetUserId).select('-password').populate('banDetails.bannedBy', 'username').lean();
      res.json({ msg: `Роли для пользователя ${targetUser.username} успешно обновлены.`, user: updatedUser });
  });

  /**
   * @swagger
   * /api/admin/users/{id}:
   *   delete:
   *     summary: Удалить пользователя (только для админов, с 2FA)
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: 'string' }
   *         description: ID пользователя для удаления
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               reason:
   *                 type: string
   *                 description: "Причина удаления (обязательно)"
   *               confirmationCode:
   *                 type: string
   *                 description: "6-значный код подтверждения из Telegram (если требуется)"
   *     responses:
   *       200:
   *         description: Пользователь успешно удален
   *       400:
   *         description: "Неверный запрос, или требуется код подтверждения"
   *       403:
   *         description: "Нет прав, или попытка удалить самого себя"
   */
    router.post('/users/:id/delete', protect, isAdmin, [
        body('reason').notEmpty().withMessage('Причина удаления обязательна.'),
        body('confirmationCode').optional().isString().isLength({ min: 6, max: 6 }),
    ], async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const adminUser = req.user;
        const targetUserId = req.params.id;
        const { reason, confirmationCode } = req.body;

        if (adminUser.id === targetUserId) {
            return res.status(403).json({ msg: 'Вы не можете удалить свой собственный аккаунт.' });
        }

        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            return res.status(404).json({ msg: 'Пользователь для удаления не найден.' });
        }
        
        if (targetUser.roles.admin) {
            return res.status(403).json({ msg: 'Нельзя удалить другого администратора.' });
        }

        if (!adminUser.telegramId) {
            return res.status(403).json({ msg: 'Для выполнения этого действия ваш аккаунт должен быть привязан к Telegram.' });
        }

        const redisKey = `admin-action:delete-user:${adminUser.id}:${targetUserId}`;
        
        if (!confirmationCode) {
            const code = crypto.randomInt(100000, 999999).toString();
            await redis.set(redisKey, code, 'EX', 300);

            const message = `Вы собираетесь НАВСЕГДА удалить пользователя *${targetUser.username}* по причине: _${reason}_.\n\nДля подтверждения введите код: \`${code}\``;
            await sendTelegramMessage(adminUser.telegramId, message);

            return res.status(400).json({ confirmationRequired: true, message: 'Код подтверждения отправлен в Telegram.' });
        } else {
            const storedCode = await redis.get(redisKey);
            if (storedCode !== confirmationCode) {
                return res.status(400).json({ msg: 'Неверный код подтверждения.' });
            }
            await redis.del(redisKey);
        }

        // Логика удаления данных пользователя
        // (можно скопировать из user.js, но лучше вынести в отдельный сервис)
        await Request.updateMany(
            { helper: targetUserId, status: { $in: ['assigned', 'in_progress'] } },
            { $set: { status: 'open' }, $unset: { helper: 1 } }
        );
        const userRequests = await Request.find({ author: targetUserId }).select('_id');
        const requestIds = userRequests.map(r => r._id);
        if (requestIds.length > 0) {
            await Message.deleteMany({ requestId: { $in: requestIds } });
            await Review.deleteMany({ requestId: { $in: requestIds } });
            await Request.deleteMany({ _id: { $in: requestIds } });
        }
        await Review.deleteMany({ reviewerId: targetUserId });
        await Notification.deleteMany({ user: targetUserId });
        await User.findByIdAndDelete(targetUserId);

        res.json({ msg: `Пользователь ${targetUser.username} и все его данные были успешно удалены.` });
    });

  router.put('/users/:id/profile', protect, isAdmin, [
      body('username').notEmpty().withMessage('Никнейм не может быть пустым.'),
      body('reason').notEmpty().withMessage('Причина редактирования обязательна.'),
      body('confirmationCode').optional().isString().isLength({ min: 6, max: 6 }),
      // Другие поля можно не валидировать так строго, они могут быть пустыми
  ], async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
      }

      const adminUser = req.user;
      const targetUserId = req.params.id;
      const { confirmationCode, reason, ...profileData } = req.body;

      if (adminUser.id === targetUserId) {
          return res.status(403).json({ msg: 'Вы не можете редактировать свой собственный профиль через эту форму.' });
      }

      const targetUser = await User.findById(targetUserId);
      if (!targetUser) {
          return res.status(404).json({ msg: 'Пользователь не найден.' });
      }

      if (targetUser.roles.admin) {
          return res.status(403).json({ msg: 'Нельзя редактировать профиль другого администратора.' });
      }

      if (!adminUser.telegramId) {
          return res.status(403).json({ msg: 'Для выполнения этого действия ваш аккаунт должен быть привязан к Telegram.' });
      }

      const redisKey = `admin-action:edit-profile:${adminUser.id}:${targetUserId}`;

      if (!confirmationCode) {
          const code = crypto.randomInt(100000, 999999).toString();
          // Сохраняем все данные + код в Redis
          await redis.set(redisKey, JSON.stringify({ ...profileData, reason, code }), 'EX', 300);

          const message = `Вы собираетесь изменить профиль *${targetUser.username}* по причине: _${reason}_.\n\nДля подтверждения введите код: \`${code}\``;
          await sendTelegramMessage(adminUser.telegramId, message);

          return res.status(400).json({ confirmationRequired: true, message: 'Код подтверждения отправлен в Telegram.' });
      } else {
          const storedDataRaw = await redis.get(redisKey);
          if (!storedDataRaw) {
              return res.status(400).json({ msg: 'Срок действия кода истек. Попробуйте снова.' });
          }

          const storedData = JSON.parse(storedDataRaw);
          if (storedData.code !== confirmationCode) {
              return res.status(400).json({ msg: 'Неверный код подтверждения.' });
          }

          // Код верный, БЕЗОПАСНО обновляем пользователя данными из Redis
          const { reason: storedReason, code: storedCode, ...profileDataFromRedis } = storedData;
          
          const allowedFields = ['username', 'phone', 'location', 'grade', 'bio', 'avatar', 'subjects'];

          for (const field of allowedFields) {
              if (profileDataFromRedis[field] !== undefined) {
                  targetUser[field] = profileDataFromRedis[field];
              }
          }

          await targetUser.save();
          await redis.del(redisKey);

          // Отправляем уведомление пользователю
           const notification = new Notification({
              user: targetUserId,
              type: 'profile_updated_by_admin',
              title: 'Ваш профиль был обновлен',
              message: `Администратор ${adminUser.username} обновил ваш профиль. Причина: "${storedReason}"`,
              relatedEntity: { userId: adminUser.id },
          });
          await notification.save();
          notification.link = `/notification/${notification._id}`;
          await notification.save();


          const updatedUser = await User.findById(targetUserId).select('-password').populate('banDetails.bannedBy', 'username').lean();
          res.json({ msg: `Профиль пользователя ${targetUser.username} успешно обновлен.`, user: updatedUser });
      }
  });


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