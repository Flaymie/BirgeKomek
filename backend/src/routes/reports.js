import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { protect, isModOrAdmin } from '../middleware/auth.js';
import { createReportLimiter } from '../middleware/rateLimiters.js'; // Импортируем лимитер
import Report from '../models/Report.js';
import User from '../models/User.js';
import Request from '../models/Request.js';
import { createAndSendNotification } from './notifications.js';


const router = express.Router();

// --- НАСТРОЙКА MULTER ДЛЯ ВЛОЖЕНИЙ В ЖАЛОБАХ ---
const attachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/reports';
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
    fileSize: 10 * 1024 * 1024, // 10 МБ
    files: 5 // до 5 файлов
  }
}).array('attachments', 5);
// -------------------------------------------------

// ЭКСПОРТИРУЕМ ФУНКЦИЮ, ЧТОБЫ ПРИНЯТЬ io И ИНКАПСУЛИРОВАТЬ ВСЮ ЛОГИКУ
export default ({ io }) => {
  // @desc    Создать новую жалобу
  // @route   POST /api/reports
  // @access  Private
  router.post('/', protect, createReportLimiter, async (req, res, next) => { // Добавляем лимитер
    // --- ПРОВЕРКА ВОЗРАСТА АККАУНТА ---
    const userAccountAge = (new Date() - new Date(req.user.createdAt)) / (1000 * 60 * 60 * 24); // в днях
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

          // Теперь остальная логика
          const { targetType, targetId, reason, category } = req.body;
          const reporterId = req.user.id;
          
          // --- ПРОВЕРКА КУЛДАУНА НА ПОВТОРНУЮ ЖАЛОБУ ---
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
        
          // Проверяем, что цель существует
          let target;
          if (targetType === 'User') {
            target = await User.findById(targetId);
          } else if (targetType === 'Request') {
            target = await Request.findById(targetId);
          }
        
          if (!target) {
            return res.status(404).json({ msg: `Объект жалобы (${targetType}) не найден` });
          }
          
          // Нельзя жаловаться на самого себя
          if (targetType === 'User' && targetId === reporterId) {
              return res.status(400).json({ msg: 'Вы не можете пожаловаться на самого себя' });
          }
        
          try {
              const attachmentsData = (req.files || []).map(file => ({
                  originalName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
                  filename: file.filename,
                  path: file.path,
                  mimetype: file.mimetype,
                  size: file.size,
              }));

              const report = await Report.create({
                  reporter: reporterId,
                  targetType,
                  targetId,
                  reason,
                  category,
                  attachments: attachmentsData,
              });
              
              // --- УВЕДОМЛЕНИЕ АДМИНОВ И МОДЕРОВ ---
              const adminsAndMods = await User.find({
                $or: [
                  { 'roles.admin': true },
                  { 'roles.moderator': true }
                ]
              }).select('_id');
              const reporterUser = await User.findById(reporterId).select('username');

              console.log(`Найдено ${adminsAndMods.length} админов и модераторов для уведомления`);
              
              for (const adminOrMod of adminsAndMods) {
                  if (adminOrMod._id.toString() !== reporterId) { // Не отправляем уведомление, если модер сам на себя пожаловался (хотя это запрещено выше)
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
              // ------------------------------------

              // --- ЛОГИКА АВТОБАНА/АВТОУДАЛЕНИЯ ---
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
                  // Закрываем все жалобы на этот объект
                  await Report.updateMany(
                      { targetId: targetId, targetType: targetType, status: 'open' },
                      { $set: { status: 'resolved', moderatorComment: 'Автоматическое закрытие в связи с большим количеством жалоб и применением санкций.' } }
                  );
              }
              // ------------------------------------
            
            res.status(201).json(report);
          } catch (error) {
              console.error(error);
              // Если ошибка валидации Mongoose
              if (error.name === 'ValidationError') {
                   return res.status(400).json({ msg: Object.values(error.errors).map(e => e.message).join(', ') });
              }
              res.status(500).json({ msg: 'Ошибка сервера при создании жалобы' });
          }
      });
  });

  // @desc    Получить все жалобы (для модераторов/админов)
  // @route   GET /api/reports
  // @access  Private (Moderator, Admin)
  router.get('/', protect, isModOrAdmin, async (req, res) => {
      try {
          const reports = await Report.find()
              .populate('reporter', 'username avatar')
              .populate('targetId') // Mongoose сам разберется, из какой коллекции брать, благодаря refPath
              .sort({ createdAt: -1 });

          res.json(reports);
      } catch (error) {
          console.error(error);
          res.status(500).json({ msg: 'Ошибка сервера при получении жалоб' });
      }
  });

  // @desc    Получить одну жалобу по ID (для модераторов/админов)
  // @route   GET /api/reports/:id
  // @access  Private (Moderator, Admin)
  router.get('/:id', protect, isModOrAdmin, async (req, res) => {
      try {
          const report = await Report.findById(req.params.id)
              .populate('reporter', 'username _id')
              .populate({
                  path: 'targetId',
                  model: 'User', // Указываем модель явно, для надежности
                  populate: [
                      { path: 'createdRequests' }, // Популируем виртуальное поле
                      { path: 'completedRequests' } // И это тоже
                  ]
              });

          if (!report) {
              return res.status(404).json({ msg: 'Жалоба не найдена' });
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

  // @desc    Получить историю жалоб на конкретного пользователя
  // @route   GET /api/reports/user/:userId
  // @access  Private (Moderator, Admin)
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

  // @desc    Обновить статус жалобы
  // @route   PUT /api/reports/:id
  // @access  Private (Moderator, Admin)
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
          
          report.status = status;
          if (moderatorComment) {
              report.moderatorComment = moderatorComment;
          }
          await report.save();
          
          // Полностью и заново популируем репорт, чтобы вернуть на фронт свежие данные
          const populatedReport = await Report.findById(report._id).populate('reporter', 'username avatar email roles');
          if (populatedReport.targetType === 'Request') {
              await populatedReport.populate({
                  path: 'targetId', model: 'Request',
                  populate: [{ path: 'author', select: 'username avatar' }, { path: 'helper', select: 'username avatar' }]
              });
          } else {
              await populatedReport.populate('targetId', 'username avatar createdAt roles rating completedRequests createdRequests');
          }

          // --- УВЕДОМЛЕНИЕ АВТОРУ ЖАЛОБЫ ---
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
          // ------------------------------------

          res.json(populatedReport);

      } catch (error) {
          console.error("Ошибка при обновлении статуса жалобы:", error);
          res.status(500).json({ msg: 'Ошибка сервера' });
      }
  });

  return router; // ВОЗВРАЩАЕМ СКОНФИГУРИРОВАННЫЙ РОУТЕР В КОНЦЕ
}; 