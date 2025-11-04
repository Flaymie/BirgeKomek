import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { protect, isModOrAdmin } from '../middleware/auth.js';
import { createReportLimiter } from '../middleware/rateLimiters.js';
import Report from '../models/Report.js';
import User from '../models/User.js';
import Request from '../models/Request.js';
import { createAndSendNotification } from './notifications.js';
import { uploadToCloudinary, deleteFromCloudinary, extractPublicId } from '../utils/cloudinaryUpload.js';


const router = express.Router();

const attachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/temp';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${req.user.id}-${Date.now()}`;
    const decodedFileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, uniqueSuffix + '-' + path.extname(decodedFileName));
  }
});

const imageFileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Разрешены только изображения (JPG, PNG, GIF, WEBP)'), false);
  }
};

const uploadReportAttachments = multer({
  storage: attachmentStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 5
  }
}).array('attachments', 5);

export default ({ io }) => {
  /**
   * @swagger
   * /api/reports:
   *   post:
   *     summary: Создать новую жалобу
   *     tags: [Reports]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required:
   *               - targetType
   *               - targetId
   *               - reason
   *               - category
   *             properties:
   *               targetType:
   *                 type: string
   *                 enum: [User, Request]
   *                 description: Тип объекта, на который подается жалоба.
   *               targetId:
   *                 type: string
   *                 description: ID объекта жалобы.
   *               reason:
   *                 type: string
   *                 description: Подробное описание причины жалобы.
   *               category:
   *                 type: string
   *                 enum: [spam, insult, fraud, illegal_content, other]
   *                 description: Категория жалобы.
   *               attachments:
   *                 type: array
   *                 items:
   *                   type: string
   *                   format: binary
   *                 description: Вложения (до 5 изображений, до 10МБ каждое).
   *     responses:
   *       '201':
   *         description: Жалоба успешно создана.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Report'
   *       '400':
   *         description: Неверные данные запроса, ошибка загрузки файла или жалоба на самого себя.
   *       '401':
   *         description: Необходима авторизация.
   *       '403':
   *         description: Аккаунт слишком новый для подачи жалоб.
   *       '404':
   *         description: Объект жалобы не найден.
   *       '429':
   *         description: Слишком много запросов (превышен лимит или повторная жалоба в течение 24 часов).
   *       '500':
   *         description: Ошибка сервера.
   */
  router.post('/', protect, createReportLimiter, async (req, res, next) => {
    const userAccountAge = (new Date() - new Date(req.user.createdAt)) / (1000 * 60 * 60 * 24);
    if (userAccountAge < 2) {
      return res.status(403).json({ msg: 'Ваш аккаунт слишком новый для подачи жалоб. Попробуйте через некоторое время.' });
    }

    // Оборачиваем multer в middleware, чтобы он сработал после наших проверок
    uploadReportAttachments(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
              return res.status(400).json({ msg: `Ошибка при загрузке файла: ${err.message}` });
          } else if (err) {
              return res.status(400).json({ msg: err.message });
          }

          // Дальше остальная логика
          const { targetType, targetId, reason, category } = req.body;
          const reporterId = req.user.id;
          
          // кд на повторную жалобу
          const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const existingReport = await Report.findOne({
            reporter: reporterId,
            targetId: targetId,
            targetType: targetType,
            createdAt: { $gte: twentyFourHoursAgo }
          });

          if (existingReport) {
            return res.status(429).json({ msg: 'Вы уже недавно жаловались на этот объект. Повторная жалоба будет доступна через 24 часа.' });
          }
        
          // проверяем, что цель существует
          let target;
          if (targetType === 'User') {
            target = await User.findById(targetId);
          } else if (targetType === 'Request') {
            target = await Request.findById(targetId);
          }
        
          if (!target) {
            return res.status(404).json({ msg: `Объект жалобы (${targetType}) не найден` });
          }
          
          // нельзя жаловаться на самого себя
          if (targetType === 'User' && targetId === reporterId) {
              return res.status(400).json({ msg: 'Вы не можете пожаловаться на самого себя' });
          }
        
          try {
              // Загружаем файлы в Cloudinary
              console.log('📎 Загрузка вложений репорта:', req.files?.length || 0, 'файлов');
              const attachmentsData = await Promise.all((req.files || []).map(async (file) => {
                  console.log('📤 Загружаю файл в Cloudinary:', file.originalname);
                  const cloudinaryResult = await uploadToCloudinary(file.path, 'birgekomek/reports', 'image');
                  console.log('✅ Файл загружен:', cloudinaryResult.url);
                  
                  return {
                      originalName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
                      filename: file.filename,
                      path: cloudinaryResult.url,
                      mimetype: file.mimetype,
                      size: file.size,
                  };
              }));

              const report = await Report.create({
                  reporter: reporterId,
                  targetType,
                  targetId,
                  reason,
                  category,
                  attachments: attachmentsData,
              });
              
              // уведомление админов и модеров
              const adminsAndMods = await User.find({
                $or: [
                  { 'roles.admin': true },
                  { 'roles.moderator': true }
                ]
              }).select('_id');
              const reporterUser = await User.findById(reporterId).select('username');

              console.log(`Найдено ${adminsAndMods.length} админов и модераторов для уведомления`);
              
              for (const adminOrMod of adminsAndMods) {
                  if (adminOrMod._id.toString() !== reporterId) { // Не отправляем уведомление, если модер сам на себя пожаловался (хотя это запрещено выше...)
                      try {
                          await createAndSendNotification({
                              user: adminOrMod._id,
                              type: 'new_report',
                              title: `Новая жалоба на ${targetType === 'User' ? 'пользователя' : 'заявку'}`,
                              message: `Пользователь ${reporterUser.username} подал новую жалобу. Причина: "${reason.substring(0, 50)}..."`,
                              link: `/reports/${report._id}`,
                              relatedEntity: { reportId: report._id, reporterId: reporterId }
                          });
                      } catch (notifError) {
                          console.error(`Ошибка при отправке уведомления админу/модеру ${adminOrMod._id}:`, notifError);
                      }
                  }
              }

              // логика автобана/автоудаления
              const openReportsCount = await Report.countDocuments({ targetId: targetId, targetType: targetType, status: 'open' });

              if (openReportsCount >= 5) {
                  if (targetType === 'User') {
                      const userToBan = await User.findById(targetId);
                      if (userToBan && !userToBan.banDetails.isBanned) {
                          userToBan.banDetails.isBanned = true;
                          userToBan.banDetails.reason = 'Автоматическая блокировка из-за 5+ активных жалоб.';
                          userToBan.banDetails.bannedAt = new Date();
                          await userToBan.save();
                      }
                  } else if (targetType === 'Request') {
                      await Request.findByIdAndDelete(targetId);
                  }
                  // закрываем все жалобы на этот объект
                  await Report.updateMany(
                      { targetId: targetId, targetType: targetType, status: 'open' },
                      { $set: { status: 'resolved', moderatorComment: 'Автоматическое закрытие в связи с большим количеством жалоб и применением санкций.' } }
                  );
              }
            
            res.status(201).json(report);
          } catch (error) {
              console.error(error);
              // если ошибка валидации Mongoose
              if (error.name === 'ValidationError') {
                   return res.status(400).json({ msg: Object.values(error.errors).map(e => e.message).join(', ') });
              }
              res.status(500).json({ msg: 'Ошибка сервера при создании жалобы' });
          }
      });
  });

  /**
   * @swagger
   * /api/reports:
   *   get:
   *     summary: Получить все жалобы (для модераторов/админов)
   *     tags: [Reports]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       '200':
   *         description: Список всех жалоб.
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Report'
   *       '401':
   *         description: Необходима авторизация.
   *       '403':
   *         description: Доступ запрещен (необходимы права модератора или администратора).
   *       '500':
   *         description: Ошибка сервера.
   */
  router.get('/', protect, isModOrAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 9, status, search } = req.query;

        const query = {};
        if (status && status !== 'all') {
            query.status = status;
        }

        if (search) {
            // Эта часть сложная, так как поиск идет по популированным полям.
            // Мы не можем напрямую искать по `targetId.username` в `Report.find()`.
            // Сначала найдем ID подходящих пользователей и заявок, а потом используем их в основном запросе.
            
            const searchRegex = new RegExp(search, 'i');
            
            const matchingUsers = await User.find({ username: searchRegex }).select('_id');
            const matchingUserIds = matchingUsers.map(u => u._id);

            const matchingRequests = await Request.find({ title: searchRegex }).select('_id');
            const matchingRequestIds = matchingRequests.map(r => r._id);

            const matchingTargetIds = [...matchingUserIds, ...matchingRequestIds];
            
            query.$or = [
                { reason: searchRegex },
                { category: searchRegex },
                { targetId: { $in: matchingTargetIds } } 
            ];
        }

        const reports = await Report.find(query)
            .populate('reporter', 'username avatar')
            .populate('targetId', 'username title')
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .sort({ createdAt: -1 });

        const totalReports = await Report.countDocuments(query);
        const totalPages = Math.ceil(totalReports / limit);

        res.json({
            reports,
            currentPage: parseInt(page),
            totalPages,
            totalReports
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Ошибка сервера при получении жалоб' });
    }
});

  /**
   * @swagger
   * /api/reports/{id}:
   *   get:
   *     summary: Получить одну жалобу по ID (для модераторов/админов)
   *     tags: [Reports]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: ID жалобы.
   *     responses:
   *       '200':
   *         description: Детали жалобы.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Report'
   *       '401':
   *         description: Необходима авторизация.
   *       '403':
   *         description: Доступ запрещен (необходимы права модератора или администратора).
   *       '404':
   *         description: Жалоба не найдена.
   *       '500':
   *         description: Ошибка сервера.
   */
  router.get('/:id', protect, isModOrAdmin, async (req, res) => {
      try {
          const report = await Report.findById(req.params.id)
              .populate('reporter', 'username _id')
              .populate('assignedTo', 'username _id');

          if (!report) {
              return res.status(404).json({ msg: 'Жалоба не найдена' });
          }

          // Динамически популируем targetId в зависимости от targetType
          if (report.targetType === 'User') {
              await report.populate({
                  path: 'targetId',
                  model: 'User',
                  select: 'username avatar createdAt roles rating averageRating completedRequests createdRequests',
                  populate: [
                      { path: 'createdRequests' },
                      { path: 'completedRequests' }
                  ]
              });
          } else if (report.targetType === 'Request') {
              await report.populate({
                  path: 'targetId',
                  model: 'Request',
                  select: 'title description status author helper createdAt',
                  populate: { path: 'author', select: 'username' }
              });
          }

          res.json(report);
      } catch (error) {
          console.error(error);
          if (error.kind === 'ObjectId') {
               return res.status(404).json({ msg: 'Жалоба не найдена (неверный формат ID)' });
          }
          res.status(500).json({ msg: 'Ошибка сервера' });
      }
  });

  /**
   * @swagger
   * /api/reports/user/{userId}:
   *   get:
   *     summary: Получить историю жалоб на конкретного пользователя (для модераторов/админов)
   *     tags: [Reports]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID пользователя, на которого были поданы жалобы.
   *     responses:
   *       '200':
   *         description: Список жалоб на пользователя.
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Report'
   *       '401':
   *         description: Необходима авторизация.
   *       '403':
   *         description: Доступ запрещен (необходимы права модератора или администратора).
   *       '500':
   *         description: Ошибка сервера.
   */
  router.get('/user/:userId', protect, isModOrAdmin, async (req, res) => {
      try {
          const { userId } = req.params;
          const reports = await Report.find({ targetId: userId, targetType: 'User' })
              .populate('reporter', 'username')
              .sort({ createdAt: -1 });
          
          res.json(reports);
      } catch (error) {
          console.error("Ошибка при получении истории жалоб:", error);
          res.status(500).json({ msg: 'Ошибка сервера' });
      }
  });

  /**
   * @swagger
   * /api/reports/{id}:
   *   put:
   *     summary: Обновить статус жалобы (для модераторов/админов)
   *     tags: [Reports]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: ID жалобы для обновления.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [open, in_progress, resolved, rejected]
   *                 description: Новый статус жалобы.
   *               moderatorComment:
   *                 type: string
   *                 description: Комментарий модератора (необязательно).
   *     responses:
   *       '200':
   *         description: Жалоба успешно обновлена.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Report'
   *       '400':
   *         description: Неверный статус.
   *       '401':
   *         description: Необходима авторизация.
   *       '403':
   *         description: Доступ запрещен (необходимы права модератора или администратора).
   *       '404':
   *         description: Жалоба не найдена.
   *       '500':
   *         description: Ошибка сервера.
   */
  router.put('/:id', protect, isModOrAdmin, async (req, res) => {
      try {
          const { status, moderatorComment } = req.body;
          
          if (!['open', 'in_progress', 'resolved', 'rejected'].includes(status)) {
              return res.status(400).json({ msg: 'Неверный статус для жалобы' });
          }

          const report = await Report.findById(req.params.id);

          if (!report) {
              return res.status(404).json({ msg: 'Жалоба не найдена' });
          }
          
          // Проверка прав доступа
          if (status === 'in_progress') {
              // Взять в работу может любой админ/модератор
              report.assignedTo = req.user._id;
          } else if (status === 'resolved' || status === 'rejected') {
              // Завершить может только тот, кто взял в работу
              if (report.assignedTo && report.assignedTo.toString() !== req.user._id.toString()) {
                  return res.status(403).json({ msg: 'Только модератор, который взял жалобу в работу, может её завершить' });
              }
              report.resolvedBy = req.user._id;
          }
          
          report.status = status;
          if (moderatorComment) {
              report.moderatorComment = moderatorComment;
          }
          await report.save();
          
          // Полностью и заново популируем репорт, чтобы вернуть на фронт свежие данные
          const populatedReport = await Report.findById(report._id)
              .populate('reporter', 'username avatar email roles')
              .populate('assignedTo', 'username');
          if (populatedReport.targetType === 'Request') {
              await populatedReport.populate({
                  path: 'targetId', model: 'Request',
                  populate: [{ path: 'author', select: 'username avatar' }, { path: 'helper', select: 'username avatar' }]
              });
          } else {
              await populatedReport.populate('targetId', 'username avatar createdAt roles rating completedRequests createdRequests');
          }

          // уведомление автору жалобы
          const STATUS_LABELS_RU = {
              in_progress: 'взята в работу',
              resolved: 'рассмотрена и решена',
              rejected: 'отклонена'
          };
          const statusText = STATUS_LABELS_RU[status];
          if (statusText) {
               await createAndSendNotification({
                  user: report.reporter,
                  type: 'report_status_changed',
                  title: `Статус жалобы обновлен`,
                  message: `Модератор обновил статус вашей жалобы. Теперь она ${statusText}. ${moderatorComment ? `Комментарий: "${moderatorComment}"` : ''}`,
                  link: `/profile/me`, // Прямой ссылки на жалобу у юзера нет, кидаем в профиль
                  relatedEntity: { reportId: report._id }
              });
          }

          res.json(populatedReport);

      } catch (error) {
          console.error("Ошибка при обновлении статуса жалобы:", error);
          res.status(500).json({ msg: 'Ошибка сервера' });
      }
  });

  return router;
};