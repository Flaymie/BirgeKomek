import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { protect } from '../middleware/auth.js';
import { generalLimiter } from '../middleware/rateLimiters.js';
import User from '../models/User.js';
import tgRequired from '../middleware/tgRequired.js';

const router = express.Router();

// Настройка хранилища для загрузки аватарок
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/avatars';
    // Создаем директорию, если она не существует
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Генерируем уникальное имя файла на основе ID пользователя
    const userId = req.user.id;
    const ext = path.extname(file.originalname);
    cb(null, `${userId}-${Date.now()}${ext}`);
  }
});

// Фильтр для проверки типов файлов - только изображения
const fileFilter = (req, file, cb) => {
  // Разрешенные типы файлов для аватарок
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Поддерживаются только изображения (JPG, PNG, GIF, WEBP)'), false);
  }
};

// Настройка загрузчика
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 МБ
  }
});

/**
 * @swagger
 * /api/upload/avatar:
 *   post:
 *     summary: Загрузить или обновить аватар пользователя
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: avatar
 *         type: file
 *         required: true
 *         description: Изображение для аватара (JPG, PNG, GIF, WEBP до 5MB)
 *     responses:
 *       200:
 *         description: Аватар успешно обновлен
 *       400:
 *         description: Ошибка валидации или неверные данные
 *       401:
 *         description: Не авторизован
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post('/avatar', [protect, tgRequired, generalLimiter, upload.single('avatar')], async (req, res) => {
  try {
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ msg: 'Файл не загружен' });
    }
    
    // Формируем относительный путь к файлу
    const avatarPath = `/uploads/avatars/${file.filename}`;
    
    // Обновляем поле avatar у пользователя
    const user = await User.findById(req.user.id);
    
    // Если у пользователя уже был аватар, удаляем старый файл
    if (user.avatar) {
      const oldAvatarPath = path.join(process.cwd(), user.avatar.replace(/^\//, ''));
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }
    
    // Сохраняем новый путь к аватару
    user.avatar = avatarPath;
    await user.save();
    
    // Создаем полный URL для ответа
    const baseUrl = process.env.BASE_URL || 'http://192.168.1.87:5050';
    const fullAvatarUrl = `${baseUrl}${avatarPath}`;
    
    res.json({ 
      msg: 'Аватар успешно обновлен',
      avatar: avatarPath,
      avatarUrl: fullAvatarUrl
    });
  } catch (err) {
    console.error('Ошибка при загрузке аватара:', err);
    res.status(500).json({ msg: 'Что-то пошло не так при загрузке аватара' });
  }
});

// --- НОВЫЙ КОД ДЛЯ ВЛОЖЕНИЙ ---

// Настройка хранилища для вложений
const attachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/attachments';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const userId = req.user.id;
    const uniqueSuffix = `${userId}-${Date.now()}`;
    // FIX: Декодируем имя файла из latin1 в utf8 для поддержки кириллицы
    const decodedFileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, uniqueSuffix + '-' + decodedFileName);
  }
});

// Фильтр для файлов вложений
const attachmentFileFilter = (req, file, cb) => {
  // Просто принимаем любой файл, но можно добавить логику для блокировки опасных типов
  cb(null, true); 
};

// Настройка загрузчика для вложений
export const uploadAttachments = multer({
  storage: attachmentStorage,
  fileFilter: attachmentFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 МБ
    files: 10 // до 10 файлов
  }
}).array('attachments', 10);


export default router; 