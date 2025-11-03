import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { protect } from '../middleware/auth.js';
import { generalLimiter } from '../middleware/rateLimiters.js';
import User from '../models/User.js';
import tgRequired from '../middleware/tgRequired.js';
import { uploadToCloudinary, deleteFromCloudinary, extractPublicId } from '../utils/cloudinaryUpload.js';

const router = express.Router();

// Временное хранилище для Multer (файлы будут загружены в Cloudinary, затем удалены)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/temp';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const userId = req.user.id;
    const ext = path.extname(file.originalname);
    cb(null, `${userId}-${Date.now()}${ext}`);
  }
});

// Фильтр для проверки типов файлов - только изображения
const fileFilter = (req, file, cb) => {
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
    fileSize: 5 * 1024 * 1024
  }
});

  /**
   * @swagger
   * tags:
   *   name: Upload
   *   description: Загрузка файлов
   */

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
    
    // Загружаем файл в Cloudinary
    const cloudinaryResult = await uploadToCloudinary(file.path, 'birgekomek/avatars', 'image');
    
    // Обновляем поле avatar у пользователя
    const user = await User.findById(req.user.id);
    
    // Если у пользователя уже был аватар в Cloudinary, удаляем старый
    if (user.avatar && user.avatar.includes('cloudinary.com')) {
      const oldPublicId = extractPublicId(user.avatar);
      if (oldPublicId) {
        await deleteFromCloudinary(oldPublicId, 'image').catch(err => 
          console.error('Ошибка при удалении старого аватара:', err)
        );
      }
    }
    
    // Сохраняем URL из Cloudinary
    user.avatar = cloudinaryResult.url;
    await user.save();
    
    res.json({ 
      msg: 'Аватар успешно обновлен',
      avatar: cloudinaryResult.url,
      avatarUrl: cloudinaryResult.url
    });
  } catch (err) {
    console.error('Ошибка при загрузке аватара:', err);
    res.status(500).json({ msg: 'Что-то пошло не так при загрузке аватара' });
  }
});


const attachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/temp';
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
  // Просто принимаем любой файл
  cb(null, true); 
};

export const uploadAttachments = multer({
  storage: attachmentStorage,
  fileFilter: attachmentFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 10
  }
}).array('attachments', 10);

// Перехватываем ошибки от multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ msg: 'Файл слишком большой. Максимальный размер 10МБ.' });
        }
        return res.status(400).json({ msg: `Ошибка Multer: ${error.message}` });
    } else if (error) {
        return res.status(400).json({ msg: error.message });
    }
    next();
});

export default router; 