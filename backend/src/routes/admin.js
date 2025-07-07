import express from 'express';
import { body, validationResult } from 'express-validator';
import axios from 'axios';
import { protect, isModOrAdmin, isAdmin } from '../middleware/auth.js';
import { generalLimiter } from '../middleware/rateLimiters.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { sendTelegramMessage } from './users.js';
import crypto from 'crypto';
import redis from '../config/redis.js';
import Request from '../models/Request.js';
import Message from '../models/Message.js';
import Review from '../models/Review.js';
import mongoose from 'mongoose';
import { attachmentUpload } from '../middleware/fileUploads.js';
import { deleteFile } from '../utils/fileUtils.js';

export default ({ sseConnections }) => {
  const router = express.Router();

  /**
   * @swagger
   * /api/admin/users:
   *   get:
   *     summary: Получить список всех пользователей (для админов/модеров)
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
   *         schema: { type: 'integer', default: 20 }
   *         description: Количество пользователей на странице
   *       - in: query
   *         name: role
   *         schema: { type: 'string', enum: ['user', 'helper', 'moderator', 'admin'] }
   *         description: Фильтр по роли
   *       - in: query
   *         name: search
   *         schema: { type: 'string' }
   *         description: Поиск по никнейму или email
   *     responses:
   *       200:
   *         description: Список пользователей
   *       403:
   *         description: Доступ запрещен
   */
  router.get('/users', protect, isModOrAdmin, async (req, res) => {
    try {
      const { page = 1, limit = 20, role, search } = req.query;

      const filters = {};
      if (role) {
        filters[`roles.${role}`] = true;
      }
      if (search) {
        filters.$or = [
          { username: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
        ];
      }
      
      const users = await User.find(filters)
        .select('-password -__v')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean();

      const totalUsers = await User.countDocuments(filters);

      res.json({
        users,
        totalPages: Math.ceil(totalUsers / limit),
        currentPage: parseInt(page),
        totalUsers,
      });

    } catch (error) {
      console.error('Ошибка при получении списка пользователей:', error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  });

  /**
   * @swagger
   * /api/admin/users/{id}:
   *   get:
   *     summary: Получить полную информацию о пользователе (для админов)
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
   *         description: Полная информация о пользователе
   *       403:
   *         description: Доступ запрещен
   *       404:
   *         description: Пользователь не найден
   */
  router.get('/users/:id', protect, isModOrAdmin, async (req, res) => {
    try {
      const user = await User.findById(req.params.id)
        .select('+password') // Админ может видеть, установлен ли пароль
        .populate('banDetails.bannedBy', 'username');

      if (!user) {
        return res.status(404).json({ msg: 'Пользователь не найден' });
      }

      // Возможно, в будущем здесь будет агрегация доп. данных (кол-во заявок, отзывов и т.д.)
      res.json(user);

    } catch (error) {
      console.error(`Ошибка при получении данных пользователя ${req.params.id}:`, error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  });

  /**
   * @swagger
   * /api/admin/users/{id}:
   *   put:
   *     summary: Обновить информацию о пользователе (для админов)
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: 'string' }
   *         description: ID пользователя для обновления
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               username: { type: 'string' }
   *               phone: { type: 'string' }
   *               location: { type: 'string' }
   *               bio: { type: 'string' }
   *     responses:
   *       200:
   *         description: Пользователь успешно обновлен
   *       400:
   *         description: Ошибка валидации или некорректные данные
   *       404:
   *         description: Пользователь не найден
   */
  router.put('/users/:id', protect, isAdmin, [
    body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Никнейм должен быть от 3 до 30 символов.'),
    body('phone').optional({ checkFalsy: true }).isMobilePhone('ru-RU').withMessage('Неверный формат номера телефона.'),
    body('location').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
    body('bio').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { username, phone, location, bio } = req.body;
      
      const userToUpdate = await User.findById(req.params.id);
      if (!userToUpdate) {
        return res.status(404).json({ msg: 'Пользователь не найден' });
      }

      // Проверка на уникальность нового username, если он меняется
      if (username !== userToUpdate.username) {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
          return res.status(400).json({ msg: 'Это имя пользователя уже занято' });
        }
      }

      userToUpdate.username = username;
      userToUpdate.phone = phone;
      userToUpdate.location = location;
      userToUpdate.bio = bio;

      await userToUpdate.save();

      res.json(userToUpdate);

    } catch (error) {
      console.error(`Ошибка при обновлении пользователя ${req.params.id}:`, error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  });

  /**
   * @swagger
   * /api/admin/users/{id}/role:
   *   put:
   *     summary: Изменить роль пользователя
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: 'string' }
   *         description: ID пользователя
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               newRole:
   *                 type: string
   *                 enum: ['user', 'helper', 'moderator']
   *                 description: Новая роль
   *     responses:
   *       200:
   *         description: Роль успешно обновлена
   *       400:
   *         description: Некорректные данные
   *       403:
   *         description: Доступ запрещен
   *       404:
   *         description: Пользователь не найден
   */
  router.put('/users/:id/role', protect, isModOrAdmin, [
      body('newRole').isIn(['user', 'helper', 'moderator']).withMessage('Недопустимая роль.'),
    ], async (req, res) => {
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const { id: targetUserId } = req.params;
      const { newRole } = req.body;
      const adminUser = req.user;

      const targetUser = await User.findById(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ msg: 'Пользователь не найден' });
      }

      // Защита: нельзя изменять свою роль через этот эндпоинт
      if (targetUser._id.equals(adminUser._id)) {
        return res.status(403).json({ msg: 'Вы не можете изменить свою собственную роль.' });
      }

      // Защита: нельзя изменять роль другого админа
      if (targetUser.roles.admin) {
        return res.status(403).json({ msg: 'Вы не можете изменять роль другого администратора.' });
      }

      // Защита: только админ может назначать/снимать модераторов
      if ((newRole === 'moderator' || targetUser.roles.moderator) && !adminUser.roles.admin) {
        return res.status(403).json({ msg: 'Только администратор может управлять модераторами.' });
      }

      // Сбрасываем все роли и устанавливаем новую
      targetUser.roles = {
        user: newRole === 'user' || newRole === 'helper', // юзер или хелпер - всегда юзер
        helper: newRole === 'helper',
        moderator: newRole === 'moderator',
        admin: false // Админа назначить нельзя
      };
      
      await targetUser.save();
      res.json(targetUser);

    } catch (error) {
      console.error('Ошибка при смене роли:', error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  });

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

  /**
   * @summary Шаг 1: Инициировать удаление пользователя и отправить код в Telegram
   */
  router.post('/users/:id/delete-request', protect, isAdmin, async (req, res) => {
    try {
      const adminUser = await User.findById(req.user.id);
      const userIdToDelete = req.params.id;

      if (!adminUser.telegramId) {
        return res.status(403).json({ msg: 'Для выполнения этого действия ваш аккаунт администратора должен быть привязан к Telegram.' });
      }

      if (adminUser._id.toString() === userIdToDelete) {
        return res.status(400).json({ msg: 'Вы не можете удалить свой собственный аккаунт через админ-панель.' });
      }

      const userToDelete = await User.findById(userIdToDelete);
      if (!userToDelete) {
        return res.status(404).json({ msg: 'Пользователь для удаления не найден.' });
      }

      if (userToDelete.roles.admin) {
        return res.status(403).json({ msg: 'Невозможно удалить другого администратора.' });
      }

      const confirmationCode = crypto.randomInt(100000, 999999).toString();
      const redisKey = `admin-delete-code:${adminUser._id}:${userIdToDelete}`;
      await redis.set(redisKey, confirmationCode, 'EX', 600); // Код живет 10 минут

      const telegramMessage = `❗️ *Подтверждение удаления аккаунта* ❗️\n\nВы (администратор **${adminUser.username}**) запросили удаление аккаунта **${userToDelete.username}**.\n\nДля подтверждения введите этот код в админ-панели:\n\n*Код: \`${confirmationCode}\`*\n\nКод действителен 10 минут. Если это были не вы, срочно смените пароль.`;
      
      await sendTelegramMessage(adminUser.telegramId, telegramMessage);

      res.status(200).json({ msg: 'Код подтверждения отправлен в ваш Telegram.' });

    } catch (err) {
      console.error('Ошибка при запросе на удаление аккаунта админом:', err);
      res.status(500).json({ msg: 'Ошибка сервера при запросе на удаление.' });
    }
  });

  /**
   * @summary Шаг 2: Подтвердить удаление с помощью кода
   */
  router.delete('/users/:id', protect, isAdmin, [
    body('confirmationCode').notEmpty().isLength({ min: 6, max: 6 }).withMessage('Код подтверждения должен состоять из 6 цифр.'),
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const adminUserId = req.user.id;
      const userIdToDelete = req.params.id;
      const { confirmationCode } = req.body;
      const redisKey = `admin-delete-code:${adminUserId}:${userIdToDelete}`;

      const storedCode = await redis.get(redisKey);

      if (!storedCode) {
        return res.status(400).json({ msg: 'Код подтверждения истек или не был запрошен.' });
      }

      if (storedCode !== confirmationCode) {
        return res.status(400).json({ msg: 'Неверный код подтверждения.' });
      }
      
      // --- ЛОГИКА УДАЛЕНИЯ (как в /me/delete) ---
      await Request.updateMany(
        { helper: userIdToDelete, status: { $in: ['assigned', 'in_progress'] } },
        { $set: { status: 'open' }, $unset: { helper: 1 } }
      );
      const userRequests = await Request.find({ author: userIdToDelete }).select('_id');
      const requestIds = userRequests.map(r => r._id);
      if (requestIds.length > 0) {
        await Message.deleteMany({ requestId: { $in: requestIds } });
        await Review.deleteMany({ requestId: { $in: requestIds } });
        await Request.deleteMany({ _id: { $in: requestIds } });
      }
      await Review.deleteMany({ reviewerId: userIdToDelete });
      await Notification.deleteMany({ user: userIdToDelete });
      const deletedUser = await User.findByIdAndDelete(userIdToDelete);
      // --- КОНЕЦ ЛОГИКИ УДАЛЕНИЯ ---

      if (!deletedUser) {
        return res.status(404).json({ msg: 'Пользователь не был найден в процессе удаления.' });
      }

      await redis.del(redisKey);

      res.status(200).json({ msg: `Аккаунт пользователя ${deletedUser.username} и все связанные данные были успешно удалены.` });

    } catch (err) {
      console.error('Ошибка при подтверждении удаления аккаунта админом:', err);
      res.status(500).json({ msg: 'Ошибка сервера при удалении аккаунта.' });
    }
  });

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

  /**
   * @swagger
   * /api/admin/requests:
   *   get:
   *     summary: Получить список всех заявок (для админов)
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema: { type: 'integer', default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: 'integer', default: 20 }
   *       - in: query
   *         name: status
   *         schema: { type: 'string' }
   *       - in: query
   *         name: search
   *         schema: { type: 'string' }
   *         description: Поиск по заголовку
   *     responses:
   *       200:
   *         description: Список заявок
   */
  router.get('/requests', protect, isModOrAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, status, search, subject, dateFrom, dateTo } = req.query;

        const filters = {};
        if (status) {
            filters.status = status;
        }
        if (search) {
            // Ищем по заголовку ИЛИ по ID автора (если search - это валидный ID)
            const searchFilter = [{ title: { $regex: search, $options: 'i' } }];
            if (mongoose.Types.ObjectId.isValid(search)) {
                searchFilter.push({ author: search });
            }
            filters.$or = searchFilter;
        }
        if (subject) {
            filters.subject = subject;
        }
        if (dateFrom || dateTo) {
            filters.createdAt = {};
            if (dateFrom) {
                filters.createdAt.$gte = new Date(dateFrom);
            }
            if (dateTo) {
                // Включаем весь день до конца
                const toDate = new Date(dateTo);
                toDate.setHours(23, 59, 59, 999);
                filters.createdAt.$lte = toDate;
            }
        }

        const requests = await Request.find(filters)
            .populate('author', 'username avatar')
            .populate('helper', 'username avatar')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean();

        const totalRequests = await Request.countDocuments(filters);

        res.json({
            requests,
            totalPages: Math.ceil(totalRequests / limit),
            currentPage: parseInt(page),
            totalRequests
        });
    } catch (error) {
        console.error('Ошибка при получении списка заявок (админ):', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
  });

  /**
   * @swagger
   * /api/admin/requests/{id}:
   *   get:
   *     summary: Получить детальную информацию о заявке (для админов)
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: 'string' }
   *     responses:
   *       200:
   *         description: Детальная информация о заявке
   *       404:
   *         description: Заявка не найдена
   */
  router.get('/requests/:id', protect, isModOrAdmin, async (req, res) => {
    try {
        const request = await Request.findById(req.params.id)
            .populate('author', 'username avatar email phone location')
            .populate('helper', 'username avatar email phone location')
            .populate('editedByAdminInfo.editorId', 'username');

        if (!request) {
            return res.status(404).json({ msg: 'Заявка не найдена' });
        }

        res.json(request);
    } catch (error) {
        console.error(`Ошибка при получении заявки ${req.params.id} (админ):`, error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
  });

  /**
   * @swagger
   * /api/admin/requests/{id}:
   *   put:
   *     summary: Редактировать заявку (для админов)
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema: { type: "object", properties: { description: { type: "string" }, reason: { type: "string" } } }
   *     responses:
   *       200: { description: "Заявка обновлена" }
   */
  router.put('/requests/:id', protect, isModOrAdmin, attachmentUpload.array('attachments', 10), [
      body('title').optional().trim().isLength({ min: 5, max: 100 }).withMessage('Заголовок должен быть от 5 до 100 символов.'),
      body('description').optional().trim().isLength({ min: 20 }).withMessage('Описание должно содержать минимум 20 символов.'),
      body('subject').optional().notEmpty().withMessage('Предмет не может быть пустым.'),
      body('grade').optional().notEmpty().withMessage('Класс не может быть пустым.'),
      body('reason').notEmpty().withMessage('Причина редактирования обязательна.')
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Если есть ошибки валидации, и были загружены новые файлы, их нужно удалить
      if (req.files) {
        req.files.forEach(file => deleteFile('attachments', file.filename));
      }
      return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { title, description, subject, grade, reason, deletedAttachments } = req.body;
        const request = await Request.findById(req.params.id).populate('attachments');
        if (!request) {
            if (req.files) {
              req.files.forEach(file => deleteFile('attachments', file.filename));
            }
            return res.status(404).json({ msg: 'Заявка не найдена' });
        }

        // Обновляем поля, если они переданы
        if (title) request.title = title;
        if (description) request.description = description;
        if (subject) request.subject = subject;
        if (grade) request.grade = grade;

        // Обрабатываем удаление старых вложений
        if (deletedAttachments) {
            const attachmentsToDelete = JSON.parse(deletedAttachments);
            if (Array.isArray(attachmentsToDelete) && attachmentsToDelete.length > 0) {
                request.attachments = request.attachments.filter(att => {
                    const shouldDelete = attachmentsToDelete.includes(att.filename);
                    if (shouldDelete) {
                        deleteFile('attachments', att.filename);
                    }
                    return !shouldDelete;
                });
            }
        }
        
        // Добавляем новые вложения
        if (req.files && req.files.length > 0) {
             const newAttachments = req.files.map(file => ({
                originalName: file.originalname,
                filename: file.filename,
                path: file.path,
                size: file.size,
                mimeType: file.mimetype
            }));
            request.attachments.push(...newAttachments);
        }

        // Записываем информацию о редактировании
        request.editedByAdminInfo = {
            editorId: req.user.id,
            reason: reason,
            editedAt: new Date(),
        };
        
        const updatedRequest = await request.save();

        const populatedRequest = await Request.findById(updatedRequest._id)
            .populate('author', 'username avatar email')
            .populate('helper', 'username avatar email')
            .populate('editedByAdminInfo.editorId', 'username')
            .populate('attachments');

        res.json(populatedRequest);
    } catch (err) {
        console.error('Ошибка при обновлении заявки админом:', err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
  });

  /**
   * @swagger
   * /api/admin/requests/{id}:
   *   delete:
   *     summary: Удалить заявку (для админов)
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }]
   *     responses:
   *       200: { description: "Заявка и связанные данные удалены" }
   */
  router.delete('/requests/:id', protect, isAdmin, async (req, res) => {
    try {
        const requestId = req.params.id;
        const request = await Request.findById(requestId);
        if (!request) return res.status(404).json({ msg: 'Заявка не найдена' });

        // Удаляем связанные сущности
        await Message.deleteMany({ requestId: requestId });
        await Review.deleteMany({ requestId: requestId });
        await Notification.deleteMany({ 'relatedEntity.requestId': requestId });
        
        await Request.findByIdAndDelete(requestId);

        res.json({ msg: 'Заявка и все связанные с ней данные удалены.' });
    } catch (err) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
  });

  return router;
}; 